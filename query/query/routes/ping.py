from fastapi import APIRouter
from query.config.config import Config

router = APIRouter()

@router.get("/ping")
async def ping():
    return {"message": f"Query v{Config.VERSION} is online!"}