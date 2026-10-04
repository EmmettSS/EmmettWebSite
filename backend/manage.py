#!/usr/bin/env python
"""ابزار خط‌فرمان مدیریت Django — پیش‌فرض محیط توسعه."""

import os
import sys


def main() -> None:
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Django را نمی‌توان ایمپورت کرد. مطمئن شوید نصب شده و در PYTHONPATH "
            "در دسترس است. آیا virtualenv را فعال کرده‌اید؟"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
