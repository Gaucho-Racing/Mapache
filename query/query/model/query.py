from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
        
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
        return {
            "num_rows": int(self.num_rows) if self.num_rows is not None else None,
            "query_latency": int(self.query_latency) if self.query_latency is not None else None,
            "merge_strategy": self.merge_strategy,
            "merge_tolerance": int(self.merge_tolerance) if self.merge_tolerance is not None else None,
            "num_signals": int(self.num_signals) if self.num_signals is not None else None,
            "signal_names": self.signal_names,
            "start_time": self.start_time.isoformat() + "Z" if self.start_time else None,
            "end_time": self.end_time.isoformat() + "Z" if self.end_time else None,
            "total_duration": int(self.total_duration) if self.total_duration is not None else None,
            "max_gap_duration": int(self.max_gap_duration) if self.max_gap_duration is not None else None,
            "min_gap_duration": int(self.min_gap_duration) if self.min_gap_duration is not None else None,
            "avg_gap_duration": int(self.avg_gap_duration) if self.avg_gap_duration is not None else None,
            "max_nan_count": int(self.max_nan_count) if self.max_nan_count is not None else None,
            "min_nan_count": int(self.min_nan_count) if self.min_nan_count is not None else None,
            "avg_nan_count": int(self.avg_nan_count) if self.avg_nan_count is not None else None,
            "max_row_delta": int(self.max_row_delta) if self.max_row_delta is not None else None,
            "min_row_delta": int(self.min_row_delta) if self.min_row_delta is not None else None,
            "avg_row_delta": int(self.avg_row_delta) if self.avg_row_delta is not None else None,
        }

class QueryWarning():
    def __init__(self):
        self.warnings = []
    def add_warning(self, warning: str):
        self.warnings.append(str(warning))
    def get_warnings(self):
        return self.warnings