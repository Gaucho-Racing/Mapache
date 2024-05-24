package main

import (
	"fmt"
	"log"
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

func TestBigEndianUnsignedIntToBinaryString() {
	println("TestBigEndianUnsignedIntToBinaryString")
	var bs = ""
	// Test minumum number (0)
	num := 0
	fmt.Printf("%d: ", num)
	bs, err := BigEndianUnsignedIntToBinaryString(num, 2)
	if err != nil {
		log.Println(err.Error())
	}
	println(bs)
	// Test max number (65535)
	num = 65535
	fmt.Printf("%d: ", num)
	bs, err = BigEndianUnsignedIntToBinaryString(num, 2)
	if err != nil {
		log.Println(err.Error())
	}
	println(bs)
	// Test 3172
	num = 3172
	fmt.Printf("%d: ", num)
	bs, err = BigEndianUnsignedIntToBinaryString(num, 2)
	if err != nil {
		log.Println(err.Error())
	}
	println(bs)
	// Test 3172681251
	num = 3172681251
	fmt.Printf("%d: ", num)
	bs, err = BigEndianUnsignedIntToBinaryString(num, 4)
	if err != nil {
		log.Println(err.Error())
	}
	println(bs)
}

func UnsignedIntToBinary(num int, num_bytes int) ([]byte, error) {
	var result []byte
	for i := 0; i < num_bytes; i++ {
		result = append(result, byte(num>>uint(i*8)))
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

func TestLittleEndianUnsignedIntToBinaryString() {
	println("TestLittleEndianUnsignedIntToBinaryString")
	var bs = ""
	// Test minumum number (0)
	num := 0
	fmt.Printf("%d: ", num)
	bs, err := LittleEndianUnsignedIntToBinaryString(num, 2)
	if err != nil {
		log.Println(err.Error())
	}
	println(bs)
	// Test max number (65535)
	num = 65535
	fmt.Printf("%d: ", num)
	bs, err = LittleEndianUnsignedIntToBinaryString(num, 2)
	if err != nil {
		log.Println(err.Error())
	}
	println(bs)
	// Test 3172
	num = 3172
	fmt.Printf("%d: ", num)
	bs, err = LittleEndianUnsignedIntToBinaryString(num, 2)
	if err != nil {
		log.Println(err.Error())
	}
	println(bs)
	// Test 3172681251
	num = 3172681251
	fmt.Printf("%d: ", num)
	bs, err = LittleEndianUnsignedIntToBinaryString(num, 4)
	if err != nil {
		log.Println(err.Error())
	}
	println(bs)
}

func LittleEndianBytesToUnsignedInt(bytes []byte) int {
	var result int
	for i := 0; i < len(bytes); i++ {
		result += int(bytes[i]) << uint(i*8)
	}
	return result
}

func TestLittleEndianBytesToUnsignedInt() {
	// Test 0
	var bytes = []byte{0, 0}
	println(LittleEndianBytesToUnsignedInt(bytes))
	// Test 65535
	bytes = []byte{255, 255}
	println(LittleEndianBytesToUnsignedInt(bytes))
	// Test 3172
	bytes = []byte{100, 12}
	println(LittleEndianBytesToUnsignedInt(bytes))
}

func BigEndianBytesToUnsignedInt(bytes []byte) int {
	var result int
	for i := 0; i < len(bytes); i++ {
		result += int(bytes[i]) << uint((len(bytes)-i-1)*8)
	}
	return result
}

func TestBigEndianBytesToUnsignedInt() {
	// Test 0
	var bytes = []byte{0, 0}
	println(BigEndianBytesToUnsignedInt(bytes))
	// Test 65535
	bytes = []byte{255, 255}
	println(BigEndianBytesToUnsignedInt(bytes))
	// Test 3172
	bytes = []byte{12, 100}
	println(BigEndianBytesToUnsignedInt(bytes))
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

func TestBigEndianSignedIntToBinaryString() {
	println("TestBigEndianSignedIntToBinaryString")
	// Test 0
	var num = 0
	fmt.Printf("%d: ", num)
	bs, err := BigEndianSignedIntToBinaryString(num, 2)
	if err != nil {
		log.Println(err.Error())
	}
	println(bs)
	// Test 65535
	num = -65535
	fmt.Printf("%d: ", num)
	bs, err = BigEndianSignedIntToBinaryString(num, 2)
	if err != nil {
		log.Println(err.Error())
	}
	println(bs)
	// Test 3172
	num = -3172
	fmt.Printf("%d: ", num)
	bs, err = BigEndianSignedIntToBinaryString(num, 2)
	if err != nil {
		log.Println(err.Error())
	}
	println(bs)
	num = -1934
	fmt.Printf("%d: ", num)
	bs, err = BigEndianSignedIntToBinaryString(num, 2)
	if err != nil {
		log.Println(err.Error())
	}
	println(bs)
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

func TestLittleEndianSignedIntToBinaryString() {
	println("TestLittleEndianSignedIntToBinaryString")
	// Test 0
	var num = 0
	fmt.Printf("%d: ", num)
	bs, err := LittleEndianSignedIntToBinaryString(num, 2)
	if err != nil {
		log.Println(err.Error())
	}
	println(bs)
	// Test 65535
	num = -65535
	fmt.Printf("%d: ", num)
	bs, err = LittleEndianSignedIntToBinaryString(num, 2)
	if err != nil {
		log.Println(err.Error())
	}
	println(bs)
	// Test 3172
	num = -3172
	fmt.Printf("%d: ", num)
	bs, err = LittleEndianSignedIntToBinaryString(num, 2)
	if err != nil {
		log.Println(err.Error())
	}
	println(bs)
	num = -1934
	fmt.Printf("%d: ", num)
	bs, err = LittleEndianSignedIntToBinaryString(num, 2)
	if err != nil {
		log.Println(err.Error())
	}
	println(bs)
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
		// TODO
	} else if f.Sign == Signed && f.Endian == LittleEndian {
		// TODO
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

	TestBigEndianUnsignedIntToBinaryString()
	TestLittleEndianUnsignedIntToBinaryString()
	// TestLittleEndianBytesToUnsignedInt()
	// TestBigEndianBytesToUnsignedInt()
	println("-------------")
	TestBigEndianSignedIntToBinaryString()
	TestLittleEndianSignedIntToBinaryString()
}
