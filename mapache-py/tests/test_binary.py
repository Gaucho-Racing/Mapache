import struct

import pytest

from mapache import (
    big_endian_bytes_to_signed_int,
    big_endian_bytes_to_unsigned_int,
    big_endian_signed_int_to_binary,
    big_endian_signed_int_to_binary_string,
    big_endian_unsigned_int_to_binary,
    big_endian_unsigned_int_to_binary_string,
    little_endian_bytes_to_signed_int,
    little_endian_bytes_to_unsigned_int,
    little_endian_signed_int_to_binary,
    little_endian_signed_int_to_binary_string,
    little_endian_unsigned_int_to_binary,
    little_endian_unsigned_int_to_binary_string,
)


class TestBigEndianUnsignedIntToBinaryString:
    def test_38134_1_byte(self) -> None:
        with pytest.raises(ValueError):
            big_endian_unsigned_int_to_binary_string(38134, 1)

    def test_38134_2_byte(self) -> None:
        assert big_endian_unsigned_int_to_binary_string(38134, 2) == "1001010011110110"


class TestBigEndianUnsignedIntToBinary:
    def test_negative_number(self) -> None:
        with pytest.raises(ValueError):
            big_endian_unsigned_int_to_binary(-1, 1)

    def test_0_bytes(self) -> None:
        with pytest.raises(ValueError):
            big_endian_unsigned_int_to_binary(100, 0)

    def test_number_too_large(self) -> None:
        with pytest.raises(ValueError):
            big_endian_unsigned_int_to_binary(31241, 1)

    def test_number_too_large_2(self) -> None:
        with pytest.raises(ValueError):
            big_endian_unsigned_int_to_binary(3172123, 2)

    def test_0_1_byte(self) -> None:
        assert big_endian_unsigned_int_to_binary(0, 1) == bytes([0])

    def test_123_1_byte(self) -> None:
        assert big_endian_unsigned_int_to_binary(123, 1) == bytes([123])

    def test_255_1_byte(self) -> None:
        assert big_endian_unsigned_int_to_binary(255, 1) == bytes([255])

    def test_172_2_byte(self) -> None:
        assert big_endian_unsigned_int_to_binary(172, 2) == struct.pack(">H", 172)

    def test_38134_2_byte(self) -> None:
        assert big_endian_unsigned_int_to_binary(38134, 2) == struct.pack(">H", 38134)

    def test_429496295_4_byte(self) -> None:
        assert big_endian_unsigned_int_to_binary(429496295, 4) == struct.pack(">I", 429496295)

    def test_44009551615_6_byte(self) -> None:
        assert big_endian_unsigned_int_to_binary(44009551615, 6) == bytes([0, 10, 63, 44, 118, 255])

    def test_18446744009551615_8_byte(self) -> None:
        assert big_endian_unsigned_int_to_binary(18446744009551615, 8) == struct.pack(">Q", 18446744009551615)


class TestBigEndianSignedIntToBinaryString:
    def test_32767_1_byte(self) -> None:
        with pytest.raises(ValueError):
            big_endian_signed_int_to_binary_string(32767, 1)

    def test_32767_2_byte(self) -> None:
        assert big_endian_signed_int_to_binary_string(32767, 2) == "0111111111111111"


class TestBigEndianSignedIntToBinary:
    def test_0_bytes(self) -> None:
        with pytest.raises(ValueError):
            big_endian_signed_int_to_binary(100, 0)

    def test_number_too_large(self) -> None:
        with pytest.raises(ValueError):
            big_endian_signed_int_to_binary(31241, 1)

    def test_number_too_large_2(self) -> None:
        with pytest.raises(ValueError):
            big_endian_signed_int_to_binary(3172123, 2)

    def test_0_1_byte(self) -> None:
        assert big_endian_signed_int_to_binary(0, 1) == bytes([0])

    def test_123_1_byte(self) -> None:
        assert big_endian_signed_int_to_binary(123, 1) == bytes([123])

    def test_255_1_byte(self) -> None:
        with pytest.raises(ValueError):
            big_endian_signed_int_to_binary(255, 1)

    def test_172_2_byte(self) -> None:
        assert big_endian_signed_int_to_binary(172, 2) == struct.pack(">h", 172)

    def test_32767_2_byte(self) -> None:
        assert big_endian_signed_int_to_binary(32767, 2) == struct.pack(">h", 32767)

    def test_neg_32767_2_byte(self) -> None:
        assert big_endian_signed_int_to_binary(-32767, 2) == struct.pack(">h", -32767)

    def test_429496295_4_byte(self) -> None:
        assert big_endian_signed_int_to_binary(429496295, 4) == struct.pack(">i", 429496295)

    def test_neg_429496295_4_byte(self) -> None:
        assert big_endian_signed_int_to_binary(-429496295, 4) == struct.pack(">i", -429496295)

    def test_44009551615_6_byte(self) -> None:
        assert big_endian_signed_int_to_binary(44009551615, 6) == bytes([0, 10, 63, 44, 118, 255])

    def test_18446744009551615_8_byte(self) -> None:
        assert big_endian_signed_int_to_binary(18446744009551615, 8) == struct.pack(">q", 18446744009551615)

    def test_neg_18446744009551615_8_byte(self) -> None:
        assert big_endian_signed_int_to_binary(-18446744009551615, 8) == struct.pack(">q", -18446744009551615)


class TestBigEndianBytesToUnsignedInt:
    def test_0_1_byte(self) -> None:
        assert big_endian_bytes_to_unsigned_int(bytes([0])) == 0

    def test_123_1_byte(self) -> None:
        assert big_endian_bytes_to_unsigned_int(bytes([123])) == 123

    def test_255_1_byte(self) -> None:
        assert big_endian_bytes_to_unsigned_int(bytes([255])) == 255

    def test_172_2_byte(self) -> None:
        assert big_endian_bytes_to_unsigned_int(bytes([0, 172])) == 172

    def test_38134_2_byte(self) -> None:
        assert big_endian_bytes_to_unsigned_int(bytes([148, 246])) == 38134

    def test_429496295_4_byte(self) -> None:
        assert big_endian_bytes_to_unsigned_int(bytes([25, 153, 151, 231])) == 429496295

    def test_44009551615_6_byte(self) -> None:
        assert big_endian_bytes_to_unsigned_int(bytes([0, 10, 63, 44, 118, 255])) == 44009551615

    def test_18446744009551615_8_byte(self) -> None:
        assert big_endian_bytes_to_unsigned_int(bytes([0, 65, 137, 55, 71, 243, 174, 255])) == 18446744009551615


class TestBigEndianBytesToSignedInt:
    def test_0_1_byte(self) -> None:
        assert big_endian_bytes_to_signed_int(bytes([0])) == 0

    def test_123_1_byte(self) -> None:
        assert big_endian_bytes_to_signed_int(bytes([123])) == 123

    def test_255_1_byte(self) -> None:
        assert big_endian_bytes_to_signed_int(bytes([255])) == -1

    def test_172_2_byte(self) -> None:
        assert big_endian_bytes_to_signed_int(bytes([0, 172])) == 172

    def test_32767_2_byte(self) -> None:
        assert big_endian_bytes_to_signed_int(bytes([127, 255])) == 32767

    def test_neg_32767_2_byte(self) -> None:
        assert big_endian_bytes_to_signed_int(bytes([128, 1])) == -32767

    def test_429496295_4_byte(self) -> None:
        assert big_endian_bytes_to_signed_int(bytes([25, 153, 151, 231])) == 429496295

    def test_neg_429496295_4_byte(self) -> None:
        assert big_endian_bytes_to_signed_int(bytes([230, 102, 104, 25])) == -429496295

    def test_44009551615_6_byte(self) -> None:
        assert big_endian_bytes_to_signed_int(bytes([0, 10, 63, 44, 118, 255])) == 44009551615

    def test_279319963006464_6_byte(self) -> None:
        assert big_endian_bytes_to_signed_int(bytes([255, 10, 63, 44, 118, 0])) == 279319963006464

    def test_18446744009551615_8_byte(self) -> None:
        assert big_endian_bytes_to_signed_int(bytes([0, 65, 137, 55, 71, 243, 174, 255])) == 18446744009551615

    def test_neg_18446744009551615_8_byte(self) -> None:
        assert big_endian_bytes_to_signed_int(bytes([255, 190, 118, 200, 184, 12, 81, 1])) == -18446744009551615


class TestLittleEndianUnsignedIntToBinaryString:
    def test_38134_1_byte(self) -> None:
        with pytest.raises(ValueError):
            little_endian_unsigned_int_to_binary_string(38134, 1)

    def test_38134_2_byte(self) -> None:
        assert little_endian_unsigned_int_to_binary_string(38134, 2) == "1111011010010100"


class TestLittleEndianUnsignedIntToBinary:
    def test_negative_number(self) -> None:
        with pytest.raises(ValueError):
            little_endian_unsigned_int_to_binary(-1, 1)

    def test_0_bytes(self) -> None:
        with pytest.raises(ValueError):
            little_endian_unsigned_int_to_binary(100, 0)

    def test_number_too_large(self) -> None:
        with pytest.raises(ValueError):
            little_endian_unsigned_int_to_binary(31241, 1)

    def test_number_too_large_2(self) -> None:
        with pytest.raises(ValueError):
            little_endian_unsigned_int_to_binary(3172123, 2)

    def test_0_1_byte(self) -> None:
        assert little_endian_unsigned_int_to_binary(0, 1) == bytes([0])

    def test_123_1_byte(self) -> None:
        assert little_endian_unsigned_int_to_binary(123, 1) == bytes([123])

    def test_255_1_byte(self) -> None:
        assert little_endian_unsigned_int_to_binary(255, 1) == bytes([255])

    def test_172_2_byte(self) -> None:
        assert little_endian_unsigned_int_to_binary(172, 2) == struct.pack("<H", 172)

    def test_38134_2_byte(self) -> None:
        assert little_endian_unsigned_int_to_binary(38134, 2) == struct.pack("<H", 38134)

    def test_429496295_4_byte(self) -> None:
        assert little_endian_unsigned_int_to_binary(429496295, 4) == struct.pack("<I", 429496295)

    def test_44009551615_6_byte(self) -> None:
        assert little_endian_unsigned_int_to_binary(44009551615, 6) == bytes([255, 118, 44, 63, 10, 0])

    def test_18446744009551615_8_byte(self) -> None:
        assert little_endian_unsigned_int_to_binary(18446744009551615, 8) == struct.pack("<Q", 18446744009551615)


class TestLittleEndianSignedIntToBinaryString:
    def test_32767_1_byte(self) -> None:
        with pytest.raises(ValueError):
            little_endian_signed_int_to_binary_string(32767, 1)

    def test_32767_2_byte(self) -> None:
        assert little_endian_signed_int_to_binary_string(32767, 2) == "1111111101111111"


class TestLittleEndianSignedIntToBinary:
    def test_0_bytes(self) -> None:
        with pytest.raises(ValueError):
            little_endian_signed_int_to_binary(100, 0)

    def test_number_too_large(self) -> None:
        with pytest.raises(ValueError):
            little_endian_signed_int_to_binary(31241, 1)

    def test_number_too_large_2(self) -> None:
        with pytest.raises(ValueError):
            little_endian_signed_int_to_binary(3172123, 2)

    def test_0_1_byte(self) -> None:
        assert little_endian_signed_int_to_binary(0, 1) == bytes([0])

    def test_123_1_byte(self) -> None:
        assert little_endian_signed_int_to_binary(123, 1) == bytes([123])

    def test_255_1_byte(self) -> None:
        with pytest.raises(ValueError):
            little_endian_signed_int_to_binary(255, 1)

    def test_172_2_byte(self) -> None:
        assert little_endian_signed_int_to_binary(172, 2) == struct.pack("<h", 172)

    def test_32767_2_byte(self) -> None:
        assert little_endian_signed_int_to_binary(32767, 2) == struct.pack("<h", 32767)

    def test_neg_32767_2_byte(self) -> None:
        assert little_endian_signed_int_to_binary(-32767, 2) == struct.pack("<h", -32767)

    def test_429496295_4_byte(self) -> None:
        assert little_endian_signed_int_to_binary(429496295, 4) == struct.pack("<i", 429496295)

    def test_neg_429496295_4_byte(self) -> None:
        assert little_endian_signed_int_to_binary(-429496295, 4) == struct.pack("<i", -429496295)

    def test_44009551615_6_byte(self) -> None:
        assert little_endian_signed_int_to_binary(44009551615, 6) == bytes([255, 118, 44, 63, 10, 0])

    def test_18446744009551615_8_byte(self) -> None:
        assert little_endian_signed_int_to_binary(18446744009551615, 8) == struct.pack("<q", 18446744009551615)

    def test_neg_18446744009551615_8_byte(self) -> None:
        assert little_endian_signed_int_to_binary(-18446744009551615, 8) == struct.pack("<q", -18446744009551615)


class TestLittleEndianBytesToUnsignedInt:
    def test_0_1_byte(self) -> None:
        assert little_endian_bytes_to_unsigned_int(bytes([0])) == 0

    def test_123_1_byte(self) -> None:
        assert little_endian_bytes_to_unsigned_int(bytes([123])) == 123

    def test_255_1_byte(self) -> None:
        assert little_endian_bytes_to_unsigned_int(bytes([255])) == 255

    def test_172_2_byte(self) -> None:
        assert little_endian_bytes_to_unsigned_int(bytes([172, 0])) == 172

    def test_38134_2_byte(self) -> None:
        assert little_endian_bytes_to_unsigned_int(bytes([246, 148])) == 38134

    def test_429496295_4_byte(self) -> None:
        assert little_endian_bytes_to_unsigned_int(bytes([231, 151, 153, 25])) == 429496295

    def test_44009551615_6_byte(self) -> None:
        assert little_endian_bytes_to_unsigned_int(bytes([255, 118, 44, 63, 10, 0])) == 44009551615

    def test_18446744009551615_8_byte(self) -> None:
        assert little_endian_bytes_to_unsigned_int(bytes([255, 174, 243, 71, 55, 137, 65, 0])) == 18446744009551615


class TestLittleEndianBytesToSignedInt:
    def test_0_1_byte(self) -> None:
        assert little_endian_bytes_to_signed_int(bytes([0])) == 0

    def test_123_1_byte(self) -> None:
        assert little_endian_bytes_to_signed_int(bytes([123])) == 123

    def test_255_1_byte(self) -> None:
        assert little_endian_bytes_to_signed_int(bytes([255])) == -1

    def test_172_2_byte(self) -> None:
        assert little_endian_bytes_to_signed_int(bytes([172, 0])) == 172

    def test_32767_2_byte(self) -> None:
        assert little_endian_bytes_to_signed_int(bytes([255, 127])) == 32767

    def test_neg_32767_2_byte(self) -> None:
        assert little_endian_bytes_to_signed_int(bytes([1, 128])) == -32767

    def test_429496295_4_byte(self) -> None:
        assert little_endian_bytes_to_signed_int(bytes([231, 151, 153, 25])) == 429496295

    def test_neg_429496295_4_byte(self) -> None:
        assert little_endian_bytes_to_signed_int(bytes([25, 104, 102, 230])) == -429496295

    def test_44009551615_6_byte(self) -> None:
        assert little_endian_bytes_to_signed_int(bytes([255, 118, 44, 63, 10, 0])) == 44009551615

    def test_279319963006464_6_byte(self) -> None:
        assert little_endian_bytes_to_signed_int(bytes([0, 118, 44, 63, 10, 255])) == 279319963006464

    def test_18446744009551615_8_byte(self) -> None:
        assert little_endian_bytes_to_signed_int(bytes([255, 174, 243, 71, 55, 137, 65, 0])) == 18446744009551615

    def test_neg_18446744009551615_8_byte(self) -> None:
        assert little_endian_bytes_to_signed_int(bytes([1, 81, 12, 184, 200, 118, 190, 255])) == -18446744009551615
