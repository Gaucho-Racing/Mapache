from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from query.config.config import Config
from query.database.connection import init_db
from query.routes import ping, query, signal_definition, token
from query.service.auth import AuthService
from query.service.rincon import init_rincon

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    init_rincon()
    AuthService.configure(
        jwks_url=Config.SENTINEL_JWKS_URL,
        issuer="https://sso.gauchoracing.com",
        audience=Config.SENTINEL_CLIENT_ID
    )
    yield

def create_app():
    app = FastAPI(
        title="Gaucho Racing Query",
        description="API Documentation",
        version=Config.VERSION,
        docs_url="/query/docs",
        redoc_url="/query/redoc",
        lifespan=lifespan
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(
        ping.router,
        prefix="/query",
        tags=["Ping"]
    )

    app.include_router(
        query.router,
        prefix="/query",
        tags=["Query"]
    )

    app.include_router(
        signal_definition.router,
        prefix="/query",
        tags=["Signal Definition"]
    )

    app.include_router(
        token.router,
        prefix="/query",
        tags=["Token"]
    )

    return app

def main():
    app = create_app()
    uvicorn.run(app, host="0.0.0.0", port=Config.PORT)

if __name__ == "__main__":
    main()
