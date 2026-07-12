# BMW Update Finder — Web

Static single-page tool. A user enters their current BMW software version (and optionally their VIN); the page returns the correct update file and a direct download link from BMW's CDN.

No server-side logic — everything runs in the browser.

## Files

| File | Purpose |
|------|---------|
| `public_html/index.html` | Single page, two inputs (version + VIN) |
| `public_html/style.css` | All styles |
| `public_html/lookup.js` | All logic — update DB, VIN/version parsing, DOM rendering |
| `deploy` | FTP deploy script (same pattern as dccra.london) |

## Local development

```bash
python3 -m http.server 8765 --directory public_html
# open http://localhost:8765
```

## Deployment

### First-time setup

From `~/code/eukhost`, create the test subdomain and FTP user:

```bash
source ./eukenv
./cpanel-manage test-create bmwupdate
# → creates bmwupdate-test.hamadi.net + prints FTP credentials
```

For production, create an FTP user on whatever domain you point at this site:

```bash
./cpanel-manage ftp-create bmwupdate <DOMAIN>
```

Then fill in the credentials in the `ENVIRONMENTS` dict in `deploy`.

### Deploy

```bash
python3 deploy test
python3 deploy prod
```

## Update database

All mappings in `lookup.js` are derived from the official BMW readme PDFs in `../downloads/pdf/`. The key rule: the two-letter version prefix (`MN`, `TV`, `TB`, `TT`, etc.) identifies the head unit family, and the major version number narrows it to a specific file within that family.
