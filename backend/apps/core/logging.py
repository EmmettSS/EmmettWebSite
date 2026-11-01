"""پیکربندی متمرکز لاگ ساختاریافته (structlog).

هدف: تمام لاگ‌های اپلیکیشن (نه فقط درخواست‌های HTTP) به‌صورت ساختاریافته
(key=value در توسعه، JSON در پروداکشن) خروجی بگیرند تا قابل جست‌وجو/تجمیع در
ابزارهای لاگ‌مدیریت باشند. ``django-structlog`` میان‌افزار درخواست را فراهم
می‌کند (``request_id`` یکتا به ازای هر درخواست، bind خودکار به context).
"""

from __future__ import annotations

import logging
from typing import cast

import structlog


def configure_structlog(*, debug: bool) -> None:
    """پیکربندی structlog را بر اساس محیط (توسعه/پروداکشن) تنظیم می‌کند.

    در توسعه از یک رندرر خوانا برای انسان استفاده می‌شود؛ در پروداکشن خروجی
    همیشه JSON تک‌خطی است تا توسط ابزارهای تجمیع لاگ قابل پردازش باشد.
    """

    shared_processors: list[structlog.types.Processor] = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]

    if debug:
        renderer: structlog.types.Processor = structlog.dev.ConsoleRenderer()
    else:
        renderer = structlog.processors.JSONRenderer()

    structlog.configure(
        processors=[
            *shared_processors,
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

    formatter = structlog.stdlib.ProcessorFormatter(
        processors=[
            structlog.stdlib.ProcessorFormatter.remove_processors_meta,
            renderer,
        ],
        foreign_pre_chain=shared_processors,
    )

    handler = logging.StreamHandler()
    handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.handlers = [handler]
    root_logger.setLevel(logging.DEBUG if debug else logging.INFO)


def get_logger(name: str) -> structlog.stdlib.BoundLogger:
    """یک logger ساختاریافتهٔ bind‌شده به نام ماژول برمی‌گرداند."""

    return cast(structlog.stdlib.BoundLogger, structlog.get_logger(name))
