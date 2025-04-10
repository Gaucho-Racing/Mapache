from pydantic import BaseModel
from typing import List, Dict

class DataInstance(BaseModel):
    class Config:
        extra = "allow"

class Data(BaseModel):
    data: List[DataInstance]

class Metadata(BaseModel):
    nrows: int
    processing_time_ms: int
    max_rows_lost: int
    avg_rows_lost: float

class warning(BaseModel):
    pass

class ResponseModel(BaseModel):
    timestamp: str
    data: List[DataInstance]
    metadata: Metadata
    #warnings: warning