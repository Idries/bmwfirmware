# bmwfirmware

A tool for finding the correct BMW iDrive media/infotainment software update file
for your car, based on the current software version shown in the car. Covers CCC,
CIC, NBT Evo, and later head units.

BMW's own VIN-based update lookup has become unreliable, so this project keeps a
manually-derived mapping from the official BMW readme PDFs, a community-maintained
[gist](https://gist.github.com/miurhz/29d47fe097875cf40ca0707dd3ffb238) tracking
the same files, and — for exact precision — the update files' own internal
metadata (see below). It links straight to BMW's CDN for the actual download; it
doesn't host or redistribute the files itself. See [SOURCES.md](SOURCES.md) for
the full provenance of every source used.

## Usage

A static single-page tool lives in [`web/`](CLAUDE.md) — enter your version in
the browser and get a direct download link.

To find your current version in the car: **Settings → Software update → Show
current version**.

## How it works

Each known update file is mapped to the version(s) it applies to, derived from
BMW's official readme PDFs, the gist above, and — where cross-checked — the
manifest inside the update `.bin` itself (every `.bin` is actually a tar archive
containing an XML manifest with exact "from" version data; its signature has
not been cryptographically verified, see [FORMAT.md](FORMAT.md) for the full
internal format and that caveat). See
[`web/public_html/lookup.js`](web/public_html/lookup.js) for the full database.

## Contributing

If you find a new update file, a version mapping that's wrong, or a car whose
version doesn't match any known head unit family, please open an issue or PR.

## License

MIT — see [LICENSE](LICENSE).
