from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from query.database.connection import get_db
from query.model.log import RequestLog
from loguru import logger
import time

class LogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        # Extract request details
        method = request.method
        path = request.url.path
        
        try:
            # Proceed with the request
            response = await call_next(request)
            status_code = response.status_code
            
            # Calculate processing time
            process_time = (time.time() - start_time) * 1000
            
            # Log successful requests
            logger.info(
                f"{method} {path} {status_code} - {process_time:.2f}ms",
                request={
                    "method": method,
                    "path": path,
                    "status_code": status_code,
                    "process_time_ms": process_time
                }
            )
            
        except Exception as e:
            # Calculate processing time for failed requests
            process_time = (time.time() - start_time) * 1000
            status_code = 500
            
            # Log error with exception details
            logger.error(
                f"{method} {path} {status_code} - {process_time:.2f}ms - {str(e)}",
                request={
                    "method": method,
                    "path": path,
                    "status_code": status_code,
                    "process_time_ms": process_time
                },
                error=str(e),
                exc_info=True  # Include stack trace
            )
            raise  # Re-raise the exception

        finally:
            # Log to database
            try:
                db = get_db()
                log = RequestLog(
                    method=method,
                    path=path,
                    status_code=status_code,
                )
                db.add(log)
                db.commit()
                db.close()
            except Exception as e:
                logger.error(f"Failed to log to database: {str(e)}", exc_info=True)

        return response
