from sqlalchemy import Column, Integer, String, DateTime, Text
from datetime import datetime
from query.model.base import Base

class RequestLog(Base):
    __tablename__ = "query_logs"
    
    api_version = Column(String(20))                         
    endpoint = Column(String(255))                            # Endpoint path
    error_message = Column(Text)                              # Any error message
    http_method = Column(String(10))                          # GET, POST, etc
    query_params = Column(Text)                               # Raw query string
    request_id = Column(String(50))                           # Unique request UUID
    response_code = Column(Integer)                           # HTTP status code (e.g. 200)
    response_time_ms = Column(Integer)                        # Time in ms
    timestamp = Column(DateTime, default=datetime.utcnow)     # Time of request
    user_id = Column(String(50))                              # Who made the request
