from __future__ import annotations

import struct


def big_endian_unsigned_int_to_binary_string(num: int, num_bytes: int) -> str:
    b = big_endian_unsigned_int_to_binary(num, num_bytes)
    return "".join(f"{byte:08b}" for byte in b)


def big_endian_unsigned_int_to_binary(num: int, num_bytes: int) -> bytes:
    if num < 0:
        raise ValueError("cannot convert negative number to binary")
    if num_bytes < 1:
        raise ValueError("cannot convert to binary with less than 1 byte")
    if num_bytes < 8 and num >= (1 << (num_bytes * 8)):
        raise ValueError(f"number is too large to fit in {num_bytes} bytes")

    if num_bytes == 1:
        return struct.pack(">B", num)
    elif num_bytes == 2:
        return struct.pack(">H", num)
    elif num_bytes == 4:
        return struct.pack(">I", num)
    elif num_bytes == 8:
        return struct.pack(">Q", num)

    result = bytearray(num_bytes)
    for i in range(num_bytes):
        result[i] = (num >> ((num_bytes - i - 1) * 8)) & 0xFF
    return bytes(result)


def big_endian_signed_int_to_binary_string(num: int, num_bytes: int) -> str:
    b = big_endian_signed_int_to_binary(num, num_bytes)
    return "".join(f"{byte:08b}" for byte in b)


def big_endian_signed_int_to_binary(num: int, num_bytes: int) -> bytes:
    if num_bytes < 1:
        raise ValueError("cannot convert to binary with less than 1 byte")
    min_value = -(1 << ((num_bytes * 8) - 1))
    max_value = (1 << ((num_bytes * 8) - 1)) - 1
    if num < min_value or num > max_value:
        raise ValueError(f"number is too large to fit in {num_bytes} bytes")

    if num_bytes == 1:
        return struct.pack(">b", num)
    elif num_bytes == 2:
        return struct.pack(">h", num)
    elif num_bytes == 4:
        return struct.pack(">i", num)
    elif num_bytes == 8:
        return struct.pack(">q", num)

    if num < 0:
        num = (1 << (num_bytes * 8)) + num
    result = bytearray(num_bytes)
    for i in range(num_bytes):
        result[i] = (num >> ((num_bytes - i - 1) * 8)) & 0xFF
    return bytes(result)


def big_endian_bytes_to_unsigned_int(data: bytes | bytearray) -> int:
    result = 0
    for i, b in enumerate(data):
        result += b << ((len(data) - i - 1) * 8)
    return result


def big_endian_bytes_to_signed_int(data: bytes | bytearray) -> int:
    n = len(data)
    if n == 1:
        return int(struct.unpack(">b", data)[0])
    elif n == 2:
        return int(struct.unpack(">h", data)[0])
    elif n == 4:
        return int(struct.unpack(">i", data)[0])
    elif n == 8:
        return int(struct.unpack(">q", data)[0])

    # fallback for arbitrary byte lengths
    result = 0
    if data[0] >= 128:
        result = -1 << ((n - 1) * 8)
    for i, b in enumerate(data):
        result += b << ((n - i - 1) * 8)
    return result


def little_endian_unsigned_int_to_binary_string(num: int, num_bytes: int) -> str:
    b = little_endian_unsigned_int_to_binary(num, num_bytes)
    return "".join(f"{byte:08b}" for byte in b)


def little_endian_unsigned_int_to_binary(num: int, num_bytes: int) -> bytes:
    if num < 0:
        raise ValueError("cannot convert negative number to binary")
    if num_bytes < 1:
        raise ValueError("cannot convert to binary with less than 1 byte")
    if num_bytes < 8 and num >= (1 << (num_bytes * 8)):
        raise ValueError(f"number is too large to fit in {num_bytes} bytes")

    if num_bytes == 1:
        return struct.pack("<B", num)
    elif num_bytes == 2:
        return struct.pack("<H", num)
    elif num_bytes == 4:
        return struct.pack("<I", num)
    elif num_bytes == 8:
        return struct.pack("<Q", num)

    result = bytearray(num_bytes)
    for i in range(num_bytes):
        result[i] = (num >> (i * 8)) & 0xFF
    return bytes(result)


def little_endian_signed_int_to_binary_string(num: int, num_bytes: int) -> str:
    b = little_endian_signed_int_to_binary(num, num_bytes)
    return "".join(f"{byte:08b}" for byte in b)


def little_endian_signed_int_to_binary(num: int, num_bytes: int) -> bytes:
    if num_bytes < 1:
        raise ValueError("cannot convert to binary with less than 1 byte")
    min_value = -(1 << ((num_bytes * 8) - 1))
    max_value = (1 << ((num_bytes * 8) - 1)) - 1
    if num < min_value or num > max_value:
        raise ValueError(f"number is too large to fit in {num_bytes} bytes")

    if num_bytes == 1:
        return struct.pack("<b", num)
    elif num_bytes == 2:
        return struct.pack("<h", num)
    elif num_bytes == 4:
        return struct.pack("<i", num)
    elif num_bytes == 8:
        return struct.pack("<q", num)

    if num < 0:
        num = (1 << (num_bytes * 8)) + num
    result = bytearray(num_bytes)
    for i in range(num_bytes):
        result[i] = (num >> (i * 8)) & 0xFF
    return bytes(result)


def little_endian_bytes_to_unsigned_int(data: bytes | bytearray) -> int:
    result = 0
    for i, b in enumerate(data):
        result += b << (i * 8)
    return result


def little_endian_bytes_to_signed_int(data: bytes | bytearray) -> int:
    n = len(data)
    if n == 1:
        return int(struct.unpack("<b", data)[0])
    elif n == 2:
        return int(struct.unpack("<h", data)[0])
    elif n == 4:
        return int(struct.unpack("<i", data)[0])
    elif n == 8:
        return int(struct.unpack("<q", data)[0])

    # fallback for arbitrary byte lengths
    result = 0
    if data[-1] >= 128:
        result = -1 << ((n - 1) * 8)
    for i, b in enumerate(data):
        result += b << (i * 8)
    return result
