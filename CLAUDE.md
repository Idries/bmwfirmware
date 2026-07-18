# bmwfirmware

A tool for finding the correct BMW iDrive media/infotainment software update file for a car, based on its current software version. Static single-page web app, no server-side logic — everything runs in the browser.

## Files

| File | Purpose |
|------|---------|
| `web/public_html/index.html` | Single page, version input |
| `web/public_html/style.css` | All styles |
| `web/public_html/lookup.js` | All logic — update DB, version parsing, DOM rendering |
| `web/scripts/deploy` | FTP deploy script (same pattern as dccra.london) |
| `web/scripts/check-stats` | Fetches `record.log` from prod/test and summarizes usage counts |
| `web/scripts/ftp_common.py` | Shared FTP connection/env config used by both scripts above |
| [`SOURCES.md`](SOURCES.md) | Provenance of every data source the DB is built from |
| [`FORMAT.md`](FORMAT.md) | Internal format of the BMW update `.bin` files — read before re-deriving anything from them |

## Local development

```bash
python3 -m http.server 8765 --directory web/public_html
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

Then fill in the credentials in the `ENVIRONMENTS` dict in `web/scripts/ftp_common.py`.

### Deploy

```bash
python3 web/scripts/deploy test
python3 web/scripts/deploy prod
```

### Usage stats

```bash
python3 web/scripts/check-stats prod
python3 web/scripts/check-stats test
```

## Update database

`lookup.js`'s `DB` is derived from three sources — see [`SOURCES.md`](SOURCES.md) for full provenance of each:

1. Official BMW readme PDFs (`Readme_UPDxxxxx_en.pdf` on the same CDN as the `.bin` files).
2. A community-maintained [gist](https://gist.github.com/miurhz/29d47fe097875cf40ca0707dd3ffb238) tracking the same update files, including at least one file (`UPD07032`) not in the original file list this project started from.
3. **The update `.bin` files' own internal data**, where cross-checked — each is actually a tar archive containing an XML manifest that states the exact "from" version(s) a component update requires. The manifest carries a digital-signature block, but that signature has **not** been cryptographically verified (no BMW certificate was available) — treat data derived this way as "self-consistent with the readme," not "cryptographically proven." This is still more precise than approximating from readme prose, and is how the DB's `variants` entries with an `exact: [[major,minor,patch], ...]` list were derived. **See [`FORMAT.md`](FORMAT.md) for the full internal format** (tar structure, the SWIP/SWUP XML schema, exactly where the "from" state lives, the signature-verification caveat, and a reusable extraction recipe) before re-deriving any of this by hand.

The key rule for reading a version string: the two-letter prefix (`MN`, `TV`, `TB`, `TT`, etc.) identifies the head unit family, and the major version number narrows it to a specific file within that family. Some entries use exact manifest-derived version lists (`exact`); others still use approximate numeric ranges (`minMajor`/`maxMajor`/`minMinor`/`maxMinor`) where a manifest hasn't been pulled yet — prefer extracting the real manifest (per FORMAT.md) over guessing at ranges when fixing or extending an entry.

## VIN input was removed

The web tool used to also accept a VIN, showing a model/year tag and (for `WBY`-prefixed i3/i8 VINs) a head-unit-family hint. It was removed: `findUpdate()` never used VIN data for matching at all, the WMI/year tags were cosmetic, and the one "helpful" hint (`MN`/`TN`/`HN`) wasn't actually disambiguating — every NBT Evo car has all three prefixes simultaneously (regardless of model), so it told the user nothing their own "Show current version" screen wouldn't already show. This was further confirmed by manifest data (see FORMAT.md): the `vinallow` field in every inspected manifest is a wildcard (`<vin>*</vin>`) — BMW doesn't gate these updates by VIN or region, so there was never a matching capability VIN could have unlocked. Don't re-add VIN input without a concrete new capability it would enable.
