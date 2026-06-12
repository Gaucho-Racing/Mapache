from contextlib import contextmanager

from sqlalchemy import create_engine
from sqlalchemy.orm import scoped_session, sessionmaker

from query.config.config import Config
from query.model.base import Base

DATABASE_URL = Config.get_database_url()

db_session = None


def init_db():
    """Initialize the Postgres session for operational tables."""
    if not Config.DATABASE_HOST:
        raise ValueError("DATABASE_HOST is not set")
    if not Config.DATABASE_PORT:
        raise ValueError("DATABASE_PORT is not set")
    if not Config.DATABASE_USER:
        raise ValueError("DATABASE_USER is not set")
    if not Config.DATABASE_PASSWORD:
        raise ValueError("DATABASE_PASSWORD is not set")
    if not Config.DATABASE_NAME:
        raise ValueError("DATABASE_NAME is not set")

    global db_session
    engine = create_engine(DATABASE_URL)
    db_session = scoped_session(
        sessionmaker(
            autocommit=False,
            autoflush=False,
            expire_on_commit=False,
            bind=engine,
        )
    )

    # Side-effect import so all SQLAlchemy models register on Base.metadata
    # before create_all runs.
    from query.model.signal_definition import SignalDefinition  # noqa: F401
    from query.model.token import QueryToken  # noqa: F401

    Base.metadata.create_all(bind=engine)
    print("Postgres initialized")


@contextmanager
def get_db():
    if not db_session:
        raise ValueError("Database session is not initialized")

    try:
        yield db_session
        db_session.commit()
    except Exception:
        db_session.rollback()
        raise
    finally:
        db_session.remove()


def shutdown_session(exception=None):
    if db_session:
        db_session.remove()
