# Update file format (.bin)

Despite the `.bin` extension, every file at
`https://static.bmw.com/.../bluetooth/updates/bmw/bin/UPDxxxxx.bin` is a **POSIX
tar archive (GNU format)**, not a raw firmware blob. This was discovered while
investigating a customer support case where the readme-derived version ranges in
`web/public_html/lookup.js` didn't match a real car — extracting and reading the
archive's contents turned out to give exact, authoritative data instead of having
to approximate from readme prose. This file documents the format so future work
doesn't have to rediscover it.

## Archive contents

```
$ tar -tvf UPD07032.bin
-rw-rw-rw-  0 0  0   21598 29 Sep 2017 SWIP_00001E40_130_017_025.xml
-rw-rw-rw-  0 0  0 1341440 29 Sep 2017 SWUP_00001E44_010_013_011.bin
-rw-rw-rw-  0 0  0 1024000 29 Sep 2017 SWUP_00001E44_110_005_011.bin
...
```

- Exactly one `SWIP_<id>_<ver>.xml` manifest — small (tens of KB), safe to extract
  on its own without unpacking the rest.
- Several `SWUP_<id>_<ver>.bin` files — the actual firmware/software payloads
  (multi-MB each). Not needed for version-matching purposes; the manifest already
  states everything relevant in structured form.

## The SWIP manifest

XML, namespace `http://bmw.com/2008/spc.data.swip`, schema `SWIP_0_3_6.xsd`.

**It carries a digital signature block** — `digalg="sha256"`,
`signalg="sha256withRSA"`, a full XML-DSig `<Signature>` element
(`CanonicalizationMethod`, `SignatureMethod Algorithm="...rsa-sha256"`,
`DigestValue`, `SignatureValue`).

**Important — this has not been cryptographically verified.** No public
key/certificate for BMW's signing infrastructure was located, and no
verification tool (`xmlsec1`, OpenSSL against a known cert, etc.) was run
against it — only the *presence and well-formedness* of a real XML-DSig
structure was checked. When a file's identity was ambiguous (see `UPD07032`
below), the basis for treating its content as trustworthy was three weaker,
circumstantial signals: (1) a structurally correct signature block being
present, (2) the manifest's declared target versions being internally
consistent with what the readme independently describes, and (3) the file
being served from BMW's own production CDN over HTTPS. That's evidence of
likely-genuine provenance, not a verified cryptographic guarantee — don't
describe this project's data as "signature-verified" without actually running
a verification step against a trusted BMW certificate first.

Key structure:

```
<SWIP>
  <sweHeader>
    <swipIdent>
      <processClass>SWIP</processClass>
      <id>00001E40</id>
      <mainVersion>130</mainVersion><subVersion>017</subVersion><patchVersion>025</patchVersion>
    </swipIdent>
    <Signature>...RSA-SHA256...</Signature>
  </sweHeader>
  <spcData>
    <description>...</description>
    <creationdate>...</creationdate>
    <vinallow><vin>*</vin></vinallow>   <!-- see note below -->
    <spindex>
      <SWUP subsystemID="MV" HashValue="...">
        <id>00001E44</id>
        <mainVersion>010</mainVersion><subVersion>013</subVersion><patchVersion>011</patchVersion>
        <compatibilitytable>
          <depends>
            <dependedSWE>
              <processClass>SWFL</processClass>
              <id>00002466</id>
              <minVersion><mainVersion>010</mainVersion><subVersion>012</subVersion><patchVersion>001</patchVersion></minVersion>
              <maxVersion><mainVersion>010</mainVersion><subVersion>012</subVersion><patchVersion>001</patchVersion></maxVersion>
            </dependedSWE>
          </depends>
        </compatibilitytable>
      </SWUP>
      ...
    </spindex>
  </spcData>
</SWIP>
```

- `swipIdent` is the package's **own internal identity** — a hex `id` plus a
  `mainVersion.subVersion.patchVersion` triple. This is a *third* numbering
  scheme, independent of both the public URL slug (`UPDxxxxx`) and whatever the
  readme PDF prints as its own header. All three have been observed to disagree
  for the same file (see "Multiple labels for one file" below).
- **`vinallow`** was a wildcard (`<vin>*</vin>`) in every manifest inspected — BMW
  does not gate these updates by VIN or region at all. This directly confirmed
  that VIN-based matching could never have added filtering value beyond what the
  version string alone provides (see the "VIN input was removed" note in
  [CLAUDE.md](CLAUDE.md)).
- Each `<SWUP>` is one bundled component update. `subsystemID` (when present) is
  the two-letter prefix from BMW's readmes and the iDrive UI (`MV`, `TV`, `HV`,
  `MN`, `TN`, `HN`, `TB`, `MB`, `HB`, `MX`, `TX`, etc). `SWUP`s with no
  `subsystemID` are internal-only components not shown to the user — ignore them
  for version-matching purposes.
- The `SWUP`'s own `mainVersion`/`subVersion`/`patchVersion` is the **target**
  version that component will show after installing.

## Where the "from" state actually lives

Each `SWUP`'s `<compatibilitytable><depends>` (optionally wrapped in `<Or>` for
multiple alternatives) lists `<dependedSWE>` entries, each with a
`<minVersion>`/`<maxVersion>` pair. **This is the authoritative "from" state** —
the version(s) of a dependency that must currently be installed for this SWUP to
apply. When `minVersion == maxVersion` it's a single exact required version; when
they differ, it's an inclusive range.

Confirmed by cross-checking against the readme PDFs and real owner reports (see
[SOURCES.md](SOURCES.md)): for `TB`/`MB`/`HB`, `MN`/`TN`/`HN`, and `MX`/`TX`, the
dependency check tracks the subsystem's own displayed version directly — the
`minVersion`/`maxVersion` you find is exactly the "current version" a user would
need to type into the tool.

**Caveat — not always true for `HV`.** In the earliest inspected file
(`UPD07032`, 2017), the `HV` `SWUP`'s dependency was keyed to a shared platform
component using the same magnitude as `MV`/`TV`'s numbering (110.x), not to any
`HV`-native number — at that point `HV` doesn't have an independently meaningful
"current version" a user could type in; it just rides along with whichever
`MV`/`TV` state triggers the update. `HV` only becomes independently matchable
starting at `UPD07044`, where its dependency list is confirmed identical to
`TV`'s. This is why `web/public_html/lookup.js`'s DB doesn't give `HV` its own
matching entry for `UPD07032`/`UPD07041`, but does from `UPD07044` onward.

## Multiple labels for one file

`UPD07032` (the URL that works) has a readme PDF whose own printed page
header/footer says **"UPD09031"**, while its manifest's internal identity is SWIP
package `00001E40`, version `130.017.025`. Three different labels for the same
content — the basis for treating it as the same genuine file (not signature
verification; see the caveat above) is that the manifest's own declared target
versions exactly match what the readme independently describes, independent of
which external name is used. Treat the URL slug as "whatever key works to fetch
it," not as a reliable identity — cross-check against the manifest's declared
content when a file's provenance matters.

## Extraction recipe

```bash
# 1. Download
curl -s -o UPDxxxxx.bin "https://static.bmw.com/content/dam/bmw/staticContent/static_bmw_com/bluetooth/updates/bmw/bin/UPDxxxxx.bin"

# 2. Confirm it's a tar archive
file UPDxxxxx.bin   # → "POSIX tar archive (GNU)"

# 3. List contents to find the manifest's exact filename
tar -tvf UPDxxxxx.bin | grep '\.xml$'

# 4. Extract just the manifest (no need to unpack the multi-MB SWUP payloads)
tar -xf UPDxxxxx.bin SWIP_<id>_<ver>.xml
```

Parse the manifest with Python's `xml.etree.ElementTree`, namespace
`http://bmw.com/2008/spc.data.swip`:

```python
import xml.etree.ElementTree as ET
ns = {'s': 'http://bmw.com/2008/spc.data.swip'}

def v(elem, tag):
    e = elem.find(f's:{tag}', ns)
    if e is None: return None
    m, su, p = e.find('s:mainVersion', ns), e.find('s:subVersion', ns), e.find('s:patchVersion', ns)
    return None if None in (m, su, p) else f"{m.text}.{su.text}.{p.text}"

root = ET.parse('SWIP_<id>_<ver>.xml').getroot()
for swup in root.iter('{http://bmw.com/2008/spc.data.swip}SWUP'):
    subsys = swup.get('subsystemID')
    if not subsys:
        continue
    target = f"{swup.find('s:mainVersion', ns).text}.{swup.find('s:subVersion', ns).text}.{swup.find('s:patchVersion', ns).text}"
    deps = []
    for dep in swup.iter('{http://bmw.com/2008/spc.data.swip}dependedSWE'):
        minv, maxv = v(dep, 'minVersion'), v(dep, 'maxVersion')
        deps.append(f"{minv}..{maxv}" if minv != maxv else str(minv))
    print(f"{subsys}: target={target}  from={deps}")
```

## What this technique has already found, in this project

- Confirmed the exact customer-reported version (`MX-003.004.031` /
  `TX-003.004.031`) is the literal documented "from" state for `UPD01008` — not
  an approximation, resolving the original support case.
- Confirmed `UPD05074` and `UPD09032`/`UPD09041`/`UPD09042` are strictly
  superseded by `UPD05081`/`UPD09051` — every "from" state the older files
  accept, the newer ones also accept (usually landing on an equal-or-further
  target). All four were removed from `lookup.js`'s `DB` as dominated/dead
  entries rather than kept as duplicate near-identical matches.
- Found and fixed a real misrouting bug: `HV-130.017.032` was matching
  `UPD07052` under the old approximate-range model. Ground truth shows it's
  actually `UPD07041`'s own *result*, not a "from" state for anything, and
  `UPD07052`'s real requirement is the single exact version `130.026.001`.
- Found `UPD07032` (via the community gist — see [SOURCES.md](SOURCES.md)) to be
  self-consistent, plausibly-genuine BMW content despite its triple-labeling
  problem described above — based on content cross-checking, not cryptographic
  signature verification (see the caveat above).

## Related

- [SOURCES.md](SOURCES.md) — where the file list itself, and the gist with
  additional discovered files, came from.
- [`web/public_html/lookup.js`](web/public_html/lookup.js) — the DB this
  research feeds into (`variants` entries with `exact: [[major,minor,patch], ...]`
  come directly from manifest data; range-based `minMajor`/`maxMajor` entries are
  used where a manifest hasn't been pulled yet).
