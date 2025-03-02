from fastapi import FastAPI  
import uvicorn
from query.config.config import Config
from query.database.connection import init_db

def main():
  init_db()
  app = FastAPI()
  @app.get("/") 
  async def main_route():     
    return {"message": "Hey, It is me Goku"}
  
  uvicorn.run(app, host="0.0.0.0", port=Config.PORT)

if __name__ == "__main__":
  main()