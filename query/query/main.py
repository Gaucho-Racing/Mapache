from fastapi import FastAPI  
import uvicorn
from query.config.config import Config
from query.database.connection import init_db
from query.routes import query, ping
from query.service.query import query_signals
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
  result = query_signals(['vdm_speed'])
  print(len(result[0]))
  print(result)
  result = query_signals(['vdm_speed'], None, '2024-11-09 22:57:41.00')
  print(len(result[0]))
  print(result)

#   app = create_app()
#   uvicorn.run(app, host="0.0.0.0", port=Config.PORT)

if __name__ == "__main__":
  main()
