from fastapi import FastAPI  
from query.service.query import merge_to_largest, merge_to_largest_fill, query_signal, analyze_signal_df, raw_merge_df, resample_ffill
import uvicorn
from query.config.config import Config
from query.database.connection import init_db
from query.routes import query

#for testing
from query.service.query import query_signals, query_trip, merge_to_smallest, df_to_json_data

def create_app():
    app = FastAPI(
        title="FastAPI",
        description="API Documentation",
        version="0.0."
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
  init_db()
  app = create_app()
  
  uvicorn.run(app, host="0.0.0.0", port=Config.PORT)


#print(query_signals(['mobile_speed','acu_cell1_temp'], '2024-11-10 22:38:27', '2024-11-10 22:39:34'))


if __name__ == "__main__":
  main()
