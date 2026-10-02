"""
WSGI entry point.

`settings.WSGI_APPLICATION` and `api/passenger_wsgi.py` both point here, and cPanel's
Setup Python App loads `passenger_wsgi.py` — so this module is the contract between the
repository and the host. It is deliberately tiny: configuration lives in settings.py.
"""
import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "emmett.settings")

application = get_wsgi_application()
