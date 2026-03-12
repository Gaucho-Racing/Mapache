import pytest

from mapache import Endian, Field, Message, Signal, SignMode, new_field


def _ecu_status_message() -> Message:
    return Message(
        fields=[
            new_field("ecu_state", 1, SignMode.UNSIGNED, Endian.BIG_ENDIAN),
            new_field(
                "ecu_status_flags",
                3,
                SignMode.UNSIGNED,
                Endian.BIG_ENDIAN,
                lambda f: [
                    Signal(
                        name=name,
                        value=float(f.check_bit(i)),
                        raw_value=f.check_bit(i),
                    )
                    for i, name in enumerate(
                        [
                            "ecu_status_acu",
                            "ecu_status_inv_one",
                            "ecu_status_inv_two",
                            "ecu_status_inv_three",
                            "ecu_status_inv_four",
                            "ecu_status_fan_one",
                            "ecu_status_fan_two",
                            "ecu_status_fan_three",
                            "ecu_status_fan_four",
                            "ecu_status_fan_five",
                            "ecu_status_fan_six",
                            "ecu_status_fan_seven",
                            "ecu_status_fan_eight",
                            "ecu_status_dash",
                            "ecu_status_steering",
                        ]
                    )
                ],
            ),
            new_field(
                "ecu_maps",
                1,
                SignMode.UNSIGNED,
                Endian.BIG_ENDIAN,
                lambda f: [
                    Signal(name="ecu_power_level", value=float((f.value >> 4) & 0x0F), raw_value=(f.value >> 4) & 0x0F),
                    Signal(name="ecu_torque_map", value=float(f.value & 0x0F), raw_value=f.value & 0x0F),
                ],
            ),
            new_field(
                "ecu_max_cell_temp",
                1,
                SignMode.UNSIGNED,
                Endian.BIG_ENDIAN,
                lambda f: [
                    Signal(name="ecu_max_cell_temp", value=float(f.value) * 0.25, raw_value=f.value),
                ],
            ),
            new_field(
                "ecu_acu_state_of_charge",
                1,
                SignMode.UNSIGNED,
                Endian.BIG_ENDIAN,
                lambda f: [
                    Signal(name="ecu_acu_state_of_charge", value=float(f.value) * 20 / 51, raw_value=f.value),
                ],
            ),
            new_field(
                "ecu_glv_state_of_charge",
                1,
                SignMode.UNSIGNED,
                Endian.BIG_ENDIAN,
                lambda f: [
                    Signal(name="ecu_glv_state_of_charge", value=float(f.value) * 20 / 51, raw_value=f.value),
                ],
            ),
        ]
    )


class TestMessage:
    def test_invalid_byte_length(self) -> None:
        msg = _ecu_status_message()
        with pytest.raises(ValueError):
            msg.fill_from_bytes(bytes([0, 0]))

    def test_zero_values(self) -> None:
        msg = _ecu_status_message()
        msg.fill_from_bytes(bytes([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]))
        signals = msg.export_signals()
        for signal in signals:
            assert signal.value == 0
            assert signal.raw_value == 0

    def test_nonzero_values(self) -> None:
        msg = _ecu_status_message()
        msg.fill_from_bytes(bytes([0x12, 0x42, 0xFF, 0x00, 0x31, 0x82, 0x58, 0x72]))
        signals = msg.export_signals()
        expected_values = [
            18,
            0,
            1,
            0,
            0,
            0,
            0,
            1,
            0,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            3,
            1,
            32.5,
            34.509804,
            44.705882,
        ]
        for i, signal in enumerate(signals):
            assert int(signal.value) == int(expected_values[i])


class TestNewField:
    def test_basic(self) -> None:
        field = new_field("test", 1, SignMode.UNSIGNED, Endian.BIG_ENDIAN)
        assert field.size == 1
        assert field.sign == SignMode.UNSIGNED


class TestDecode:
    @pytest.mark.parametrize(
        "name,field_kwargs,expected",
        [
            (
                "Signed BigEndian Positive",
                dict(data=bytes([0x12, 0x34]), size=2, sign=SignMode.SIGNED, endian=Endian.BIG_ENDIAN),
                0x1234,
            ),
            (
                "Signed BigEndian Negative",
                dict(data=bytes([0xFF, 0xFE]), size=2, sign=SignMode.SIGNED, endian=Endian.BIG_ENDIAN),
                -2,
            ),
            (
                "Signed LittleEndian Positive",
                dict(data=bytes([0x34, 0x12]), size=2, sign=SignMode.SIGNED, endian=Endian.LITTLE_ENDIAN),
                0x1234,
            ),
            (
                "Signed LittleEndian Negative",
                dict(data=bytes([0xFE, 0xFF]), size=2, sign=SignMode.SIGNED, endian=Endian.LITTLE_ENDIAN),
                -2,
            ),
            (
                "Unsigned BigEndian",
                dict(data=bytes([0xFF, 0xFE]), size=2, sign=SignMode.UNSIGNED, endian=Endian.BIG_ENDIAN),
                0xFFFE,
            ),
            (
                "Unsigned LittleEndian",
                dict(data=bytes([0xFE, 0xFF]), size=2, sign=SignMode.UNSIGNED, endian=Endian.LITTLE_ENDIAN),
                0xFFFE,
            ),
            (
                "Single Byte Signed Positive",
                dict(data=bytes([0x7F]), size=1, sign=SignMode.SIGNED, endian=Endian.BIG_ENDIAN),
                127,
            ),
            (
                "Single Byte Signed Negative",
                dict(data=bytes([0xCF]), size=1, sign=SignMode.SIGNED, endian=Endian.BIG_ENDIAN),
                -49,
            ),
            (
                "Four Bytes Unsigned BigEndian",
                dict(data=bytes([0x12, 0x34, 0x56, 0x78]), size=4, sign=SignMode.UNSIGNED, endian=Endian.BIG_ENDIAN),
                0x12345678,
            ),
            (
                "Four Bytes Unsigned LittleEndian",
                dict(data=bytes([0x78, 0x56, 0x34, 0x12]), size=4, sign=SignMode.UNSIGNED, endian=Endian.LITTLE_ENDIAN),
                0x12345678,
            ),
        ],
    )
    def test_decode(self, name: str, field_kwargs: dict, expected: int) -> None:  # type: ignore[type-arg]
        f = Field(**field_kwargs)
        result = f.decode()
        assert result.value == expected, f"{name}: expected {expected}, got {result.value}"


class TestEncode:
    @pytest.mark.parametrize(
        "name,field_kwargs,expected",
        [
            (
                "Signed BigEndian Positive",
                dict(value=0x1234, size=2, sign=SignMode.SIGNED, endian=Endian.BIG_ENDIAN),
                bytes([0x12, 0x34]),
            ),
            (
                "Signed BigEndian Negative",
                dict(value=-2, size=2, sign=SignMode.SIGNED, endian=Endian.BIG_ENDIAN),
                bytes([0xFF, 0xFE]),
            ),
            (
                "Signed LittleEndian Positive",
                dict(value=0x1234, size=2, sign=SignMode.SIGNED, endian=Endian.LITTLE_ENDIAN),
                bytes([0x34, 0x12]),
            ),
            (
                "Signed LittleEndian Negative",
                dict(value=-2, size=2, sign=SignMode.SIGNED, endian=Endian.LITTLE_ENDIAN),
                bytes([0xFE, 0xFF]),
            ),
            (
                "Unsigned BigEndian",
                dict(value=0xFFFE, size=2, sign=SignMode.UNSIGNED, endian=Endian.BIG_ENDIAN),
                bytes([0xFF, 0xFE]),
            ),
            (
                "Unsigned LittleEndian",
                dict(value=0xFFFE, size=2, sign=SignMode.UNSIGNED, endian=Endian.LITTLE_ENDIAN),
                bytes([0xFE, 0xFF]),
            ),
            (
                "Single Byte Signed Positive",
                dict(value=127, size=1, sign=SignMode.SIGNED, endian=Endian.BIG_ENDIAN),
                bytes([0x7F]),
            ),
            (
                "Single Byte Signed Negative",
                dict(value=-49, size=1, sign=SignMode.SIGNED, endian=Endian.BIG_ENDIAN),
                bytes([0xCF]),
            ),
            (
                "Four Bytes Unsigned BigEndian",
                dict(value=0x12345678, size=4, sign=SignMode.UNSIGNED, endian=Endian.BIG_ENDIAN),
                bytes([0x12, 0x34, 0x56, 0x78]),
            ),
            (
                "Four Bytes Unsigned LittleEndian",
                dict(value=0x12345678, size=4, sign=SignMode.UNSIGNED, endian=Endian.LITTLE_ENDIAN),
                bytes([0x78, 0x56, 0x34, 0x12]),
            ),
        ],
    )
    def test_encode(self, name: str, field_kwargs: dict, expected: bytes) -> None:  # type: ignore[type-arg]
        f = Field(**field_kwargs)
        result = f.encode()
        assert result.data == expected, f"{name}: expected {expected!r}, got {result.data!r}"

    def test_value_too_large(self) -> None:
        f = Field(value=0x1234, size=1, sign=SignMode.UNSIGNED, endian=Endian.BIG_ENDIAN)
        with pytest.raises(ValueError):
            f.encode()

    def test_negative_unsigned(self) -> None:
        f = Field(value=-1, size=2, sign=SignMode.UNSIGNED, endian=Endian.BIG_ENDIAN)
        with pytest.raises(ValueError):
            f.encode()

    def test_invalid_sign(self) -> None:
        with pytest.raises(ValueError):
            SignMode(3)


class TestCheckBit:
    def test_check_bit(self) -> None:
        test_bytes = bytes([0x12, 0x34])
        f = Field(data=test_bytes, size=len(test_bytes))
        for i in range(f.size * 8):
            expected = (test_bytes[i // 8] >> (7 - i % 8)) & 1
            assert f.check_bit(i) == expected
