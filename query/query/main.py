from fastapi import FastAPI  
from query.service.query import merge_to_largest, merge_to_largest_fill, query_signal, analyze_signal_df, raw_merge_df, resample_ffill
import uvicorn
from query.config.config import Config
from query.database.connection import init_db
from query.routes import query

def create_app():
    app = FastAPI(
        title="Gaucho Racing Query",
        description="API Documentation",
        version="0.1.0.0"
    )
    
    app.include_router(
        query.router,
        prefix="/query",
        tags=["Query"]  # This will group the endpoints in Swagger UI
    )
    
    @app.get("/", tags=["Root"])
    def index():
        return {"message": "Welcome to the API"}
    
    return app

def main():
  init_db() # should this be here?
  app = create_app()
  
  uvicorn.run(app, host="0.0.0.0", port=Config.PORT)

if __name__ == "__main__":
  main()
