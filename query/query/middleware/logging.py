from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from query.database.connection import get_db
from query.model.log import RequestLog

class LogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = None
        try:
            # Proceed with the request
            response = await call_next(request)
            status_code = response.status_code
        except Exception:
            # Catch unhandled exceptions (500s)
            status_code = 500
            raise  # Re-raise after logging

        # Log after getting response or error
        db = get_db()
        log = RequestLog(
            method=request.method,
            path=request.url.path,
            status_code=status_code,
        )
        db.add(log)
        db.commit()
        db.close()

        return response
