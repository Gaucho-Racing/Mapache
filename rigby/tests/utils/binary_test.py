import pytest
from rigby.utils.binary import BinFactory

def test_int_to_bin():
    assert BinFactory.int_to_bin(0, 2) == "0000000000000000"
    assert BinFactory.int_to_bin(1, 2) == "0000000000000001"
    assert BinFactory.int_to_bin(-1, 2) == "1111111111111111"
    assert BinFactory.int_to_bin(32767, 2) == "0111111111111111"
    assert BinFactory.int_to_bin(-32768, 2) == "1000000000000000"
    with pytest.raises(ValueError):
        BinFactory.int_to_bin(2**16, 2)
    with pytest.raises(ValueError):
        BinFactory.int_to_bin(-2**16-1, 2)

def test_uint_to_bin():
    assert BinFactory.uint_to_bin(0, 2) == "0000000000000000"
    assert BinFactory.uint_to_bin(1, 2) == "0000000000000001"
    assert BinFactory.uint_to_bin(32767, 2) == "0111111111111111"
    assert BinFactory.uint_to_bin(32768, 2) == "1000000000000000"
    assert BinFactory.uint_to_bin(65535, 2) == "1111111111111111"
    with pytest.raises(ValueError):
        BinFactory.uint_to_bin(-1, 2)
    with pytest.raises(ValueError):
        BinFactory.uint_to_bin(65536, 2)

def test_float32_to_bin():
    assert BinFactory.float32_to_bin(0.0) == "00000000000000000000000000000000"
    assert BinFactory.float32_to_bin(1.0) == "00111111100000000000000000000000"
    assert BinFactory.float32_to_bin(-1.0) == "10111111100000000000000000000000"
    assert BinFactory.float32_to_bin(0.5) == "00111111000000000000000000000000"
    assert BinFactory.float32_to_bin(-0.5) == "10111111000000000000000000000000"
    assert BinFactory.float32_to_bin(0.1) == "00111101110011001100110011001101"
    assert BinFactory.float32_to_bin(-0.1) == "10111101110011001100110011001101"

def test_bin_to_byte_array():
    assert BinFactory.bin_to_byte_array("0000000000000000") == bytearray(b'\x00\x00')
    assert BinFactory.bin_to_byte_array("0000000000000001") == bytearray(b'\x00\x01')
    assert BinFactory.bin_to_byte_array("1111111111111111") == bytearray(b'\xff\xff')
    assert BinFactory.bin_to_byte_array("0111111111111111") == bytearray(b'\x7f\xff')
    assert BinFactory.bin_to_byte_array("1000000000000000") == bytearray(b'\x80\x00')
    assert BinFactory.bin_to_byte_array("1000000000000001") == bytearray(b'\x80\x01')
    assert BinFactory.bin_to_byte_array("1000000000000010") == bytearray(b'\x80\x02')
    assert BinFactory.bin_to_byte_array("1000000000000011") == bytearray(b'\x80\x03')
    assert BinFactory.bin_to_byte_array("1000000000000100") == bytearray(b'\x80\x04')
    assert BinFactory.bin_to_byte_array("1000000000000101") == bytearray(b'\x80\x05')
    assert BinFactory.bin_to_byte_array("1000000000000110") == bytearray(b'\x80\x06')
    assert BinFactory.bin_to_byte_array("1000000000000111") == bytearray(b'\x80\x07')
    assert BinFactory.bin_to_byte_array("1000000000001000") == bytearray(b'\x80\x08')
    assert BinFactory.bin_to_byte_array("1000000000001001") == bytearray(b'\x80\t')
    assert BinFactory.bin_to_byte_array("1000000000001010") == bytearray(b'\x80\n')
    assert BinFactory.bin_to_byte_array("1000000000001011") == bytearray(b'\x80\x0b')
    assert BinFactory.bin_to_byte_array("1000000000001100") == bytearray(b'\x80\x0c')
    assert BinFactory.bin_to_byte_array("1000000000001101") == bytearray(b'\x80\r')
    assert BinFactory.bin_to_byte_array("1000000000001110") == bytearray(b'\x80\x0e')
    assert BinFactory.bin_to_byte_array("1000000000001111") == bytearray(b'\x80\x0f')
    assert BinFactory.bin_to_byte_array("1000000000010000") == bytearray(b'\x80\x10')
