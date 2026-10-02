import os
import sys
from pathlib import Path
APP_ROOT = Path(__file__).resolve().parent.parent / "api"
sys.path.insert(0, str(APP_ROOT))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "emmett.settings")
from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
