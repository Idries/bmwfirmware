# bmwfirmware

A tool for finding the correct BMW iDrive media/infotainment software update file
for your car, based on the current software version shown in the car and/or your
VIN. Covers CCC, CIC, NBT Evo, and later head units (15 known update files in
total).

BMW's own VIN-based update lookup has become unreliable (see
[SOURCES.md](SOURCES.md)), so this project keeps a manually-derived mapping from
the official BMW readme PDFs and links straight to BMW's CDN for the actual
download — it doesn't host or redistribute the update files itself.

## Usage

### Command line

```bash
python3 bmw_update_selector.py --version MN-003.011.002
python3 bmw_update_selector.py --vin WBYZ82060JVG87520
python3 bmw_update_selector.py --list
```

To find your current version in the car: **Settings → Software update → Show
current version**.

### Web

A static single-page version of the same tool lives in [`web/`](web/CLAUDE.md) —
enter your version/VIN in the browser and get a direct download link.

## How it works

Each known update file is mapped to the version range(s) it applies to (derived
from BMW's official readme PDFs), plus a WMI/VIN-based hint for head unit family
and model year. See `bmw_update_selector.py` for the full database.

## Contributing

If you find a new update file, a version mapping that's wrong, or a car whose
version doesn't match any known head unit family, please open an issue or PR.

## License

MIT — see [LICENSE](LICENSE).
