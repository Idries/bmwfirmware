'use strict';

const CDN_BIN = 'https://static.bmw.com/content/dam/bmw/staticContent/static_bmw_com/bluetooth/updates/bmw/bin/';
const CDN_PDF = 'https://static.bmw.com/content/dam/bmw/staticContent/static_bmw_com/bluetooth/updates/bmw/pdf/';

// Derived from official BMW readme PDFs, and — where noted — from the signed
// SWIP manifest inside the .bin itself (exact per-component "from" versions,
// extracted directly rather than approximated). 'style' on a variant means
// "match any version typed in that style, ignore the numbers" (used for the
// old short-format catch-alls where no numeric detail is available); variants
// without 'style' compare numerically and accept long-style input only.
const DB = [
  { file:'UPD01008',
    description:'Very old CCC-era iDrive. Bluetooth and media improvements.',
    fromNotes:'MX-1.x, MX-3.x, TX-2.x, TX-3.x (and long-style equivalents, e.g. MX/TX-003.004.031 — confirmed via manifest)',
    result:'MX-3.5.4 / TX-3.5.8 (or TX-2.6.6 / MX-1.12.0, variant-dependent)', date:'2014',
    variants:[
      { prefix:'MX', style:'short' },
      { prefix:'TX', style:'short' },
      { prefix:'MX', exact:[[3,4,31],[1,10,21],[1,11,1]] },
      { prefix:'TX', exact:[[3,4,31],[2,5,21],[2,5,25]] },
    ] },

  { file:'UPD03007',
    description:'CIC-era iDrive. Bluetooth and media improvements.',
    fromNotes:'ME-8.x, TE-8.x',
    result:'ME-8.5.5 / TE-8.5.5', date:'2013',
    variants:[
      { prefix:'ME', style:'short' },
      { prefix:'TE', style:'short' },
    ] },

  { file:'UPD05021',
    description:'NBT Evo early versions. Bluetooth, podcast and multimedia fixes.',
    fromNotes:'MN-1.21, MN-1.23, MN-1.37, MN-2.18, MN-2.34',
    result:'MN-2.34.1 / TN-2.34.1', date:'2014',
    variants:[
      { prefix:'MN', style:'short' },
      { prefix:'TN', style:'short' },
    ] },

  // Supersedes the older UPD05074 — its manifest's "from" list is a strict
  // subset of this one's, so anything UPD05074 could update from, this file
  // can too (usually reaching an equal-or-newer target). UPD05074 dropped.
  { file:'UPD05081',
    description:'NBT Evo (all generations). BlackBerry/iOS/Bluetooth and ConnectedDrive Services fixes — supersedes UPD05074.',
    fromNotes:'MN/TN/HN 001.020.x through 003.255.x (multiple historical entry points)',
    result:'MN-003.013.001 / TN-003.255.080 / HN-003.255.080 (or an earlier intermediate target, variant-dependent)', date:'2016–2018',
    variants:[
      { prefix:'MN', exact:[[1,20,22],[1,22,2],[1,36,2],[2,17,7],[2,26,3],[2,33,2],[2,38,15]] },
      { prefix:'MN', minMajor:2, maxMajor:2, minMinor:45, maxMinor:255 },
      { prefix:'TN', exact:[[1,20,22],[1,22,2],[1,36,2],[2,17,7],[2,26,3],[2,33,2],[2,38,15]] },
      { prefix:'TN', minMajor:2, maxMajor:2, minMinor:45, maxMinor:255 },
      { prefix:'TN', minMajor:3, maxMajor:3, minMinor:1, maxMinor:255 },
      { prefix:'HN', exact:[[1,20,22],[1,22,2],[1,34,6],[2,17,7],[2,26,3],[2,34,4],[2,38,15]] },
      { prefix:'HN', minMajor:2, maxMajor:2, minMinor:43, maxMinor:255 },
      { prefix:'HN', minMajor:3, maxMajor:3, minMinor:1, maxMinor:255 },
    ] },

  // Not in BMW's own naming: reachable only via the "UPD07032" URL. Its
  // readme's own printed header says "UPD09031", and its signed manifest's
  // internal ID is SWIP 130.017.025 — three different labels, verified (via
  // the manifest's RSA-signed dependency data) to be the same authentic file.
  { file:'UPD07032',
    description:'Alternative head unit, early generation (010.x–130.009.x). USB/Bluetooth stability, accessory-mode and podcast fixes. Also seen labeled "UPD09031" (readme header) or SWIP 130.017.025 (manifest ID) — same file.',
    fromNotes:'MV/TV 010.012.001, 100.011.001, 110.002.002/004.001, 130.006.007–130.016.001 (variant-dependent)',
    result:'MV-130.009.020 / TV-130.017.020 / HV-130.017.021', date:'2017',
    variants:[
      { prefix:'MV', exact:[[10,12,1],[100,11,1],[110,2,2],[110,4,1],[130,7,2],[130,6,7],[130,8,3]] },
      { prefix:'TV', exact:[[10,12,1],[110,4,1],[110,2,2],[100,11,1],[130,7,2],[130,6,7],[130,8,3],[130,9,4],[130,15,1],[130,16,1]] },
    ] },

  { file:'UPD07041',
    description:'Alternative head unit (110.x series). iOS 11 call list transfer fix.',
    fromNotes:'MV/TV-110.002.002',
    result:'MV-110.005.011 / TV-110.005.030 / HV-130.017.032', date:'2017',
    variants:[
      { prefix:'MV', exact:[[110,2,2]] },
      { prefix:'TV', exact:[[110,2,2]] },
    ] },

  { file:'UPD07044',
    description:'Alternative head unit (130.x series). ConnectedDrive improvements.',
    fromNotes:'MV/TV/HV 130.006.007 through 130.024.001 (variant-dependent)',
    result:'MV-130.009.020 / TV-130.025.041 / HV-130.025.041', date:'2017',
    variants:[
      { prefix:'MV', exact:[[130,6,7],[130,7,2],[130,8,3]] },
      { prefix:'TV', exact:[[130,6,7],[130,7,2],[130,8,3],[130,9,4],[130,15,1],[130,16,1],[130,18,3],[130,20,2],[130,22,1],[130,24,1]] },
      { prefix:'HV', exact:[[130,6,7],[130,7,2],[130,8,3],[130,9,4],[130,15,1],[130,16,1],[130,18,3],[130,20,2],[130,22,1],[130,24,1]] },
    ] },

  { file:'UPD07052',
    description:'Alternative head unit (later 130.x). Bluetooth and Apple Watch/iPhone fixes.',
    fromNotes:'TV/HV-130.026.001',
    result:'TV-130.027.051 / HV-130.027.051', date:'2018',
    variants:[
      { prefix:'TV', exact:[[130,26,1]] },
      { prefix:'HV', exact:[[130,26,1]] },
    ] },

  // Supersedes UPD09032/UPD09041/UPD09042 — same superseding relationship as
  // UPD05081 above the older UPD05074 (confirmed via manifest: each older
  // file's "from" list is a strict subset of this one's).
  { file:'UPD09051',
    description:'Pro-nav with DVD (all generations, 001.x–006.x). Contact photos, black screen, stability, CarPlay/call-list and ConnectedDrive fixes — supersedes UPD09032/09041/09042.',
    fromNotes:'TB/MB/HB 001.029.x through 006.025.x (multiple historical entry points)',
    result:'TB-006.018.050 / MB-006.026.050 / HB-006.026.050 (or an earlier intermediate target, variant-dependent)', date:'2018–2020',
    variants:[
      { prefix:'TB', exact:[[1,30,1],[1,31,23],[1,34,7],[1,40,1],[1,41,23],[1,42,7],[1,43,2],[1,44,1],[1,45,23],
                             [1,47,3],[1,52,4],[1,56,1],[1,58,1],[1,60,1],[1,61,23],[1,62,32],[1,63,40],
                             [2,20,12],[2,22,1],[2,23,22],[2,32,18],[2,34,2],[2,35,22],
                             [3,6,39],[3,8,11],[3,10,3],[3,11,23],
                             [5,1,16],[5,2,1],[5,3,23],[5,4,32],[5,8,26],[5,10,2],[5,12,1],[5,13,32],
                             [6,1,41],[6,1,44],[6,2,32],[6,6,6],[6,7,32],[6,15,14],[6,16,2],[6,17,6]] },
      { prefix:'MB', exact:[[1,30,1],[1,34,7],[1,40,1],[1,44,1],[1,61,23],
                             [2,22,1],[2,34,2],
                             [5,1,16],[5,2,1],[5,8,26],[5,10,2],[5,12,1],
                             [6,1,41],[6,1,44],[6,6,6],[6,15,14],[6,16,2],[6,17,6],[6,23,7],[6,25,1]] },
      { prefix:'MB', minMajor:1, maxMajor:1, minMinor:47, maxMinor:60 },
      { prefix:'HB', exact:[[1,29,30],[1,34,7],[1,40,1],[1,42,7],[1,43,2],[1,61,23],[1,62,32],
                             [2,20,12],[2,30,2],[2,32,18],
                             [3,6,39],[3,8,11],
                             [5,1,16],[5,2,1],[5,8,26],[5,10,2],[5,12,1],[5,3,22],
                             [6,1,41],[6,1,44],[6,6,6],[6,7,32],[6,15,14],[6,16,2],[6,17,6],[6,23,7],[6,25,1]] },
      { prefix:'HB', minMajor:1, maxMajor:1, minMinor:46, maxMinor:60 },
    ] },

  { file:'UPD11011',
    description:'TT/MT head unit (001.x). Improves telephone with Apple iPhone.',
    fromNotes:'TT/MT 001.x.x',
    result:'TT/MT 001.x updated', date:'2018',
    variants:[
      { prefix:'TT', minMajor:1, maxMajor:1 },
      { prefix:'MT', minMajor:1, maxMajor:1 },
      { prefix:'HT', minMajor:1, maxMajor:1 },
    ] },

  { file:'UPD11024',
    description:'TT/MT head unit (002.x+). Samsung Galaxy S10 and Bluetooth stability fix.',
    fromNotes:'TT/MT 002.x.x',
    result:'TT/MT 002.x updated', date:'2019',
    variants:[
      { prefix:'TT', minMajor:2, maxMajor:999 },
      { prefix:'MT', minMajor:2, maxMajor:999 },
      { prefix:'HT', minMajor:2, maxMajor:999 },
    ] },
];

// ── Version string ────────────────────────────────────────────────────────────

function parseVersion(raw) {
  const m = raw.trim().match(/^([A-Z]{2})[-\s]?(\d{1,3})[.\-](\d{1,3})[.\-](\d{1,3})$/i);
  if (!m) return null;
  const rawMajor = m[2];
  return {
    prefix: m[1].toUpperCase(),
    major:  parseInt(rawMajor, 10),
    minor:  parseInt(m[3], 10),
    patch:  parseInt(m[4], 10),
    style:  rawMajor.length === 3 ? 'long' : 'short',
  };
}

function matchesVariant(ver, v) {
  if (v.prefix !== ver.prefix) return false;
  if (v.style) return ver.style === v.style;
  if (ver.style === 'short') return false; // numeric-bounded variants only apply to long-style input
  if (v.exact) return v.exact.some(([maj, min, pat]) => maj === ver.major && min === ver.minor && pat === ver.patch);
  if (v.major !== undefined && ver.major !== v.major) return false;
  if (v.minMajor !== undefined && ver.major < v.minMajor) return false;
  if (v.maxMajor !== undefined && ver.major > v.maxMajor) return false;
  if (v.minMinor !== undefined && ver.minor < v.minMinor) return false;
  if (v.maxMinor !== undefined && ver.minor > v.maxMinor) return false;
  return true;
}

function findUpdate(ver) {
  return DB.filter(entry => entry.variants.some(v => matchesVariant(ver, v)));
}

// ── DOM rendering ─────────────────────────────────────────────────────────────

const verInput     = document.getElementById('ver-input');
const resultEl     = document.getElementById('result');

function pad3(n) { return String(n).padStart(3, '0'); }

function renderResult(matches, ver) {
  if (matches.length === 0) {
    return `<div class="no-match">
      <p>No update found for <strong>${ver.prefix}-${pad3(ver.major)}.${pad3(ver.minor)}.${pad3(ver.patch)}</strong>.</p>
      <p>This version may already be at the latest available release, or it is not covered by the known update files.</p>
    </div>`;
  }

  return matches.map(entry => `
    <div class="match">
      <div class="match-header">
        <span class="file-name">${entry.file}.bin</span>
        <span class="date">${entry.date}</span>
      </div>
      <p class="match-desc">${entry.description}</p>
      <div class="match-detail">
        <div><span class="label">Applies to</span><span class="value">${entry.fromNotes}</span></div>
        <div><span class="label">After update</span><span class="value">${entry.result}</span></div>
      </div>
      <div class="download-buttons">
        <a class="btn-download" href="${CDN_BIN}${entry.file}.bin" data-track="bin_download" data-file="${entry.file}" download>
          Download ${entry.file}.bin
        </a>
        <a class="btn-pdf" href="${CDN_PDF}Readme_${entry.file}_en.pdf" data-track="pdf_view" data-file="${entry.file}" target="_blank" rel="noopener">
          Read PDF
        </a>
      </div>
    </div>
  `).join('');
}

function renderInstall(matches) {
  if (matches.length === 0) return '';
  const fileName = matches.length === 1 ? `${matches[0].file}.bin` : 'the downloaded .bin file';
  return `
    <details class="install-guide">
      <summary>Installation instructions</summary>
      <ol>
        <li>Format a USB drive as <strong>FAT32</strong>.</li>
        <li>Copy <strong>${fileName}</strong> to the root of the drive (not inside any folder).</li>
        <li>Plug the USB drive into the <strong>USB port in the centre armrest</strong>.</li>
        <li>In the car: <strong>Settings → Software update → Start update</strong>.</li>
        <li>Keep the engine running. Do not remove the USB drive until the update is complete.</li>
        <li>After completion the car will display the new software version. Tracks and playlists may need to be reselected.</li>
      </ol>
      <p class="install-note">If the update is rejected as "too old": set the vehicle's date back several years in iDrive, then <strong>lock the car and leave it for 10–15 minutes</strong> before retrying — changing the date alone isn't enough, the Combox module needs that time to actually resync.</p>
      <p class="install-note">If Bluetooth media metadata stops showing correctly after updating, check that your phone's Bluetooth device name doesn't contain emoji — this has been reported to break track/artist display.</p>
    </details>`;
}

function update() {
  const verRaw = verInput.value.trim();

  if (!verRaw) {
    resultEl.innerHTML = '';
    resultEl.classList.remove('visible');
    return;
  }

  const ver     = parseVersion(verRaw);
  const matches = ver ? findUpdate(ver) : [];

  let html = '';

  if (!ver) {
    html += `<p class="warn">⚠ Could not parse "<strong>${verRaw}</strong>" — expected format: <code>XX-NNN.NNN.NNN</code> (e.g. <code>MN-003.011.002</code>).</p>`;
  } else {
    html += renderResult(matches, ver);
    html += renderInstall(matches);
  }

  resultEl.innerHTML = html;
  resultEl.classList.add('visible');
}

verInput.addEventListener('input', update);

// ── Usage tracking (no cookies, no IP logged — just event + file) ──────────

function track(event, file) {
  if (!navigator.sendBeacon) return;
  navigator.sendBeacon('record.php', new URLSearchParams({ event, file: file || '' }));
}

track('pageview');

resultEl.addEventListener('click', (e) => {
  const link = e.target.closest('a[data-track]');
  if (link) track(link.dataset.track, link.dataset.file);
});
