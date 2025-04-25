from fastapi import FastAPI  
import uvicorn
from query.config.config import Config
from query.database.connection import init_db
from query.routes import query, ping

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
  print(Config.PORT)
  app = create_app()
  uvicorn.run(app, host="0.0.0.0", port=Config.PORT)

if __name__ == "__main__":
  main()
