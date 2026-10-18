CREATE TABLE IF NOT EXISTS mailing_list_subscribers (
  email TEXT PRIMARY KEY COLLATE NOCASE NOT NULL CHECK (length(email) <= 254),
  subscribed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
