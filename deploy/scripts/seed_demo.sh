#!/usr/bin/env sh
set -eu
: "${VIRTUAL_ENV:?Set VIRTUAL_ENV to the cPanel Python App virtualenv}"
: "${APP_ROOT:?Set APP_ROOT to the Django project root}"
"$VIRTUAL_ENV/bin/python" "$APP_ROOT/manage.py" seed_demo
