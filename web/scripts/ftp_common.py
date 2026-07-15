#!/usr/bin/env python3
# Shared FTP connection helpers for deploy and check-stats.
# Requires FTP_USER and FTP_PASS env vars (source ../../eukhost/eukenv or similar).

import argparse
import ftplib
import os
import ssl

# The FTP cert is issued for *.theukhost.net (the shared hosting domain),
# not ftp.hamadi.net, so connect via the actual server hostname to allow
# full TLS verification (chain + hostname).
_ftp_host = os.environ.get("FTP_HOST", "firefly.theukhost.net")
_ftp_user = os.environ["FTP_USER"]
_ftp_pass = os.environ["FTP_PASS"]

ENVIRONMENTS = {
    "prod": {
        "host":        _ftp_host,
        "user":        _ftp_user,
        "password":    _ftp_pass,
        "remote_path": "public_html/bmwupdate.hamadi.net",
    },
    "test": {
        "host":        _ftp_host,
        "user":        _ftp_user,
        "password":    _ftp_pass,
        "remote_path": "public_html/bmwupdate-test.hamadi.net",
    },
}


def parse_environment(description):
    parser = argparse.ArgumentParser(description=description)
    parser.add_argument("environment", choices=ENVIRONMENTS.keys())
    args = parser.parse_args()
    return args.environment, ENVIRONMENTS[args.environment]


def connect(env):
    ctx = ssl.create_default_context()
    ftp = ftplib.FTP_TLS(context=ctx)
    ftp.connect(env["host"])
    ftp.auth()
    ftp.login(env["user"], env["password"])
    ftp.prot_p()
    ftp.set_pasv(True)
    return ftp
