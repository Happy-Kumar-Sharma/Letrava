"""Alembic environment.

Reads DATABASE_URL from app.config (which loads .env via pydantic-settings).
Targets only the app schema — Supabase Auth's `auth.users` lives in its own
schema and is managed by Supabase, not by us.
"""
from __future__ import annotations

import os
import sys
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

# Make the backend root importable so `from app...` works.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings  # noqa: E402
from app.db import Base  # noqa: E402
from app import models  # noqa: F401, E402  # register models on Base.metadata

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Inject DATABASE_URL from settings so Alembic uses the same DSN as the app.
# Use the direct (5432) connection in .env for migrations, not the pooler.
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

target_metadata = Base.metadata


def include_object(obj, name, type_, reflected, compare_to):
    # Only manage the public schema. Skip Supabase-managed schemas.
    if hasattr(obj, "schema") and obj.schema not in (None, "public"):
        return False
    return True


def run_migrations_offline() -> None:
    context.configure(
        url=config.get_main_option("sqlalchemy.url"),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_object=include_object,
        compare_type=True,
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_object=include_object,
            compare_type=True,
            compare_server_default=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
