'use strict';

const CDN_BIN = 'https://static.bmw.com/content/dam/bmw/staticContent/static_bmw_com/bluetooth/updates/bmw/bin/';
const CDN_PDF = 'https://static.bmw.com/content/dam/bmw/staticContent/static_bmw_com/bluetooth/updates/bmw/pdf/';

// Derived from official BMW readme PDFs for each update file.
// 'style' distinguishes the old short format (MN-2.18.2) from the long zero-padded format (MN-003.011.002).
const DB = [
  { file:'UPD01008', prefixes:['MX','TX'], style:'short',
    description:'Very old CCC-era iDrive. Bluetooth and media improvements.',
    fromNotes:'MX-1.x, MX-3.x, TX-2.x, TX-3.x',
    result:'MX-3.5.4 / TX-3.5.8 (variant-dependent)', date:'2014' },

  { file:'UPD03007', prefixes:['ME','TE'], style:'short',
    description:'CIC-era iDrive. Bluetooth and media improvements.',
    fromNotes:'ME-8.x, TE-8.x',
    result:'ME-8.5.5 / TE-8.5.5', date:'2013' },

  { file:'UPD05021', prefixes:['MN','TN'], style:'short',
    description:'NBT Evo early versions. Bluetooth, podcast and multimedia fixes.',
    fromNotes:'MN-1.21, MN-1.23, MN-1.37, MN-2.18, MN-2.34',
    result:'MN-2.34.1 / TN-2.34.1', date:'2014' },

  { file:'UPD05074', prefixes:['MN','TN','HN'], style:'long',
    majorRange:[1,2],
    description:'NBT Evo mid versions. BlackBerry, iOS, Bluetooth and ConnectedDrive fixes.',
    fromNotes:'MN-001.021.070 through MN-002.255.071',
    result:'MN-002.255.071 / TN-002.255.070', date:'2016' },

  { file:'UPD05081', prefixes:['MN','TN','HN'], style:'long',
    majorRange:[3,3],
    description:'NBT Evo latest. ConnectedDrive Services improvements.',
    fromNotes:'MN-003.001.002, MN-003.003.001, MN-003.009.004, MN-003.011.002, MN-003.013.001',
    result:'MN-003.013.001 / TN-003.255.080 / HN-003.255.080', date:'November 2018' },

  { file:'UPD07041', prefixes:['MV','TV'], style:'long',
    majorRange:[110,110],
    description:'Alternative head unit (110.x series). iOS 11 call list transfer fix.',
    fromNotes:'MV-110.005.011, TV-110.005.030',
    result:'MV-110.006.x / TV-110.006.x / HV-130.017.032', date:'2017' },

  { file:'UPD07044', prefixes:['MV','TV','HV'], style:'long',
    majorRange:[130,130], minorRange:[0,16],
    description:'Alternative head unit (130.x series). ConnectedDrive improvements.',
    fromNotes:'MV-130.008.020, MV-130.009.020, MV-130.015.001, MV-130.016.001',
    result:'TV-130.025.041', date:'2017' },

  { file:'UPD07052', prefixes:['MV','TV','HV'], style:'long',
    majorRange:[130,130], minorRange:[17,999],
    description:'Alternative head unit (later 130.x). Bluetooth and Apple Watch/iPhone fixes.',
    fromNotes:'TV-130.017.x through TV-130.026.x',
    result:'TV-130.027.051 / HV-130.027.051', date:'2018' },

  { file:'UPD09032', prefixes:['TB','MB','HB'], style:'long',
    majorRange:[2,6],
    description:'Pro-nav with DVD (002.x–006.x). iPhone 8/X call list and CarPlay name fix.',
    fromNotes:'TB/MB 002.x.x – 006.x.x',
    result:'TB/MB updated variant', date:'2018' },

  { file:'UPD09051', prefixes:['TB','MB','HB'], style:'long',
    majorRange:[1,1], minorRange:[0,60],
    description:'Pro-nav with DVD (001.047.x–001.060.x). Contact photos, black screen, stability.',
    fromNotes:'TB/MB 001.047.x through 001.060.x',
    result:'TB/MB updated variant', date:'2018' },

  { file:'UPD09042', prefixes:['TB','MB','HB'], style:'long',
    majorRange:[1,1], minorRange:[62,62],
    description:'Pro-nav with DVD (001.062.x). Restores CD/DVD playback from paused point.',
    fromNotes:'TB-001.062.032, MB-001.062.040',
    result:'TB-001.062.032 / MB-001.062.040 / HB-001.062.032', date:'2018' },

  { file:'UPD09041', prefixes:['TB','MB','HB'], style:'long',
    majorRange:[1,1], minorRange:[63,999],
    description:'Pro-nav with DVD (001.063.x+). ConnectedDrive and DVD resume fix.',
    fromNotes:'TB-001.063.040, MB-001.062.040',
    result:'TB-001.063.040 / MB-001.062.040 / HB-001.062.032', date:'2018' },

  { file:'UPD11011', prefixes:['TT','MT','HT'], style:'long',
    majorRange:[1,1],
    description:'TT/MT head unit (001.x). Improves telephone with Apple iPhone.',
    fromNotes:'TT/MT 001.x.x',
    result:'TT/MT 001.x updated', date:'2018' },

  { file:'UPD11024', prefixes:['TT','MT','HT'], style:'long',
    majorRange:[2,999],
    description:'TT/MT head unit (002.x+). Samsung Galaxy S10 and Bluetooth stability fix.',
    fromNotes:'TT/MT 002.x.x',
    result:'TT/MT 002.x updated', date:'2019' },
];

// ── VIN ──────────────────────────────────────────────────────────────────────

const YEAR_MAP = {
  A:2010,B:2011,C:2012,D:2013,E:2014,F:2015,G:2016,H:2017,
  J:2018,K:2019,L:2020,M:2021,N:2022,P:2023,R:2024,S:2025,
  T:2026,V:2027,W:2028,X:2029,Y:2030,
};

function parseVin(raw) {
  const vin = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (vin.length === 0) return null;

  if (vin.length !== 17) {
    const msg = vin.length === 16
      ? `VIN is 16 characters — one digit may be missing. If this is a 2018 vehicle try <strong>${vin.slice(0,9)}J${vin.slice(9)}</strong>.`
      : `VIN must be 17 characters (you entered ${vin.length}).`;
    return { error: msg };
  }

  const wmi = vin.slice(0, 3);
  const year = YEAR_MAP[vin[9]] || null;

  let model = null, headUnitNote = null;
  if (wmi === 'WBY') {
    model = 'BMW i (i3 or i8)';
    headUnitNote = 'All i3 and i8 models use the NBT Evo head unit — version prefix MN, TN, or HN.';
  } else if (['WBA','WBS','WBX'].includes(wmi)) {
    model = 'BMW AG';
  } else if (['5UX','5YM','4US'].includes(wmi)) {
    model = 'BMW (North America)';
  }

  return { vin, wmi, year, model, headUnitNote };
}

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

function findUpdate(ver) {
  return DB.filter(entry => {
    if (!entry.prefixes.includes(ver.prefix)) return false;
    if (entry.style === 'short') return ver.style === 'short';
    if (ver.style === 'short') return false;
    const [lo, hi] = entry.majorRange;
    if (ver.major < lo || ver.major > hi) return false;
    if (entry.minorRange) {
      const [mlo, mhi] = entry.minorRange;
      if (ver.minor < mlo || ver.minor > mhi) return false;
    }
    return true;
  });
}

// ── DOM rendering ─────────────────────────────────────────────────────────────

const vinInput     = document.getElementById('vin-input');
const verInput     = document.getElementById('ver-input');
const resultEl     = document.getElementById('result');

function pad3(n) { return String(n).padStart(3, '0'); }

function renderVinInfo(info) {
  if (!info) return '';
  if (info.error) return `<p class="warn">⚠ ${info.error}</p>`;
  let html = `<div class="vin-info">`;
  if (info.model) html += `<span class="tag">${info.model}</span>`;
  if (info.year)  html += `<span class="tag">${info.year}</span>`;
  if (info.headUnitNote) html += `<p class="vin-note">${info.headUnitNote}</p>`;
  html += `</div>`;
  return html;
}

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
        <a class="btn-download" href="${CDN_BIN}${entry.file}.bin" download>
          Download ${entry.file}.bin
        </a>
        <a class="btn-pdf" href="${CDN_PDF}Readme_${entry.file}_en.pdf" target="_blank" rel="noopener">
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
    </details>`;
}

function update() {
  const vinRaw = vinInput.value.trim();
  const verRaw = verInput.value.trim();

  if (!vinRaw && !verRaw) {
    resultEl.innerHTML = '';
    resultEl.classList.remove('visible');
    return;
  }

  const vinInfo = vinRaw ? parseVin(vinRaw) : null;
  const ver     = verRaw ? parseVersion(verRaw) : null;
  const matches = ver ? findUpdate(ver) : [];

  let html = '';

  if (vinInfo) html += renderVinInfo(vinInfo);

  if (verRaw && !ver) {
    html += `<p class="warn">⚠ Could not parse "<strong>${verRaw}</strong>" — expected format: <code>XX-NNN.NNN.NNN</code> (e.g. <code>MN-003.011.002</code>).</p>`;
  } else if (ver) {
    html += renderResult(matches, ver);
    html += renderInstall(matches);
  } else if (vinInfo && !vinInfo.error) {
    html += `<p class="prompt">Now enter your current software version above to find your specific update.</p>`;
  }

  resultEl.innerHTML = html;
  resultEl.classList.add('visible');
}

vinInput.addEventListener('input', update);
verInput.addEventListener('input', update);
