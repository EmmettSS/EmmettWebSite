# cPanel deployment guide

This guide is a template, not a verified deployment. Obtain B2 (host, Python 3.12 and MariaDB/MySQL versions, Passenger, cron, domain/DNS) before production.

1. Create a cPanel **Setup Python App** using Python 3.12, an isolated application root under `api/`, startup file `passenger_wsgi.py` and callable `application`.
2. Install `api/requirements/prod.txt` into that app's virtualenv.
3. Create a least-privilege MariaDB/MySQL database and configure `DB_ENGINE=mysql`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`.
4. Set `DJANGO_SECRET_KEY`, `DJANGO_DEBUG=false`, `DJANGO_ALLOWED_HOSTS`, verified `PUBLIC_SITE_URL`, and `DJANGO_SETTINGS_MODULE=emmett.settings` through cPanel environment settings. Never commit secrets.
5. Run `manage.py migrate --noinput` and `collectstatic --noinput`.
6. Publish `web/dist` as static files, configure API routing to Passenger, and add corrected absolute-path entries from `crontab.txt` in cPanel Cron Jobs.
7. Enable AutoSSL, verify DNS/HTTPS, health endpoint, docs, admin and security headers.
8. Back up the DB and test restore on staging before launch. Neither the deployment nor restore has been verified yet.

For rollback, keep the previous static release and pre-migration database backup. Review migrations for compatibility before reversing them.
