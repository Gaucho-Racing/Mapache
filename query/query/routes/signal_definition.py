from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Query, Response, Header
from typing import Annotated
from loguru import logger
from fastapi.responses import JSONResponse
import pandas as pd
from query.service.auth import AuthService
import traceback

from query.service.signal_definition import get_all_signal_definitions, get_signal_definition_by_id, get_signal_definitions_by_vehicle_type
from query.service.token import create_token

router = APIRouter()

@router.get("/definitions")
async def get_signal_definitions(
    authorization: str = Header(None),
    vehicle_type: Annotated[str | None, Query()] = None,
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
        
        if vehicle_type:
            definitions = get_signal_definitions_by_vehicle_type(vehicle_type)
        else:
            definitions = get_all_signal_definitions()
        return JSONResponse(
            status_code=200,
            content=[definition.to_dict() for definition in definitions]
        )
    
    except Exception as e:
        logger.error(traceback.format_exc())
        return JSONResponse(
            status_code=500,
            content={
                "message": str(e),
            }
        )
    
@router.get("/definitions/{signal_definition_id}")
async def get_signal_definition(
    signal_definition_id: str,
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
        
        definition = get_signal_definition_by_id(signal_definition_id)
        if definition is None:
            return JSONResponse(
                status_code=404,
                content={
                    "message": "signal definition not found",
                }
            )
        return JSONResponse(
            status_code=200,
            content=definition.to_dict()
        )
    
    except Exception as e:
        logger.error(traceback.format_exc())
        return JSONResponse(
            status_code=500,
            content={
                "message": str(e),
            }
        )
