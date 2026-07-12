#!/usr/bin/env python3
"""
BMW iDrive Media Software Update Selector

Determines which update .bin file is correct for a given BMW, based on:
  - The current software version shown in the car (most reliable)
  - The VIN (used to derive model year and head unit family hint)

All mappings are derived from the official BMW readme PDFs for the 15 update
files hosted at:
  https://static.bmw.com/content/dam/bmw/staticContent/static_bmw_com/bluetooth/updates/bmw/

Usage:
  python3 bmw_update_selector.py --version MN-003.011.002
  python3 bmw_update_selector.py --vin WBYZ82060JVG87520
  python3 bmw_update_selector.py --vin WBYZ82060JVG87520 --version MN-003.011.002
  python3 bmw_update_selector.py --list
"""

import argparse
import re
import sys

# ---------------------------------------------------------------------------
# VIN model year map (position 10). Skips I, O, Q, U, Z.
# ---------------------------------------------------------------------------
MODEL_YEAR_MAP = {
    'A': 2010, 'B': 2011, 'C': 2012, 'D': 2013, 'E': 2014,
    'F': 2015, 'G': 2016, 'H': 2017, 'J': 2018, 'K': 2019,
    'L': 2020, 'M': 2021, 'N': 2022, 'P': 2023, 'R': 2024,
    'S': 2025, 'T': 2026, 'V': 2027, 'W': 2028, 'X': 2029,
    'Y': 2030,
    # Pre-2010
    '1': 2001, '2': 2002, '3': 2003, '4': 2004, '5': 2005,
    '6': 2006, '7': 2007, '8': 2008, '9': 2009,
}

# ---------------------------------------------------------------------------
# World Manufacturer Identifiers
# ---------------------------------------------------------------------------
WMI_MAP = {
    'WBA': 'BMW AG (passenger cars)',
    'WBS': 'BMW M GmbH (M cars)',
    'WBX': 'BMW X models',
    'WBY': 'BMW i (i3, i8)',
    'WBW': 'BMW motorcycles',
    '5UX': 'BMW North America (X5/X6)',
    '5YM': 'BMW North America (X5 M/X6 M)',
    '4US': 'BMW North America',
    'SAL': 'Land Rover (not BMW)',
}

# ---------------------------------------------------------------------------
# Update file database, derived from official BMW readme PDFs.
#
# 'prefix'      : software version prefixes this file handles
# 'major_range' : (min, max) inclusive range of the major version component
# 'description' : what the update fixes
# 'from_notes'  : example starting versions, as shown in the PDF
# 'result'      : software version shown in car after update
# 'pdf_date'    : copyright date of the readme PDF
# ---------------------------------------------------------------------------
UPDATE_DB = [
    {
        'file':        'UPD01008',
        'prefixes':    ['MX', 'TX'],
        'major_range': (0, 9),
        'description': 'Very old CCC-era iDrive. Bluetooth/media improvements.',
        'from_notes':  'MX-1.x, MX-3.x, TX-2.x, TX-3.x',
        'result':      'MX-3.5.4 / TX-3.5.8 (variant-dependent)',
        'pdf_date':    '2014',
    },
    {
        'file':        'UPD03007',
        'prefixes':    ['ME', 'TE'],
        'major_range': (0, 9),
        'description': 'CIC-era iDrive. Bluetooth and media improvements.',
        'from_notes':  'ME-8.x, TE-8.x',
        'result':      'ME-8.5.5 / TE-8.5.5',
        'pdf_date':    '2013',
    },
    {
        'file':        'UPD05021',
        'prefixes':    ['MN', 'TN'],
        # Matches the old-style un-padded format: MN-1.x, MN-2.x (major < 100)
        'major_range': (0, 9),
        'description': 'NBT Evo early versions. Bluetooth, podcast, and multimedia fixes.',
        'from_notes':  'MN-1.21, MN-1.23, MN-1.37, MN-2.18, MN-2.34',
        'result':      'MN-2.34.1 / TN-2.34.1 (closest matching variant)',
        'pdf_date':    '2014',
        # Special: these use un-padded version numbers like "MN-2.18.2"
        'version_style': 'short',
    },
    {
        'file':        'UPD05074',
        'prefixes':    ['MN', 'TN', 'HN'],
        'major_range': (1, 2),  # 001.x.x and 002.x.x
        'description': 'NBT Evo mid versions. BlackBerry, iOS, Bluetooth, ConnectedDrive fixes.',
        'from_notes':  'MN-001.021.070 through MN-002.255.071',
        'result':      'MN-002.255.071 / TN-002.255.070',
        'pdf_date':    '2016',
        'version_style': 'long',
    },
    {
        'file':        'UPD05081',
        'prefixes':    ['MN', 'TN', 'HN'],
        'major_range': (3, 3),  # 003.x.x only
        'description': 'NBT Evo latest (2018). ConnectedDrive Services improvements.',
        'from_notes':  'MN-003.001.002, MN-003.003.001, MN-003.009.004, MN-003.011.002, MN-003.013.001',
        'result':      'MN-003.013.001 / TN-003.255.080 / HN-003.255.080',
        'pdf_date':    'November 2018',
        'version_style': 'long',
    },
    {
        'file':        'UPD07041',
        'prefixes':    ['MV', 'TV'],
        'major_range': (110, 110),
        'description': 'Alternative head unit (110.x series). iOS 11 call list transfer fix.',
        'from_notes':  'MV-110.005.011, TV-110.005.030',
        'result':      'MV-110.006.x / TV-110.006.x / HV-130.017.032',
        'pdf_date':    '2017',
        'version_style': 'long',
    },
    {
        'file':        'UPD07044',
        'prefixes':    ['MV', 'TV', 'HV'],
        'major_range': (130, 130),
        'minor_range': (0, 16),   # up to 130.016.x
        'description': 'Alternative head unit (130.x series). ConnectedDrive improvements.',
        'from_notes':  'MV-130.008.020, MV-130.009.020, MV-130.015.001, MV-130.016.001',
        'result':      'TV-130.025.041',
        'pdf_date':    '2017',
        'version_style': 'long',
    },
    {
        'file':        'UPD07052',
        'prefixes':    ['MV', 'TV', 'HV'],
        'major_range': (130, 130),
        'minor_range': (17, 999),  # 130.017.x and above (after UPD07044)
        'description': 'Alternative head unit (130.x later). Bluetooth, Apple Watch/iPhone fixes.',
        'from_notes':  'TV-130.017.x through TV-130.026.x (post-UPD07044 versions)',
        'result':      'TV-130.027.051 / HV-130.027.051',
        'pdf_date':    '2018',
        'version_style': 'long',
    },
    {
        'file':        'UPD09032',
        'prefixes':    ['TB', 'MB', 'HB'],
        'major_range': (2, 6),    # 002.x.x – 006.x.x
        'description': 'Pro-nav with DVD (later range). iPhone 8/X call list + CarPlay name display fix.',
        'from_notes':  'TB/MB 002.x.x – 006.x.x',
        'result':      'TB/MB updated variant',
        'pdf_date':    '2018',
        'version_style': 'long',
    },
    {
        'file':        'UPD09051',
        'prefixes':    ['TB', 'MB', 'HB'],
        'major_range': (1, 1),    # 001.x.x
        'minor_range': (0, 60),   # 001.000.x – 001.060.x (broad early range)
        'description': 'Pro-nav with DVD (broad 001.x range). Contact photos, black screen, stability fixes.',
        'from_notes':  'TB/MB 001.047.x through 001.060.x',
        'result':      'TB/MB updated variant',
        'pdf_date':    '2018',
        'version_style': 'long',
    },
    {
        'file':        'UPD09042',
        'prefixes':    ['TB', 'MB', 'HB'],
        'major_range': (1, 1),
        'minor_range': (62, 62),  # 001.062.x specifically
        'description': 'Pro-nav with DVD (001.062.x). Restores CD/DVD playback from paused point.',
        'from_notes':  'TB-001.062.032, MB-001.062.040',
        'result':      'TB-001.062.032 / MB-001.062.040 / HB-001.062.032',
        'pdf_date':    '2018',
        'version_style': 'long',
    },
    {
        'file':        'UPD09041',
        'prefixes':    ['TB', 'MB', 'HB'],
        'major_range': (1, 1),
        'minor_range': (63, 999), # 001.063.x and above
        'description': 'Pro-nav with DVD (001.063.x+). ConnectedDrive + DVD resume fix.',
        'from_notes':  'TB-001.063.040, MB-001.062.040',
        'result':      'TB-001.063.040 / MB-001.062.040 / HB-001.062.032',
        'pdf_date':    '2018',
        'version_style': 'long',
    },
    {
        'file':        'UPD11011',
        'prefixes':    ['TT', 'MT', 'HT'],
        'major_range': (1, 1),
        'description': 'TT/MT head unit (001.x). Improves telephone with Apple iPhone.',
        'from_notes':  'TT/MT 001.x.x',
        'result':      'TT/MT 001.x updated variant',
        'pdf_date':    '2018',
        'version_style': 'long',
    },
    {
        'file':        'UPD11024',
        'prefixes':    ['TT', 'MT', 'HT'],
        'major_range': (2, 999),
        'description': 'TT/MT head unit (002.x+). Samsung Galaxy S10 connection + Bluetooth stability.',
        'from_notes':  'TT/MT 002.x.x',
        'result':      'TT/MT 002.x updated variant',
        'pdf_date':    '2019',
        'version_style': 'long',
    },
]

# ---------------------------------------------------------------------------
# Head unit family hints by VIN WMI + model year.
# These are heuristics — the software version is always the authoritative source.
# ---------------------------------------------------------------------------
def vin_head_unit_hint(wmi, year):
    if wmi == 'WBY':
        return {
            'family': 'MN/TN/HN (NBT Evo)',
            'model':  'BMW i3 or i8',
            'files':  ['UPD05021', 'UPD05074', 'UPD05081'],
            'note':   'All i3/i8 models use the NBT Evo head unit (MN/TN/HN version scheme).',
        }
    if wmi in ('WBA', 'WBS', 'WBX', '5UX', '5YM', '4US'):
        if year and year <= 2012:
            return {
                'family': 'MX/TX or ME/TE (CCC/CIC era)',
                'files':  ['UPD01008', 'UPD03007'],
                'note':   'Pre-2013 BMW. Likely CCC or CIC head unit. '
                          'Check current version for MX, TX, ME, or TE prefix.',
            }
        if year and 2013 <= year <= 2018:
            return {
                'family': 'Multiple possible — depends on which navigation was fitted',
                'files':  ['UPD05081', 'UPD07052', 'UPD09051', 'UPD11024'],
                'note':   'Head unit type depends on factory options (SA codes). '
                          'Check Settings → Software update → Show current version. '
                          'The two-letter prefix (MN, MV, MB, MT…) determines the correct file.',
            }
    return {
        'family': 'Unknown',
        'files':  [],
        'note':   'Could not determine head unit family from VIN alone. '
                  'Check Settings → Software update → Show current version.',
    }

# ---------------------------------------------------------------------------
# VIN parsing
# ---------------------------------------------------------------------------
def parse_vin(vin):
    vin = vin.strip().upper()
    result = {'raw': vin, 'errors': []}

    if len(vin) != 17:
        result['errors'].append(
            f'VIN is {len(vin)} characters; expected 17. '
            'Check your registration document or the dashboard plate.'
        )
        if len(vin) == 16:
            # Common case: missing model-year char. Try inserting based on context.
            result['errors'].append(
                'If this is a 2018 vehicle, the missing character is likely "J" at position 10. '
                f'Suggested VIN: {vin[:9]}J{vin[9:]}'
            )
        return result

    result['wmi'] = vin[:3]
    result['manufacturer'] = WMI_MAP.get(vin[:3], f'Unknown (WMI: {vin[:3]})')
    year_char = vin[9]
    result['year_char'] = year_char
    result['model_year'] = MODEL_YEAR_MAP.get(year_char)
    result['plant'] = vin[10]
    result['serial'] = vin[11:]
    result['hint'] = vin_head_unit_hint(result['wmi'], result.get('model_year'))
    return result

# ---------------------------------------------------------------------------
# Software version parsing
# Handles: MN-003.011.002  MN003011002  MN 003.011.002  MN-2.18.2
# ---------------------------------------------------------------------------
VERSION_RE = re.compile(
    r'^([A-Z]{2})'          # two-letter prefix
    r'[-\s]?'               # optional separator
    r'(\d{1,3})'            # major
    r'[.\-]'                # separator
    r'(\d{1,3})'            # minor
    r'[.\-]'                # separator
    r'(\d{1,3})$',          # patch
    re.IGNORECASE
)

def parse_version(s):
    m = VERSION_RE.match(s.strip())
    if not m:
        return None
    raw_major = m.group(2)
    # Distinguish zero-padded long format (003.011.002) from old short format (2.18.2).
    # Long format: major field is exactly 3 digits (e.g. "003"). Short: 1-2 digits (e.g. "2").
    style = 'long' if len(raw_major) == 3 else 'short'
    return {
        'prefix': m.group(1).upper(),
        'major':  int(raw_major),
        'minor':  int(m.group(3)),
        'patch':  int(m.group(4)),
        'style':  style,
        'raw':    s.strip(),
    }

# ---------------------------------------------------------------------------
# Match a parsed version against the update database
# ---------------------------------------------------------------------------
def find_updates(ver):
    matches = []
    ver_style = ver.get('style', 'long')
    major = ver['major']
    minor = ver['minor']

    for entry in UPDATE_DB:
        if ver['prefix'] not in entry['prefixes']:
            continue

        entry_style = entry.get('version_style', 'long')

        # Short-format entries (UPD05021) only match short-format input versions
        if entry_style == 'short':
            if ver_style == 'short':
                matches.append(entry)
            continue

        # Long-format entries only match long-format input versions
        if ver_style == 'short':
            continue

        lo, hi = entry['major_range']
        if not (lo <= major <= hi):
            continue

        if 'minor_range' in entry:
            mlo, mhi = entry['minor_range']
            if not (mlo <= minor <= mhi):
                continue

        matches.append(entry)

    return matches

# ---------------------------------------------------------------------------
# Formatting helpers
# ---------------------------------------------------------------------------
def hr(char='-', width=56):
    return char * width

def print_vin_result(info):
    print(f"\n  VIN:          {info['raw']}")
    if info.get('errors'):
        for e in info['errors']:
            print(f"  WARNING:      {e}")
        return

    print(f"  Manufacturer: {info['manufacturer']}")
    year = info.get('model_year')
    year_str = str(year) if year else f"Unknown (year code: {info['year_char']})"
    print(f"  Model year:   {year_str}")
    print(f"  Plant:        {info['plant']}")
    hint = info.get('hint', {})
    if hint.get('model'):
        print(f"  Model:        {hint['model']}")
    print(f"  Head unit:    {hint.get('family', 'Unknown')}")
    print(f"  Note:         {hint.get('note', '')}")
    if hint.get('files') and len(hint['files']) > 1:
        print(f"\n  Likely file(s) based on VIN alone:")
        for f in hint['files']:
            entry = next((e for e in UPDATE_DB if e['file'] == f), None)
            if entry:
                print(f"    {f}.bin  —  {entry['description'][:60]}")
        print(f"\n  Provide --version for a definitive match.")

def print_version_result(ver_str, ver):
    print(f"\n  Version:      {ver_str}")
    if not ver:
        print(f"  ERROR:        Could not parse version string.")
        print(f"  Expected:     XX-NNN.NNN.NNN  (e.g. MN-003.011.002)")
        return

    print(f"  Prefix:       {ver['prefix']}  (head unit family)")
    print(f"  Version:      {ver['major']:03d}.{ver['minor']:03d}.{ver['patch']:03d}")

    matches = find_updates(ver)
    if not matches:
        print(f"\n  No update found. Either this version is already at the latest,")
        print(f"  or it is not covered by the 15 downloaded update files.")
    elif len(matches) == 1:
        e = matches[0]
        print(f"\n  Update file:  {e['file']}.bin")
        print(f"  Description:  {e['description']}")
        print(f"  Starts from:  {e['from_notes']}")
        print(f"  After update: {e['result']}")
        print(f"  PDF dated:    {e['pdf_date']}")
    else:
        print(f"\n  Multiple potential updates (apply in order):")
        for e in matches:
            print(f"\n    {e['file']}.bin")
            print(f"    Description:  {e['description']}")
            print(f"    After update: {e['result']}")

    print(f"""
  Installation:
    1. Format a USB drive as FAT32
    2. Copy {matches[0]['file'] + '.bin' if len(matches) == 1 else '<file>.bin'} to the root of the drive
    3. Plug into the USB port in the centre armrest
    4. In the car: Settings → Software update → Start update
    5. Keep the engine running; do not remove USB until complete""")

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(
        description='Determine the correct BMW iDrive media software update file.',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
examples:
  %(prog)s --version MN-003.011.002
  %(prog)s --vin WBYZ82060JVG87520
  %(prog)s --vin WBYZ82060JVG87520 --version MN-003.011.002
  %(prog)s --list

To find your current version in the car:
  Settings → Software update → Show current version
        """
    )
    parser.add_argument('--vin',     metavar='VIN',     help='17-character BMW VIN')
    parser.add_argument('--version', metavar='VERSION', help='Current version shown in car (e.g. MN-003.011.002)')
    parser.add_argument('--list',    action='store_true', help='List all 15 known update files')
    args = parser.parse_args()

    if not any([args.vin, args.version, args.list]):
        parser.print_help()
        sys.exit(0)

    if args.list:
        print(f"\n{hr('=')}")
        print(f"  All 15 BMW iDrive media update files")
        print(f"{hr('=')}")
        for e in UPDATE_DB:
            print(f"\n  {e['file']}.bin  [{e['pdf_date']}]")
            print(f"    Family:    {', '.join(e['prefixes'])}")
            print(f"    Fixes:     {e['description']}")
            print(f"    Examples:  {e['from_notes']}")
            print(f"    Result:    {e['result']}")
        print()
        return

    print(f"\n{hr('=')}")
    print(f"  BMW iDrive Media Update Selector")
    print(f"{hr('=')}")

    if args.vin:
        print(f"\n{hr()}")
        print(f"  VIN Analysis")
        print(f"{hr()}")
        print_vin_result(parse_vin(args.vin))

    if args.version:
        print(f"\n{hr()}")
        print(f"  Software Version Analysis")
        print(f"{hr()}")
        ver = parse_version(args.version)
        print_version_result(args.version, ver)

    print(f"\n{hr()}")
    print()

if __name__ == '__main__':
    main()
