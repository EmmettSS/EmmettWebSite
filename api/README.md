# Emmett API

Django 5.2 REST API for Emmett; designed for cPanel Passenger/WSGI and MariaDB. Local development defaults to SQLite.

```bash
python -m venv .venv
. .venv/bin/activate
pip install -r requirements/dev.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

API v1 is under `/api/v1/`; OpenAPI schema `/api/schema/`; Swagger `/api/docs/`. Configuration is environment-based; use `.env.example` as a key list, never commit real secrets. See `../docs/API.md` and `../deploy/DEPLOY-CPANEL.fa.md`.
