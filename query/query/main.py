from fastapi import FastAPI  
import requests
import uvicorn
from query.config.config import Config
from query.database.connection import init_db
from query.routes import ping, query
from query.service.auth import AuthService
from query.service.rincon import RinconService

def create_app():
    app = FastAPI(
        title="Gaucho Racing Query",
        description="API Documentation",
        version=Config.VERSION,
        docs_url="/query/docs",
        redoc_url="/query/redoc"
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

    # app.add_middleware(LogMiddleware)
    
    return app

def main():
  init_db()
  RinconService.register()
  AuthService.configure(
    jwks_url=Config.SENTINEL_JWKS_URL,
    issuer="https://sso.gauchoracing.com",
    audience=Config.SENTINEL_CLIENT_ID
  )
  app = create_app()
  uvicorn.run(app, host="0.0.0.0", port=Config.PORT)

if __name__ == "__main__":
  main()
