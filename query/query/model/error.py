from enum import Enum
from typing import Optional, Any

class QueryErrorCode(Enum):
    INVALID_VEHICLE = "INVALID_VEHICLE"
    INVALID_SIGNALS = "INVALID_SIGNALS"
    INVALID_TRIP = "INVALID_TRIP"
    MISSING_TIMESTAMPS = "MISSING_TIMESTAMPS"
    DATABASE_ERROR = "DATABASE_ERROR"

class QueryError:
    def __init__(
        self, 
        code: QueryErrorCode, 
        message: str, 
        details: Optional[Any] = None,
        status_code: int = 400
    ):
        self.code = code
        self.message = message
        self.details = details
        self.status_code = status_code

    def raise_http_exception(self):
        from fastapi import HTTPException
        error_response = {
            "code": self.code.value,
            "message": self.message
        }
        if self.details:
            error_response["details"] = self.details
        raise HTTPException(
            status_code=self.status_code,
            detail=error_response
        )