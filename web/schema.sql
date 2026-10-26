-- Schema for the usage-events database (one per environment). Create it by
-- hand (e.g. via cPanel phpMyAdmin); record.php and admin/ expect this shape.
CREATE TABLE IF NOT EXISTS events (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  occurred_at DATETIME        NOT NULL,                 -- UTC
  event_type  VARCHAR(32)     NOT NULL,                 -- pageview | bin_download | pdf_view
  update_file CHAR(8)         NULL,                     -- UPDxxxxx, when relevant
  is_bot      TINYINT(1)      NOT NULL DEFAULT 0,
  KEY idx_occurred_at (occurred_at),
  KEY idx_type_file (event_type, update_file)
) CHARACTER SET utf8mb4;
