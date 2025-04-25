from pydantic import BaseModel
from typing import List, Dict

class DataInstance(BaseModel):
    class Config:
        extra = "allow"

class Metadata(BaseModel):
    num_rows: int
    query_latency: int
    max_rows_lost: int
    avg_rows_lost: float
    total_nans: int
    average_nans: float

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

class InvalidTimestampError(Exception):
    pass

class TripNotFoundError(Exception):
    pass

class LapNotFoundError(Exception):
    pass

class VehicleNotFoundError(Exception):
    pass