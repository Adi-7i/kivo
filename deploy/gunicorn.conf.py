"""Production WSGI configuration; requires an explicitly approved Gunicorn install.

Run from the repository root with --config deploy/gunicorn.conf.py. The HTTPS
proxy must be on loopback, strip incoming forwarded headers and set its own.
"""

from pathlib import Path

chdir = str(Path(__file__).resolve().parents[1] / "backend")
wsgi_app = "config.wsgi:application"
raw_env = ["DJANGO_SETTINGS_MODULE=config.settings.production"]
bind = "127.0.0.1:8000"
workers = 2
worker_class = "sync"
threads = 1
preload_app = False
timeout = 60
graceful_timeout = 30
max_requests = 1000
max_requests_jitter = 100
forwarded_allow_ips = "127.0.0.1,::1"
secure_scheme_headers = {"X-FORWARDED-PROTO": "https"}
# Django logs a validated request ID and the path without query strings/bodies.
accesslog = None
errorlog = "-"
capture_output = False
