from query.model.base import Base
from sqlalchemy import create_engine
from sqlalchemy.orm import scoped_session, sessionmaker
from query.config.config import Config
from contextlib import contextmanager

DATABASE_URL = Config.get_database_url()

db_session = None

def init_db():
    """Initialize the database session"""
    if not Config.DATABASE_HOST:
        raise ValueError("DATABASE_HOST is not set")
    elif not Config.DATABASE_PORT:
        raise ValueError("DATABASE_PORT is not set")
    elif not Config.DATABASE_USER:
        raise ValueError("DATABASE_USER is not set")
    elif not Config.DATABASE_PASSWORD:
        raise ValueError("DATABASE_PASSWORD is not set")
    elif not Config.DATABASE_NAME:
        raise ValueError("DATABASE_NAME is not set")
    else:
        global db_session
        engine = create_engine(DATABASE_URL)
        db_session = scoped_session(
            sessionmaker(
                autocommit=False,
                autoflush=False,
                expire_on_commit=False,
                bind=engine
            )
        )
        
        from query.model.log import QueryLog
        from query.model.token import QueryToken
        from query.model.signal_definition import SignalDefinition
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        print("Database initialized")

def init_test_db():
    global db_session
    engine = create_engine(DATABASE_URL)
    db_session = scoped_session(
        sessionmaker(
            autocommit=False,
            autoflush=False,
            expire_on_commit=False,
            bind=engine
        )
    )

@contextmanager
def get_db():
    """Get the database session with proper error handling"""
    if not db_session:
        raise ValueError("Database session is not initialized")
    
    try:
        yield db_session
        db_session.commit()
    except Exception as e:
        db_session.rollback()
        raise e
    finally:
        db_session.remove()

def shutdown_session(exception=None):
    """Remove the session at the end of request"""
    if db_session:
        db_session.remove()