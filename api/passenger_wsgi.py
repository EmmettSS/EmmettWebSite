"""
cPanel Passenger entry point.

cPanel's "Setup Python App" looks for `passenger_wsgi.py` in the application root and
imports `application` from it. All the logic lives in `emmett/wsgi.py` so runserver and
Passenger cannot drift apart.
"""
from emmett.wsgi import application

__all__ = ["application"]
