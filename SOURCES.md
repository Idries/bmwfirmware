# Sources

## Where the update file list and URL pattern came from

The update files (and the CDN URL pattern used in `web/public_html/lookup.js`)
were originally identified in this Reddit thread:

**[r/BMWi3 — "Media software update"](https://www.reddit.com/r/BMWi3/comments/1lnbld2/media_software_update/)** (2025-06-29)

Summary of the relevant parts:

- The original poster found that BMW's VIN-based update lookup page
  (`static.bmw.com/.../bluetooth/index.html?content=content_en.json`) had started
  returning errors instead of update files.
- As a workaround, they brute-forced the CDN's directory structure and found that
  update files follow a consistent pattern:
  `https://static.bmw.com/content/dam/bmw/staticContent/static_bmw_com/bluetooth/updates/bmw/bin/UPDxxxxx.bin`
  with matching readmes at `.../pdf/Readme_UPDxxxxx_en.pdf`. They listed 15 files
  that exist under that pattern — most of this repo's DB was originally built
  from that set.
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

## Where the gist-derived data and additional file came from

A customer email reported a version (`MX-003.004.031`/`TX-003.004.031`) that
`lookup.js` failed to match. Investigating led to a second, actively-maintained
source:

**[GitHub gist — "USB firmware update files for BMW CIC (Multimedia) and Combox (Bluetooth/Telephone)"](https://gist.github.com/miurhz/29d47fe097875cf40ca0707dd3ffb238)** by miurhz

This gist independently tracks the same update files, with its own
readme-derived "applicable version" table plus an active comment thread (25
comments as of this writing) where owners report real starting versions and
outcomes. It surfaced:

- The customer's exact case: the gist author's own "My Case" section documents
  `MX-003.004.031` → `MX-003.005.004` via `UPD01008` (the same file already in
  this repo's DB) — confirming `UPD01008` was the right file all along; the bug
  was that `lookup.js` only accepted that version's *short*-style notation
  (`MX-3.x`), not the long/zero-padded form the car itself displays.
- `UPD07032` — a file not in the original Reddit-thread list, found by the gist
  author "playing with the version number" against the CDN's URL pattern. Still
  live on BMW's CDN; added to `lookup.js`'s DB after its manifest content was
  found to be self-consistent with its readme (see below and
  [FORMAT.md](FORMAT.md) for what "self-consistent" means here — this is not a
  cryptographic verification).
- Real-world discussion of files that BMW has since pulled from the CDN
  entirely (e.g. `UPD01006`, superseded here by confirming `UPD01008` covers the
  same starting version directly) and an unofficial third-party mirror for one
  of them — noted here for completeness, not used as a source for this repo's
  DB, since it isn't served from BMW's own CDN and its provenance can't be
  cross-checked the way the files in this repo's DB can (see
  [FORMAT.md](FORMAT.md)).
- Two corroborated operational tips now included in `lookup.js`'s install guide:
  the date-rollback trick needs the car locked and left for 10–15 minutes to
  actually resync, and Bluetooth device names containing emoji can break
  post-update media metadata.

## Validating "from" states against the binaries themselves

Readme PDFs and the gist's table both describe *target* versions well, but are
less precise about exactly which starting ("from") versions a file accepts —
this repo's DB used to approximate that with simple numeric ranges, which had
real gaps and at least one misrouting bug. Downloading the actual `.bin` files
and inspecting their contents turned out to give exact data instead of relying
on approximation.

**Every `.bin` is actually a tar archive** containing an XML manifest — which
carries a digital-signature block, though that signature has **not** been
cryptographically verified against a BMW certificate (see the caveat in
[FORMAT.md](FORMAT.md); treating the content as trustworthy currently rests on
it being self-consistent and served from BMW's own CDN, not on the signature
itself) — that states the exact "from" version (or range) required for each
bundled component, independent of any readme text. This was used to correct
`lookup.js`'s DB entries for `UPD01008`, `UPD05081`/`UPD09051` (both now proven
to supersede older, now-removed entries), and the `07xxx` head-unit family (fixed
a real `HV` misrouting bug), and to cross-check `UPD07032`'s content despite it
carrying three different labels across its URL, readme, and internal manifest.

**See [FORMAT.md](FORMAT.md) for the full internal format** (tar structure, the
SWIP/SWUP XML schema, exactly where the "from" state lives, and a reusable
extraction recipe) so this doesn't need to be rediscovered.

## Prior analysis of the signing format

**[Terence Eden's Blog — "BMW are sending their software updates unencrypted"](https://shkspr.mobi/blog/2016/02/bmw-are-sending-their-software-updates-unencrypted/)** (2016-02)

An earlier, independent public analysis of this same `SWIP`/`SWUP` XML-DSig
format — the exact file naming pattern documented in
[FORMAT.md](FORMAT.md) appears in this post too. It corroborates what this
project found directly: `digalg="sha256"`, `signalg="sha256withRSA"`, an
enveloped signature that cascades protection down to the bundled `SWUP`
payloads via hash references. Consulted specifically to check whether anyone
had previously located or published BMW's public verification certificate —
**they hadn't**: the post and its comment thread confirm the files are signed,
but explicitly do not find, extract, or publish any certificate/public key, and
the author states firmware decompilation was outside their scope. This lines
up with this project's own finding that no key material is embedded in the
manifest (no `<KeyInfo>`) or bundled anywhere in the archive — see the
signature-verification caveat in [FORMAT.md](FORMAT.md).
