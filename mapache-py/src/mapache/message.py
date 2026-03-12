from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field
from enum import IntEnum

from mapache.binary import (
    big_endian_bytes_to_signed_int,
    big_endian_bytes_to_unsigned_int,
    big_endian_signed_int_to_binary,
    big_endian_unsigned_int_to_binary,
    little_endian_bytes_to_signed_int,
    little_endian_bytes_to_unsigned_int,
    little_endian_signed_int_to_binary,
    little_endian_unsigned_int_to_binary,
)
from mapache.signal import Signal


class SignMode(IntEnum):
    UNSIGNED = 0
    SIGNED = 1


class Endian(IntEnum):
    LITTLE_ENDIAN = 0
    BIG_ENDIAN = 1


ExportSignalFunc = Callable[["Field"], list[Signal]]


def _default_signal_export(f: Field) -> list[Signal]:
    return [Signal(name=f.name, value=float(f.value), raw_value=f.value)]


@dataclass
class Field:
    name: str = ""
    data: bytes = b""
    size: int = 0
    sign: SignMode = SignMode.UNSIGNED
    endian: Endian = Endian.BIG_ENDIAN
    value: int = 0
    export_signal_func: ExportSignalFunc | None = None

    def decode(self) -> Field:
        if self.sign == SignMode.SIGNED and self.endian == Endian.BIG_ENDIAN:
            self.value = big_endian_bytes_to_signed_int(self.data)
        elif self.sign == SignMode.SIGNED and self.endian == Endian.LITTLE_ENDIAN:
            self.value = little_endian_bytes_to_signed_int(self.data)
        elif self.sign == SignMode.UNSIGNED and self.endian == Endian.BIG_ENDIAN:
            self.value = big_endian_bytes_to_unsigned_int(self.data)
        elif self.sign == SignMode.UNSIGNED and self.endian == Endian.LITTLE_ENDIAN:
            self.value = little_endian_bytes_to_unsigned_int(self.data)
        return self

    def encode(self) -> Field:
        if self.sign == SignMode.SIGNED and self.endian == Endian.BIG_ENDIAN:
            self.data = big_endian_signed_int_to_binary(self.value, self.size)
        elif self.sign == SignMode.SIGNED and self.endian == Endian.LITTLE_ENDIAN:
            self.data = little_endian_signed_int_to_binary(self.value, self.size)
        elif self.sign == SignMode.UNSIGNED and self.endian == Endian.BIG_ENDIAN:
            self.data = big_endian_unsigned_int_to_binary(self.value, self.size)
        elif self.sign == SignMode.UNSIGNED and self.endian == Endian.LITTLE_ENDIAN:
            self.data = little_endian_unsigned_int_to_binary(self.value, self.size)
        else:
            raise ValueError("invalid sign or endian")
        return self

    def check_bit(self, bit: int) -> int:
        byte_index = bit // 8
        bit_position = 7 - (bit % 8)
        if byte_index >= len(self.data):
            return 0
        return (self.data[byte_index] >> bit_position) & 1

    def export_signals(self) -> list[Signal]:
        if self.export_signal_func is None:
            return _default_signal_export(self)
        return self.export_signal_func(self)


def new_field(
    name: str,
    size: int,
    sign: SignMode,
    endian: Endian,
    export_signal_func: ExportSignalFunc | None = None,
) -> Field:
    return Field(name=name, size=size, sign=sign, endian=endian, export_signal_func=export_signal_func)


@dataclass
class Message:
    fields: list[Field] = field(default_factory=list)

    def length(self) -> int:
        return len(self.fields)

    def size(self) -> int:
        return sum(f.size for f in self.fields)

    def fill_from_bytes(self, data: bytes | bytearray) -> None:
        if len(data) != self.size():
            raise ValueError(f"invalid data length, expected {self.size()} bytes, got {len(data)}")
        counter = 0
        for i, f in enumerate(self.fields):
            f.data = bytes(data[counter : counter + f.size])
            counter += f.size
            self.fields[i] = f.decode()

    def fill_from_ints(self, ints: list[int]) -> None:
        if len(ints) != self.length():
            raise ValueError(f"invalid ints length, expected {self.length()}, got {len(ints)}")
        for i, f in enumerate(self.fields):
            f.value = ints[i]
            self.fields[i] = f.encode()

    def export_signals(self) -> list[Signal]:
        signals: list[Signal] = []
        for f in self.fields:
            signals.extend(f.export_signals())
        return signals
