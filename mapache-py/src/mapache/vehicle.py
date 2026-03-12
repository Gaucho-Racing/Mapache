from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class Vehicle:
    id: str = ""
    name: str = ""
    description: str = ""
    type: str = ""
    upload_key: int = 0
    updated_at: datetime = field(default_factory=lambda: datetime.min)
    created_at: datetime = field(default_factory=lambda: datetime.min)


@dataclass
class Session:
    id: str = ""
    vehicle_id: str = ""
    name: str = ""
    description: str = ""
    start_time: datetime = field(default_factory=lambda: datetime.min)
    end_time: datetime = field(default_factory=lambda: datetime.min)
    markers: list[Marker] = field(default_factory=list)
    segments: list[Segment] = field(default_factory=list)


@dataclass
class Marker:
    id: str = ""
    session_id: str = ""
    name: str = ""
    timestamp: datetime = field(default_factory=lambda: datetime.min)


@dataclass
class Segment:
    number: int = 0
    start_time: datetime = field(default_factory=lambda: datetime.min)
    end_time: datetime = field(default_factory=lambda: datetime.min)


def derive_segments(session: Session) -> list[Segment]:
    if not session.markers:
        return [Segment(number=1, start_time=session.start_time, end_time=session.end_time)]

    sorted_markers = sorted(session.markers, key=lambda m: m.timestamp)

    segments: list[Segment] = []
    segments.append(Segment(number=1, start_time=session.start_time, end_time=sorted_markers[0].timestamp))
    for i in range(len(sorted_markers) - 1):
        segments.append(
            Segment(
                number=i + 2,
                start_time=sorted_markers[i].timestamp,
                end_time=sorted_markers[i + 1].timestamp,
            )
        )
    segments.append(
        Segment(
            number=len(sorted_markers) + 1,
            start_time=sorted_markers[-1].timestamp,
            end_time=session.end_time,
        )
    )

    return segments
