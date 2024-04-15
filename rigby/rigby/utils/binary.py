import struct

class BinFactory:

    @classmethod
    def fill_bytes(cls, num_bytes) -> str:
        """
        Fills a binary string with zeros to a specified number of bytes.
        """
        return '0' * num_bytes * 8
    
    @classmethod
    def int_to_bin(cls, raw_val, num_bytes) -> str:
        """
        Converts a signed integer to a binary (2's complement) string of a specified number of bytes.

        Args:
            raw_val (int): The integer to convert to binary.
            num_bytes (int): The number of bytes the binary string should be.

        Returns:
            str: The binary string of the integer.
        """
        if raw_val < -2**(8*num_bytes-1) or raw_val >= 2**(8*num_bytes-1):
            raise ValueError(f"Value {raw_val} is out of range for {num_bytes} bytes")
    
        if raw_val < 0:
            raw_val = 2**(8*num_bytes) + raw_val
        
        bin_str = bin(raw_val)[2:]
        bin_str = bin_str.zfill(num_bytes * 8)
        return bin_str
    
    @classmethod
    def uint_to_bin(cls, raw_val, num_bytes) -> str:
        """
        Converts an unsigned integer to a binary string of a specified number of bytes.

        Args:
            raw_val (int): The integer to convert to binary.
            num_bytes (int): The number of bytes the binary string should be.

        Returns:
            str: The binary string of the integer.
        """
        if raw_val < 0 or raw_val >= 2**(8*num_bytes):
            raise ValueError(f"Value {raw_val} is out of range for {num_bytes} bytes")
        
        bin_str = bin(raw_val)[2:]
        bin_str = bin_str.zfill(num_bytes * 8)
        return bin_str
    
    @classmethod
    def float32_to_bin(cls, float_val) -> str:
        """
        Converts a 32-bit floating point number to a binary string.

        Args:
            float_val (float): The floating point number to convert to binary.

        Returns:
            str: The binary string of the floating point number.
        """
        packed = struct.pack('f', float_val)
        ints = struct.unpack('I', packed)
        binary = bin(ints[0])[2:].zfill(32)
        return binary

    @classmethod
    def bin_to_byte_array(cls, bin_str) -> bytearray:
        """
        Converts a binary string to a bytearray.
        """
        return bytearray(int(bin_str[i:i+8], 2) for i in range(0, len(bin_str), 8))

