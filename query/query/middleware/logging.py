from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from query.database.connection import get_db
from query.model.log import RequestLog
import time
from datetime import datetime


class LogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = None
        try:
            start_time = time.time()
            timestamp = datetime.utcnow()
            # Proceed with the request
            response = await call_next(request)
            status_code = response.status_code
            process_time = time.time() - start_time
            response_time_ms = int(process_time * 1000)
        except Exception:
            # Catch unhandled exceptions (500s)
            status_code = 500
            raise  # Re-raise after logging

        # Log after getting response or error
        db = get_db()
        log = RequestLog(
            api_version = None, #api_version none for now
            endpoint = request.url.path,
            error_message = request.query_params.get("error_message"),
            http_method=request.method,
            query_params = request.query_params,
            request_id = request.query_params.get("request_id"),
            response_code=status_code,
            response_time_ms = response_time_ms,
            timestamp = timestamp, 
            user_id = request.query_params.get("user_id")
        )
        db.add(log)
        db.commit()
        db.close()

        return response
