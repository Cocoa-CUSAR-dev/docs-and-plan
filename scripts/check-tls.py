"""Re-runs the TLS coverage check behind docs/architecture/tls-coverage.md (X-6e).

    python scripts/check-tls.py                      # the default host list below
    python scripts/check-tls.py --postgres <neon-host>  # host part of DATABASE_URL
    python scripts/check-tls.py some-host.onrender.com

Standard library only, and nothing secret: no credentials are needed to see
whether a host serves a valid certificate, redirects plain HTTP, or (for
Postgres) refuses a connection that skips TLS.
"""

import argparse
import datetime
import http.client
import socket
import ssl
import struct

DEFAULT_HTTPS = [
    "web-app-ivory-nine.vercel.app",  # web-app (Vercel production)
    "chatbot-alpha-beige-18.vercel.app",  # chatbot / LINE webhook (Vercel)
    "mobile-backend-render.onrender.com",  # mobile-backend (Render)
    "mobile-backend-2-t8h6.onrender.com",  # mobile-app's built-in default URL
    "cocoa-cusar-dev.github.io",  # mobile-app web test build (GitHub Pages)
]
# No default Postgres host: this repo is public, and the Neon endpoint is
# only ever given by hand (the host part of any service's DATABASE_URL).

PG_SSL_REQUEST = 80877103
PG_PROTOCOL_3 = 196608


def check_https(host: str) -> dict:
    row: dict = {"host": host}
    try:
        with socket.create_connection((host, 443), timeout=15) as raw:
            with ssl.create_default_context().wrap_socket(raw, server_hostname=host) as tls:
                cert = tls.getpeercert()
                expires = datetime.datetime.strptime(cert["notAfter"], "%b %d %H:%M:%S %Y %Z")
                row["tls"] = tls.version()
                row["certificate"] = f"valid until {expires.date()}"
                row["issuer"] = dict(x[0] for x in cert["issuer"]).get("organizationName")
    except Exception as e:  # noqa: BLE001 -- report whatever went wrong
        row["certificate"] = f"FAIL: {e}"
    try:
        conn = http.client.HTTPConnection(host, 80, timeout=15)
        conn.request("GET", "/")
        response = conn.getresponse()
        row["plain http"] = f"{response.status} -> {response.getheader('Location')}"
    except Exception as e:  # noqa: BLE001
        row["plain http"] = f"no listener ({type(e).__name__})"
    try:
        conn = http.client.HTTPSConnection(host, 443, timeout=30)
        conn.request("GET", "/")
        row["hsts"] = conn.getresponse().getheader("Strict-Transport-Security") or "none"
    except Exception as e:  # noqa: BLE001
        row["hsts"] = f"FAIL: {e}"
    return row


def check_postgres(host: str) -> dict:
    row: dict = {"host": host}
    # Does the server offer TLS, with a certificate valid for this name?
    with socket.create_connection((host, 5432), timeout=15) as raw:
        raw.sendall(struct.pack("!ii", 8, PG_SSL_REQUEST))
        if raw.recv(1) == b"S":
            with ssl.create_default_context().wrap_socket(raw, server_hostname=host) as tls:
                row["tls"] = tls.version()
        else:
            row["tls"] = "not offered"
    # Does it refuse a client that skips TLS altogether?
    with socket.create_connection((host, 5432), timeout=15) as raw:
        params = b"user\0tls-probe\0database\0tls-probe\0\0"
        raw.sendall(struct.pack("!ii", 8 + len(params), PG_PROTOCOL_3) + params)
        reply = raw.recv(4096)
        fields = [f.decode(errors="replace") for f in reply[5:].split(b"\0") if f]
        message = next((f[1:] for f in fields if f.startswith("M")), "")
        refused = reply[:1] == b"E" and "insecure" in message
        row["plain-text client"] = "refused" if refused else f"NOT refused ({message or reply[:1]})"
    return row


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("hosts", nargs="*", help="HTTPS hosts (default: the list in this file)")
    parser.add_argument("--postgres", nargs="*", default=[], help="Postgres hosts")
    args = parser.parse_args()

    for host in args.hosts or DEFAULT_HTTPS:
        print(check_https(host))
    for host in args.postgres:
        print(check_postgres(host))


if __name__ == "__main__":
    main()
