from pydantic import BaseModel
from typing import List, Dict

class DataInstance(BaseModel):
    class Config:
        extra = "allow"

class Data(BaseModel):
    data: List[DataInstance]

class Metadata(BaseModel):
    signal_count: int
    total_data_points: int
    processing_time_ms: int

class ResponseModel(BaseModel):
    status: str
    timestamp: str
    request_id: str
    data: List[Data]
    errors: Dict[str, str]
    metadata: Metadata