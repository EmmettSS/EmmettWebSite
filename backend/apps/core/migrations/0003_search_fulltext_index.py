"""FULLTEXT index (MySQL) / جدول مجازی FTS5 + تریگرهای همگام‌سازی (SQLite) — ADR-0021.

این migration عمداً از ``RunPython`` با انشعاب روی ``schema_editor.connection.vendor``
استفاده می‌کند چون سینتکس ایندکس متن کامل بین MySQL و SQLite کاملاً متفاوت است؛
خودِ جدول پایه (``SearchIndexEntry``) در ``0002_...`` ساخته شده و اینجا فقط
لایهٔ جست‌وجوی سریع روی آن اضافه می‌شود. برای vendorهای دیگر (مثلاً postgresql
در محیط‌های غیرمنتظره)، هیچ ایندکس اختصاصی ساخته نمی‌شود و
``apps.core.search._search_fallback`` (icontains ساده) به‌کار می‌رود.
"""

from __future__ import annotations

from django.db import migrations
from django.db.backends.base.schema import BaseDatabaseSchemaEditor
from django.db.migrations.state import StateApps

_SQLITE_FORWARD_STATEMENTS = [
    """
    CREATE VIRTUAL TABLE IF NOT EXISTS core_searchindexentry_fts USING fts5(
        title, body, content='core_searchindexentry', content_rowid='id'
    )
    """,
    """
    CREATE TRIGGER IF NOT EXISTS core_searchindexentry_ai
    AFTER INSERT ON core_searchindexentry
    BEGIN
        INSERT INTO core_searchindexentry_fts(rowid, title, body)
        VALUES (new.id, new.title, new.body);
    END
    """,
    """
    CREATE TRIGGER IF NOT EXISTS core_searchindexentry_ad
    AFTER DELETE ON core_searchindexentry
    BEGIN
        INSERT INTO core_searchindexentry_fts(core_searchindexentry_fts, rowid, title, body)
        VALUES ('delete', old.id, old.title, old.body);
    END
    """,
    """
    CREATE TRIGGER IF NOT EXISTS core_searchindexentry_au
    AFTER UPDATE ON core_searchindexentry
    BEGIN
        INSERT INTO core_searchindexentry_fts(core_searchindexentry_fts, rowid, title, body)
        VALUES ('delete', old.id, old.title, old.body);
        INSERT INTO core_searchindexentry_fts(rowid, title, body)
        VALUES (new.id, new.title, new.body);
    END
    """,
]

_SQLITE_REVERSE_STATEMENTS = [
    "DROP TRIGGER IF EXISTS core_searchindexentry_au",
    "DROP TRIGGER IF EXISTS core_searchindexentry_ad",
    "DROP TRIGGER IF EXISTS core_searchindexentry_ai",
    "DROP TABLE IF EXISTS core_searchindexentry_fts",
]

_MYSQL_FORWARD_SQL = (
    "ALTER TABLE core_searchindexentry "
    "ADD FULLTEXT INDEX core_searchindexentry_fulltext_idx (title, body)"
)
_MYSQL_REVERSE_SQL = "ALTER TABLE core_searchindexentry DROP INDEX core_searchindexentry_fulltext_idx"


def create_fulltext_index(apps: StateApps, schema_editor: BaseDatabaseSchemaEditor) -> None:
    vendor = schema_editor.connection.vendor
    if vendor == "sqlite":
        for statement in _SQLITE_FORWARD_STATEMENTS:
            schema_editor.execute(statement)
    elif vendor == "mysql":
        schema_editor.execute(_MYSQL_FORWARD_SQL)
    # vendorهای دیگر: بدون عملیات — fallback icontains در apps.core.search کافی است.


def drop_fulltext_index(apps: StateApps, schema_editor: BaseDatabaseSchemaEditor) -> None:
    vendor = schema_editor.connection.vendor
    if vendor == "sqlite":
        for statement in _SQLITE_REVERSE_STATEMENTS:
            schema_editor.execute(statement)
    elif vendor == "mysql":
        schema_editor.execute(_MYSQL_REVERSE_SQL)


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0002_sitesettings_media_searchindexentry_translation"),
    ]

    operations = [
        migrations.RunPython(create_fulltext_index, drop_fulltext_index),
    ]
