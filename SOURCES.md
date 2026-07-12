# Sources

## Where the update file list and URL pattern came from

The 15 known update files (and the CDN URL pattern used in `bmw_update_selector.py`
and `web/public_html/lookup.js`) were originally identified in this Reddit thread:

**[r/BMWi3 — "Media software update"](https://www.reddit.com/r/BMWi3/comments/1lnbld2/media_software_update/)** (2025-06-29)

Summary of the relevant parts:

- The original poster found that BMW's VIN-based update lookup page
  (`static.bmw.com/.../bluetooth/index.html?content=content_en.json`) had started
  returning errors instead of update files.
- As a workaround, they brute-forced the CDN's directory structure and found that
  update files follow a consistent pattern:
  `https://static.bmw.com/content/dam/bmw/staticContent/static_bmw_com/bluetooth/updates/bmw/bin/UPDxxxxx.bin`
  with matching readmes at `.../pdf/Readme_UPDxxxxx_en.pdf`. They listed the 15
  files that exist under that pattern — this is the same set of files this repo's
  DB is built from.
- A commenter suggested a simple way to reproduce the discovery:
  ```
  seq -w 1 99999 | xargs -I{} wget https://static.bmw.com/content/dam/bmw/staticContent/static_bmw_com/bluetooth/updates/bmw/bin/UPD{}.bin
  ```
- Another commenter noted BMW appears to have shut down the VIN-based lookup
  mechanism entirely in mid-2025, and that some people had been using the Wayback
  Machine to reach the old VIN-input page as a workaround — see also
  [r/BmwTech — "Guide for updating BMW's iDrive software using a flash drive"](https://www.reddit.com/r/BmwTech/comments/1gm1qtb/guide_for_updating_bmws_idrive_software_using_a/).
- A commenter confirmed `UPD05081.bin` is the correct update from `MN-003.011.002`,
  which corroborates the version mapping already used in this repo.
