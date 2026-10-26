<?php
// One-time import of the legacy record.log into the events table. Protected
// by admin/.htaccess. Safe to re-run: refuses unless the table is empty or
// ?force=1 is passed. Delete this file once backfill is confirmed done.

$cfg = require __DIR__ . '/../db_config.php';
$pdo = new PDO(
    "mysql:host={$cfg['host']};dbname={$cfg['name']};charset=utf8mb4",
    $cfg['user'],
    $cfg['pass'],
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);

header('Content-Type: text/plain');

$existing = (int) $pdo->query('SELECT COUNT(*) FROM events')->fetchColumn();
$force    = isset($_GET['force']) && $_GET['force'] === '1';

if ($existing > 0 && !$force) {
    echo "events table already has $existing rows. Re-run with ?force=1 to import anyway (will duplicate).\n";
    exit;
}

$logPath = __DIR__ . '/../record.log';
if (!is_file($logPath)) {
    echo "No record.log found at $logPath — nothing to backfill.\n";
    exit;
}

$allowedEvents = ['pageview', 'bin_download', 'pdf_view'];
$batch   = [];
$batchSize = 500;
$inserted = 0;
$skipped  = 0;

$insertBatch = function (array $rows) use ($pdo) {
    if (!$rows) return;
    $placeholders = implode(',', array_fill(0, count($rows), '(?, ?, ?, 0)'));
    $stmt = $pdo->prepare("INSERT INTO events (occurred_at, event_type, update_file) VALUES $placeholders");
    $params = [];
    foreach ($rows as $r) $params = array_merge($params, $r);
    $stmt->execute($params);
};

$fh = fopen($logPath, 'r');
while (($line = fgets($fh)) !== false) {
    $line = rtrim($line, "\n");
    if ($line === '') continue;
    $parts = explode("\t", $line);
    if (count($parts) < 2) { $skipped++; continue; }
    [$ts, $event] = $parts;
    $file = $parts[2] ?? '';
    if (!in_array($event, $allowedEvents, true)) { $skipped++; continue; }
    if ($file !== '' && !preg_match('/^UPD\d{5}$/', $file)) { $file = ''; }

    try {
        $dt = new DateTime($ts);
        $dt->setTimezone(new DateTimeZone('UTC'));
    } catch (Exception $e) {
        $skipped++;
        continue;
    }

    $batch[] = [$dt->format('Y-m-d H:i:s'), $event, $file !== '' ? $file : null];
    $inserted++;

    if (count($batch) >= $batchSize) {
        $insertBatch($batch);
        $batch = [];
    }
}
fclose($fh);
$insertBatch($batch);

echo "Backfill complete: $inserted rows inserted, $skipped lines skipped.\n";
