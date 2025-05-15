from fastapi import FastAPI  
from fastapi.middleware.cors import CORSMiddleware
import requests
import uvicorn
from query.config.config import Config
from query.database.connection import init_db
from query.routes import ping, query, signal_definition, token
from query.service.auth import AuthService
from query.service.rincon import RinconService
from query.service.trip import get_all_trips, get_trip_by_id
from query.service.vehicle import get_all_vehicles, get_vehicle_by_id

def create_app():
    app = FastAPI(
        title="Gaucho Racing Query",
        description="API Documentation",
        version=Config.VERSION,
        docs_url="/query/docs",
        redoc_url="/query/redoc"
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
