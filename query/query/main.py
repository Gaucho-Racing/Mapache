from fastapi import FastAPI  
from query.service.query import merge_to_largest, merge_to_largest_fill, query_signal, analyze_signal_df, raw_merge_df, resample_ffill
import uvicorn
from query.config.config import Config
from query.database.connection import init_db

def main():
  init_db()
  app = FastAPI()
  
  uvicorn.run(app, host="0.0.0.0", port=Config.PORT)

if __name__ == "__main__":
  main()