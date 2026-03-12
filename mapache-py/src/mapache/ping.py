from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Ping:
    vehicle_id: str = ""
    ping: int = 0
    pong: int = 0
    latency: int = 0
