from fastapi import FastAPI  
import uvicorn
from query.config.config import Config
from query.database.connection import init_db
from query.routes import ping, query
from query.service.query import merge_to_largest, query_signals, merge_to_smallest
from query.service.rincon import register_rincon

def create_app():
    app = FastAPI(
        title="Gaucho Racing Query",
        description="API Documentation",
        version=Config.VERSION
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
  register_rincon()
  app = create_app()
  uvicorn.run(app, host="0.0.0.0", port=Config.PORT)

if __name__ == "__main__":
  main()
