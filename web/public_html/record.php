<?php
// Minimal, dependency-free usage counter. No cookies, no IP address logged —
// just an event type and (optionally) which update file it relates to.

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

$line = gmdate('c') . "\t" . $event . "\t" . $file . "\n";
file_put_contents(__DIR__ . '/record.log', $line, FILE_APPEND | LOCK_EX);

http_response_code(204);
