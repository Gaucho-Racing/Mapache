from query.model.base import Base
from sqlalchemy.orm import sessionmaker

import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_scoped_session
from query.config.config import Config

DATABASE_URL = Config.get_database_url()

db_session = None

async def init_db():
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
        engine = create_async_engine(DATABASE_URL)
        db_session = async_scoped_session(
            sessionmaker(
                autocommit=False,
                autoflush=False,
                bind=engine,
                class_=AsyncSession,
            ),
            scopefunc=asyncio.current_task,
        )
        
        from query.model.log import QueryLog
        from query.model.token import QueryToken
        
        # Create all tables
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("Database initialized")

def init_test_db():
    global db_session
    engine = create_async_engine(DATABASE_URL)
    db_session = async_scoped_session(
        sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=engine,
            class_=AsyncSession,
        ),
        scopefunc=asyncio.current_task,
    )

def get_db():
    """Get the database session"""
    if not db_session:
        raise ValueError("Database session is not initialized")
    return db_session() # get one async session not the whole object!!!!
        
def shutdown_session(exception=None):
    """Remove the session at the end of request"""
    db_session.remove()
    
