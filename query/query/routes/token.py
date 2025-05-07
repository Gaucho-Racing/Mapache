from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Query, Response, Header
from typing import Annotated
from loguru import logger
from fastapi.responses import JSONResponse
import pandas as pd
from query.service.auth import AuthService
from query.service.query import query_signals, merge_to_smallest, merge_to_largest
import numpy as np
import traceback

from query.service.token import create_token, get_token_by_id, validate_token

router = APIRouter()

@router.post("/token")
async def request_token(
    authorization: str = Header(None),
):
    try:
        if "Bearer " in authorization:
            token = authorization.split("Bearer ")[1]
            user_id = AuthService.get_user_id_from_token(token)
        else:
            return JSONResponse(
                status_code=401,
                content={
                    "message": "you are not authorized to access this resource",
                }
            )
        
        logger.info(f"Successfully authenticated user: {user_id}")
        
        token = create_token(user_id=user_id, expires_at=datetime.now(timezone.utc) + timedelta(minutes=5))
        return JSONResponse(
            status_code=200,
            content=token.to_dict()
        )
    
    except Exception as e:
        logger.error(traceback.format_exc())
        return JSONResponse(
            status_code=500,
            content={
                "message": str(e),
            }
        )