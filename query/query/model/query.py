from pydantic import BaseModel
from typing import List, Dict

class DataInstance(BaseModel):
    class Config:
        extra = "allow"

class Metadata(BaseModel):
    num_rows: int
    processing_time_ms: int
    max_rows_lost: float
    avg_rows_lost: float
    #nan_counts: int
    total_nans: int

class QueryWarning():
    def __init__(self):
        self.warnings = []
    def add_warning(self, warning: str):
        self.warnings.append(str(warning))
    def get_warnings(self):
        return self.warnings

class ResponseModel(BaseModel):
    timestamp: str
    data: List[DataInstance]
    metadata: Metadata
    warnings: list[str]

class TripNotFoundError(Exception):
    pass

class LapNotFoundError(Exception):
    pass 