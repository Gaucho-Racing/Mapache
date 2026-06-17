from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import math
        
class Metadata(BaseModel):
    model_config = {
        "arbitrary_types_allowed": True
    }
    
    num_rows: Optional[int] = None
    query_latency: Optional[int] = None
    merge_strategy: Optional[str] = None
    merge_tolerance: Optional[int] = None
    num_signals: Optional[int] = None
    signal_names: Optional[List[str]] = None
    
    # Time-related metadata
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    total_duration: Optional[float] = None
    
    # Data quality metrics
    max_gap_duration: Optional[float] = None
    min_gap_duration: Optional[float] = None
    avg_gap_duration: Optional[float] = None
    max_nan_count: Optional[int] = None
    min_nan_count: Optional[int] = None
    avg_nan_count: Optional[float] = None
    max_row_delta: Optional[int] = None
    min_row_delta: Optional[int] = None
    avg_row_delta: Optional[float] = None

    def __str__(self) -> str:
        """Returns a nicely formatted string representation of the metadata."""
        def format_value(value, is_float=False):
            if value is None:
                return "N/A"
            if is_float:
                return f"{value:.2f}"
            return str(value)

        sections = [
            ("Basic Info", [
                f"Number of rows: {format_value(self.num_rows)}",
                f"Query latency: {format_value(self.query_latency)}ms",
                f"Merge strategy: {format_value(self.merge_strategy)}",
                f"Merge tolerance: {format_value(self.merge_tolerance)}ms",
                f"Number of signals: {format_value(self.num_signals)}",
                "Signal names: " + (", ".join(self.signal_names) if self.signal_names else "N/A")
            ]),
            ("Time Range", [
                f"Start time: {format_value(self.start_time)}",
                f"End time: {format_value(self.end_time)}",
                f"Total duration: {format_value(self.total_duration, True)}ms"
            ]),
            ("Gap Statistics (ms)", [
                f"Max gap: {format_value(self.max_gap_duration, True)}",
                f"Min gap: {format_value(self.min_gap_duration, True)}",
                f"Avg gap: {format_value(self.avg_gap_duration, True)}"
            ]),
            ("NaN Statistics", [
                f"Max NaNs: {format_value(self.max_nan_count)}",
                f"Min NaNs: {format_value(self.min_nan_count)}",
                f"Avg NaNs: {format_value(self.avg_nan_count, True)}"
            ]),
            ("Row Delta Statistics", [
                f"Max delta: {format_value(self.max_row_delta)}",
                f"Min delta: {format_value(self.min_row_delta)}",
                f"Avg delta: {format_value(self.avg_row_delta, True)}"
            ]),
        ]

        sections = [
            (name, items) for name, items in sections
            if any("N/A" not in item for item in items)
        ]

        output = []
        for section_name, items in sections:
            output.append(f"\n{section_name}:")
            output.extend(f"  {item}" for item in items)
        
        return "\n".join(output) if output else "No metadata available"
    
    def to_dict(self):
        def safe_int_convert(value):
            if value is None or math.isnan(value):
                return None
            return int(value)

        return {
            "num_rows": safe_int_convert(self.num_rows),
            "query_latency": safe_int_convert(self.query_latency),
            "merge_strategy": self.merge_strategy,
            "merge_tolerance": safe_int_convert(self.merge_tolerance),
            "num_signals": safe_int_convert(self.num_signals),
            "signal_names": self.signal_names,
            "start_time": self.start_time.isoformat() + "Z" if self.start_time else None,
            "end_time": self.end_time.isoformat() + "Z" if self.end_time else None,
            "total_duration": safe_int_convert(self.total_duration),
            "max_gap_duration": safe_int_convert(self.max_gap_duration),
            "min_gap_duration": safe_int_convert(self.min_gap_duration),
            "avg_gap_duration": safe_int_convert(self.avg_gap_duration),
            "max_nan_count": safe_int_convert(self.max_nan_count),
            "min_nan_count": safe_int_convert(self.min_nan_count),
            "avg_nan_count": safe_int_convert(self.avg_nan_count),
            "max_row_delta": safe_int_convert(self.max_row_delta),
            "min_row_delta": safe_int_convert(self.min_row_delta),
            "avg_row_delta": safe_int_convert(self.avg_row_delta)
        }

class QueryWarning():
    def __init__(self):
        self.warnings = []
    def add_warning(self, warning: str):
        self.warnings.append(str(warning))
    def get_warnings(self):
        return self.warnings