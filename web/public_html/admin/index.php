<?php
// Usage dashboard. Protected by admin/.htaccess (written per-environment by
// scripts/deploy, never committed). Reads only this environment's own DB.

$cfg = require __DIR__ . '/../db_config.php';
$pdo = new PDO(
    "mysql:host={$cfg['host']};dbname={$cfg['name']};charset=utf8mb4",
    $cfg['user'],
    $cfg['pass'],
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
);

$allowedDays = [7, 30, 90, 365, 0]; // 0 = all time
$days        = isset($_GET['days']) ? (int) $_GET['days'] : 30;
if (!in_array($days, $allowedDays, true)) $days = 30;
$showBots = isset($_GET['bots']) && $_GET['bots'] === '1';

$since = $days > 0 ? gmdate('Y-m-d H:i:s', time() - $days * 86400) : '1970-01-01 00:00:00';

$rows = $pdo->prepare(
    'SELECT DATE(occurred_at) AS d, event_type, is_bot, COUNT(*) AS c
     FROM events WHERE occurred_at >= ? GROUP BY d, event_type, is_bot ORDER BY d'
);
$rows->execute([$since]);

$eventTypes = ['pageview', 'bin_download', 'pdf_view'];
$byDay      = []; // date => event_type => count
$totals     = array_fill_keys($eventTypes, 0);
$botTotal   = 0;

foreach ($rows as $row) {
    if ($row['is_bot'] && !$showBots) {
        $botTotal += (int) $row['c'];
        continue;
    }
    $d = $row['d'];
    $byDay[$d][$row['event_type']] = ($byDay[$d][$row['event_type']] ?? 0) + (int) $row['c'];
    $totals[$row['event_type']] += (int) $row['c'];
}
ksort($byDay);
$dates = array_keys($byDay);

$fileRows = $pdo->prepare(
    "SELECT update_file, COUNT(*) AS c FROM events
     WHERE event_type = 'bin_download' AND occurred_at >= ? " . ($showBots ? '' : 'AND is_bot = 0 ') . "
     GROUP BY update_file ORDER BY c DESC LIMIT 15"
);
$fileRows->execute([$since]);
$fileCounts = $fileRows->fetchAll();

// ── Palette (dataviz skill, dark-mode slots 1-3, validated as a set) ───────
$colors = [
    'pageview'     => '#3987e5', // slot 1 blue
    'bin_download' => '#d95926', // slot 2 orange
    'pdf_view'     => '#199e70', // slot 3 aqua
];
$labels = [
    'pageview'     => 'Pageviews',
    'bin_download' => 'Downloads',
    'pdf_view'     => 'PDF views',
];

function esc($s) { return htmlspecialchars((string) $s, ENT_QUOTES); }

// ── SVG line chart: one path per series, shared day axis ───────────────────
function renderLineChart(array $dates, array $byDay, array $eventTypes, array $colors, array $labels): string
{
    $w = 920; $h = 320; $padL = 44; $padR = 16; $padT = 16; $padB = 32;
    $plotW = $w - $padL - $padR; $plotH = $h - $padT - $padB;
    $n = count($dates);

    if ($n === 0) {
        return '<p class="empty">No data in this range.</p>';
    }

    $max = 1;
    foreach ($dates as $d) {
        foreach ($eventTypes as $et) {
            $max = max($max, $byDay[$d][$et] ?? 0);
        }
    }
    // round max up to a tidy step
    $step = pow(10, floor(log10(max($max, 1))));
    $niceMax = ceil($max / $step) * $step;
    if ($niceMax <= 0) $niceMax = 1;

    $x = fn($i) => $n > 1 ? $padL + ($i / ($n - 1)) * $plotW : $padL + $plotW / 2;
    $y = fn($v) => $padT + $plotH - ($v / $niceMax) * $plotH;

    $svg = "<svg viewBox=\"0 0 $w $h\" class=\"chart\" role=\"img\" aria-label=\"Daily event counts\">";

    // gridlines + y labels
    for ($g = 0; $g <= 4; $g++) {
        $gv = $niceMax * $g / 4;
        $gy = $y($gv);
        $svg .= "<line x1=\"$padL\" y1=\"$gy\" x2=\"" . ($padL + $plotW) . "\" y2=\"$gy\" class=\"gridline\" />";
        $svg .= "<text x=\"" . ($padL - 8) . "\" y=\"" . ($gy + 4) . "\" class=\"axis-label\" text-anchor=\"end\">" . esc((int) round($gv)) . "</text>";
    }

    // x labels: first, middle, last date only (avoid crowding)
    foreach ([0, intdiv($n - 1, 2), $n - 1] as $i) {
        if ($i < 0 || $i >= $n) continue;
        $svg .= "<text x=\"" . $x($i) . "\" y=\"" . ($h - 8) . "\" class=\"axis-label\" text-anchor=\"middle\">" . esc($dates[$i]) . "</text>";
    }

    foreach ($eventTypes as $et) {
        $pts = [];
        foreach ($dates as $i => $d) {
            $pts[] = $x($i) . ',' . $y($byDay[$d][$et] ?? 0);
        }
        $svg .= '<polyline points="' . implode(' ', $pts) . '" class="series-line" style="stroke:' . $colors[$et] . '" />';
        foreach ($dates as $i => $d) {
            $v = $byDay[$d][$et] ?? 0;
            $svg .= "<circle cx=\"" . $x($i) . "\" cy=\"" . $y($v) . "\" r=\"3\" style=\"fill:{$colors[$et]}\"><title>" . esc($labels[$et]) . " — " . esc($d) . ": " . esc($v) . "</title></circle>";
        }
    }

    $svg .= '</svg>';
    return $svg;
}

// ── SVG bar chart: single series, horizontal bars ──────────────────────────
function renderBarChart(array $fileCounts, string $color): string
{
    if (!$fileCounts) {
        return '<p class="empty">No downloads in this range.</p>';
    }
    $w = 920; $rowH = 28; $padL = 100; $padR = 60; $padTop = 8;
    $n = count($fileCounts);
    $h = $padTop * 2 + $n * $rowH;
    $max = max(array_column($fileCounts, 'c'));
    $plotW = $w - $padL - $padR;

    $svg = "<svg viewBox=\"0 0 $w $h\" class=\"chart\" role=\"img\" aria-label=\"Downloads by file\">";
    foreach ($fileCounts as $i => $row) {
        $barW = $max > 0 ? ($row['c'] / $max) * $plotW : 0;
        $cy   = $padTop + $i * $rowH;
        $svg .= "<text x=\"" . ($padL - 10) . "\" y=\"" . ($cy + $rowH / 2 + 4) . "\" class=\"axis-label\" text-anchor=\"end\">" . esc($row['update_file'] ?? '(none)') . "</text>";
        $svg .= "<rect x=\"$padL\" y=\"" . ($cy + 4) . "\" width=\"$barW\" height=\"" . ($rowH - 8) . "\" rx=\"4\" style=\"fill:$color\"><title>" . esc($row['update_file'] ?? '(none)') . ": " . esc($row['c']) . "</title></rect>";
        $svg .= "<text x=\"" . ($padL + $barW + 8) . "\" y=\"" . ($cy + $rowH / 2 + 4) . "\" class=\"axis-label\">" . esc($row['c']) . "</text>";
    }
    $svg .= '</svg>';
    return $svg;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>Usage — BMW iDrive Update Finder</title>
<style>
  :root {
    --bg: #0d0d14; --surface: #16161f; --border: #2a2a3a;
    --text: #e0e0ec; --text-dim: #8888a0; --muted: #898781; --gridline: #2c2c2a;
    --font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  * { box-sizing: border-box; }
  html, body { background: var(--bg); color: var(--text); font-family: var(--font); margin: 0; padding: 0; }
  main { max-width: 980px; margin: 0 auto; padding: 2rem 1.5rem 4rem; }
  h1 { font-size: 1.4rem; font-weight: 600; margin-bottom: 0.3rem; }
  .subtitle { color: var(--text-dim); font-size: 0.9rem; margin-bottom: 1.5rem; }
  nav.controls { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1.5rem; align-items: center; }
  nav.controls a {
    color: var(--text-dim); text-decoration: none; padding: 0.35rem 0.7rem;
    border: 1px solid var(--border); border-radius: 6px; font-size: 0.85rem;
  }
  nav.controls a.active { color: var(--text); border-color: var(--text-dim); }
  .stat-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
  .stat-tile { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 1rem 1.2rem; }
  .stat-tile .label { color: var(--text-dim); font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.03em; }
  .stat-tile .value { font-size: 1.6rem; font-weight: 600; margin-top: 0.2rem; }
  section { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 1.2rem 1.4rem; margin-bottom: 1.5rem; }
  section h2 { font-size: 1rem; font-weight: 600; margin-bottom: 0.8rem; }
  .legend { display: flex; gap: 1.2rem; margin-bottom: 0.8rem; font-size: 0.82rem; color: var(--text-dim); }
  .legend span { display: inline-flex; align-items: center; gap: 0.4rem; }
  .legend .swatch { width: 10px; height: 10px; border-radius: 2px; display: inline-block; }
  .chart { width: 100%; height: auto; display: block; }
  .gridline { stroke: var(--gridline); stroke-width: 1; }
  .axis-label { fill: var(--muted); font-size: 11px; }
  .series-line { fill: none; stroke-width: 2; }
  .empty { color: var(--text-dim); font-size: 0.9rem; }
  .bot-note { color: var(--text-dim); font-size: 0.8rem; margin-top: 0.5rem; }
</style>
</head>
<body>
<main>
  <h1>Usage</h1>
  <p class="subtitle"><?= esc($cfg['name']) ?> · bot-tagged events <?= $showBots ? 'included' : 'excluded (' . number_format($botTotal) . ' hidden)' ?></p>

  <nav class="controls">
    <?php foreach (['7' => '7d', '30' => '30d', '90' => '90d', '365' => '1y', '0' => 'All'] as $d => $label): ?>
      <a href="?days=<?= $d ?><?= $showBots ? '&bots=1' : '' ?>" class="<?= $days === (int) $d ? 'active' : '' ?>"><?= esc($label) ?></a>
    <?php endforeach; ?>
    <a href="?days=<?= $days ?><?= $showBots ? '' : '&bots=1' ?>" class="<?= $showBots ? 'active' : '' ?>"><?= $showBots ? 'Hide bots' : 'Show bots' ?></a>
  </nav>

  <div class="stat-row">
    <?php foreach ($eventTypes as $et): ?>
      <div class="stat-tile">
        <div class="label"><?= esc($labels[$et]) ?></div>
        <div class="value" style="color:<?= $colors[$et] ?>"><?= number_format($totals[$et]) ?></div>
      </div>
    <?php endforeach; ?>
  </div>

  <section>
    <h2>Daily activity</h2>
    <div class="legend">
      <?php foreach ($eventTypes as $et): ?>
        <span><span class="swatch" style="background:<?= $colors[$et] ?>"></span><?= esc($labels[$et]) ?></span>
      <?php endforeach; ?>
    </div>
    <?= renderLineChart($dates, $byDay, $eventTypes, $colors, $labels) ?>
  </section>

  <section>
    <h2>Downloads by file</h2>
    <?= renderBarChart($fileCounts, $colors['bin_download']) ?>
  </section>

  <p class="bot-note">Bot classification is based on User-Agent and applied at write time; events backfilled from the old log file predate this check and are never flagged as bots.</p>
</main>
</body>
</html>
