<?php
// Usage event recorder. Writes to this environment's MySQL database (see
// db_config.php, generated per-environment by scripts/deploy — never
// committed). No cookies, no IP address logged — just an event type, an
// optional file identifier, and a coarse bot flag derived from User-Agent.

$event = isset($_POST['event']) ? $_POST['event'] : '';
$file  = isset($_POST['file'])  ? $_POST['file']  : '';

$allowedEvents = ['pageview', 'bin_download', 'pdf_view'];
if (!in_array($event, $allowedEvents, true)) {
    http_response_code(400);
    exit;
}

// Only ever log a known-shaped file identifier (e.g. UPD05081), never raw input.
if ($file !== '' && !preg_match('/^UPD\d{5}$/', $file)) {
    http_response_code(400);
    exit;
}

$ua = $_SERVER['HTTP_USER_AGENT'] ?? '';
$isBot = preg_match('/bot|crawl|spider|slurp|headless|wget|curl|python-requests|python-urllib|scrapy|facebookexternalhit|monitor|pingdom|uptime/i', $ua) ? 1 : 0;

try {
    $cfg = require __DIR__ . '/db_config.php';
    $pdo = new PDO(
        "mysql:host={$cfg['host']};dbname={$cfg['name']};charset=utf8mb4",
        $cfg['user'],
        $cfg['pass'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    $stmt = $pdo->prepare(
        'INSERT INTO events (occurred_at, event_type, update_file, is_bot) VALUES (UTC_TIMESTAMP(), ?, ?, ?)'
    );
    $stmt->execute([$event, $file !== '' ? $file : null, $isBot]);
} catch (Throwable $e) {
    // A lost analytics event should never surface as a broken page.
}

http_response_code(204);
