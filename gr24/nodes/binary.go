package main

import (
	"fmt"
)

func BigEndianUnsignedIntToBinaryString(num int, num_bytes int) (string, error) {
	if num < 0 {
		return "", fmt.Errorf("cannot convert negative number to binary")
	} else if num_bytes < 1 {
		return "", fmt.Errorf("cannot convert to binary with less than 1 byte")
	} else if num >= 1<<(num_bytes*8) {
		return "", fmt.Errorf("number is too large to fit in %d bytes", num_bytes)
	}
	bytes, _ := BigEndianUnsignedIntToBinary(num, num_bytes)
	var bs = ""
	for i := 0; i < num_bytes; i++ {
		bs += fmt.Sprintf("%08b", bytes[i])
	}
	return bs, nil
}

func BigEndianUnsignedIntToBinary(num int, num_bytes int) ([]byte, error) {
	if num < 0 {
		return nil, fmt.Errorf("cannot convert negative number to binary")
	} else if num_bytes < 1 {
		return nil, fmt.Errorf("cannot convert to binary with less than 1 byte")
	} else if num >= 1<<(num_bytes*8) {
		return nil, fmt.Errorf("number is too large to fit in %d bytes", num_bytes)
	}
	var result []byte
	for i := 0; i < num_bytes; i++ {
		result = append(result, byte(num>>uint((num_bytes-i-1)*8)))
	}
	return result, nil
}

func LittleEndianUnsignedIntToBinaryString(num int, num_bytes int) (string, error) {
	if num < 0 {
		return "", fmt.Errorf("cannot convert negative number to binary")
	} else if num_bytes < 1 {
		return "", fmt.Errorf("cannot convert to binary with less than 1 byte")
	} else if num >= 1<<(num_bytes*8) {
		return "", fmt.Errorf("number is too large to fit in %d bytes", num_bytes)
	}
	bytes, _ := LittleEndianUnsignedIntToBinary(num, num_bytes)
	var bs = ""
	for i := 0; i < num_bytes; i++ {
		bs += fmt.Sprintf("%08b", bytes[i])
	}
	return bs, nil
}

func LittleEndianUnsignedIntToBinary(num int, num_bytes int) ([]byte, error) {
	if num < 0 {
		return nil, fmt.Errorf("cannot convert negative number to binary")
	} else if num_bytes < 1 {
		return nil, fmt.Errorf("cannot convert to binary with less than 1 byte")
	} else if num >= 1<<(num_bytes*8) {
		return nil, fmt.Errorf("number is too large to fit in %d bytes", num_bytes)
	}
	var result []byte
	for i := 0; i < num_bytes; i++ {
		result = append(result, byte(num>>uint(i*8)))
	}
	return result, nil
}

func BigEndianBytesToUnsignedInt(bytes []byte) int {
	var result int
	for i := 0; i < len(bytes); i++ {
		result += int(bytes[i]) << uint((len(bytes)-i-1)*8)
	}
	return result
}

func LittleEndianBytesToUnsignedInt(bytes []byte) int {
	var result int
	for i := 0; i < len(bytes); i++ {
		result += int(bytes[i]) << uint(i*8)
	}
	return result
}

func BigEndianSignedIntToBinaryString(num int, num_bytes int) (string, error) {
	if num_bytes < 1 {
		return "", fmt.Errorf("cannot convert to binary with less than 1 byte")
	}
	minValue := -1 << ((num_bytes * 8) - 1)
	maxValue := (1 << ((num_bytes * 8) - 1)) - 1
	if num < minValue || num > maxValue {
		return "", fmt.Errorf("number is too large to fit in %d bytes", num_bytes)
	}
	bytes, _ := BigEndianSignedIntToBinary(num, num_bytes)
	var bs = ""
	println()
	for i := 0; i < num_bytes; i++ {
		bs += fmt.Sprintf("%08b", bytes[i])
		fmt.Printf("%02x ", bytes[i])
	}
	println()
	return bs, nil
}

func BigEndianSignedIntToBinary(num int, num_bytes int) ([]byte, error) {
	if num_bytes < 1 {
		return nil, fmt.Errorf("cannot convert to binary with less than 1 byte")
	}
	minValue := -1 << ((num_bytes * 8) - 1)
	maxValue := (1 << ((num_bytes * 8) - 1)) - 1
	if num < minValue || num > maxValue {
		return nil, fmt.Errorf("number is too large to fit in %d bytes", num_bytes)
	}
	var result []byte
	for i := 0; i < num_bytes; i++ {
		shift := uint((num_bytes - i - 1) * 8)
		result = append(result, byte(num>>shift))
	}
	return result, nil
}

func LittleEndianSignedIntToBinaryString(num int, num_bytes int) (string, error) {
	if num_bytes < 1 {
		return "", fmt.Errorf("cannot convert to binary with less than 1 byte")
	}
	minValue := -1 << ((num_bytes * 8) - 1)
	maxValue := (1 << ((num_bytes * 8) - 1)) - 1
	if num < minValue || num > maxValue {
		return "", fmt.Errorf("number is too large to fit in %d bytes", num_bytes)
	}
	bytes, _ := LittleEndianSignedIntToBinary(num, num_bytes)
	var bs = ""
	println()
	for i := 0; i < num_bytes; i++ {
		bs += fmt.Sprintf("%08b", bytes[i])
		fmt.Printf("%02x ", bytes[i])
	}
	println()
	return bs, nil
}

func LittleEndianSignedIntToBinary(num int, num_bytes int) ([]byte, error) {
	if num_bytes < 1 {
		return nil, fmt.Errorf("cannot convert to binary with less than 1 byte")
	}
	minValue := -1 << ((num_bytes * 8) - 1)
	maxValue := (1 << ((num_bytes * 8) - 1)) - 1
	if num < minValue || num > maxValue {
		return nil, fmt.Errorf("number is too large to fit in %d bytes", num_bytes)
	}
	var result []byte
	for i := 0; i < num_bytes; i++ {
		shift := uint(i * 8)
		result = append(result, byte(num>>shift))
	}
	return result, nil
}

func BigEndianBytesToSignedInt(bytes []byte) int {
	var result int
	if bytes[0] >= 128 {
		result = -1 << uint((len(bytes)-1)*8)
	}
	for i := 0; i < len(bytes); i++ {
		result += int(bytes[i]) << uint((len(bytes)-i-1)*8)
	}
	return result
}

func LittleEndianBytesToSignedInt(bytes []byte) int {
	var result int
	if bytes[len(bytes)-1] >= 128 {
		result = -1 << uint((len(bytes)-1)*8)
	}
	for i := 0; i < len(bytes); i++ {
		result += int(bytes[i]) << uint(i*8)
	}
	return result
}

type SignMode int

const (
	Signed   SignMode = 1
	Unsigned SignMode = 0
)

type Endian int

const (
	BigEndian    Endian = 1
	LittleEndian Endian = 0
)

type Field struct {
	Name   string
	Bytes  []byte
	Value  int
	Length int
	Sign   SignMode
	Endian Endian
}

func (f Field) Decode() int {
	if f.Sign == Signed && f.Endian == BigEndian {
		return BigEndianBytesToSignedInt(f.Bytes)
	} else if f.Sign == Signed && f.Endian == LittleEndian {
		return LittleEndianBytesToSignedInt(f.Bytes)
	} else if f.Sign == Unsigned && f.Endian == BigEndian {
		return BigEndianBytesToUnsignedInt(f.Bytes)
	} else if f.Sign == Unsigned && f.Endian == LittleEndian {
		return LittleEndianBytesToUnsignedInt(f.Bytes)
	}
	return 0
}

func (f Field) Encode() ([]byte, error) {
	if f.Sign == Signed && f.Endian == BigEndian {
		return BigEndianSignedIntToBinary(f.Value, f.Length)
	} else if f.Sign == Signed && f.Endian == LittleEndian {
		return LittleEndianSignedIntToBinary(f.Value, f.Length)
	} else if f.Sign == Unsigned && f.Endian == BigEndian {
		return BigEndianUnsignedIntToBinary(f.Value, f.Length)
	} else if f.Sign == Unsigned && f.Endian == LittleEndian {
		return LittleEndianUnsignedIntToBinary(f.Value, f.Length)
	}
	return nil, fmt.Errorf("invalid sign or endian")
}

func main() {
	pedals := []Field{
		{"throttle", []byte{0x01, 0x02}, 0, 2, Unsigned, LittleEndian},
		{"brake", []byte{0x03, 0x04}, 0, 2, Unsigned, LittleEndian},
	}
	for i, pedal := range pedals {
		pedal.Value = pedal.Decode()
		pedals[i] = pedal
	}
	for _, pedal := range pedals {
		fmt.Printf("%s: %d\n", pedal.Name, pedal.Value)
	}
}
