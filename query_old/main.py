from fastapi import FastAPI
from routes import query  # assuming you'll have multiple route modules
import uvicorn

#propper error handling. and make sure db is "on"

def create_app():
    app = FastAPI(
        title="FastAPI",
        description="API Documentation",
        version="1.0.0"
    )
    
    app.include_router(
        query.router,
        prefix="/items",
        tags=["Items"]  # This will group the endpoints in Swagger UI
    )
    
    @app.get("/", tags=["Root"])
    def index():
        return {"message": "Welcome to the API"}
    
    return app

app = create_app()

if __name__ == '__main__':
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=True)

