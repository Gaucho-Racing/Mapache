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
	for i := 0; i < num_bytes; i++ {
		fmt.Printf("%08b", bytes[i])
	}
	return "", nil
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
	var bs = ""
	// Test negative number
	test_num := -1
	_, err := BigEndianUnsignedIntToBinaryString(test_num, 2)
	if err != nil {
		println("PASS: " + err.Error())
	}
	// Test negative bytes
	test_num = 0
	_, err = BigEndianUnsignedIntToBinaryString(test_num, -2)
	if err != nil {
		println("PASS: " + err.Error())
	}
	// Test invalid bytes
	test_num = 193852
	_, err = BigEndianUnsignedIntToBinaryString(test_num, 2)
	if err != nil {
		println("PASS: " + err.Error())
	}
	// Test minumum number (0)
	test_num = 0
	bs, err = BigEndianUnsignedIntToBinaryString(test_num, 2)
	if err != nil {
		log.Println(err.Error())
	}
	println(bs)
	// Test max number (65535)
	test_num = 65535
	bs, err = BigEndianUnsignedIntToBinaryString(test_num, 2)
	if err != nil {
		log.Println(err.Error())
	}
	println(bs)
	// Test 3172
	test_num = 3172
	bs, err = BigEndianUnsignedIntToBinaryString(test_num, 2)
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
	for i := 0; i < num_bytes; i++ {
		fmt.Printf("%08b", bytes[i])
	}
	return "", nil
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
		println(result[i])
	}
	return result, nil
}

func TestLittleEndianUnsignedIntToBinaryString() {
	var bs = ""
	// Test negative number
	test_num := -1
	_, err := LittleEndianUnsignedIntToBinaryString(test_num, 2)
	if err != nil {
		println("PASS: " + err.Error())
	}
	// Test negative bytes
	test_num = 0
	_, err = LittleEndianUnsignedIntToBinaryString(test_num, -2)
	if err != nil {
		println("PASS: " + err.Error())
	}
	// Test invalid bytes
	test_num = 193852
	_, err = LittleEndianUnsignedIntToBinaryString(test_num, 2)
	if err != nil {
		println("PASS: " + err.Error())
	}
	// Test minumum number (0)
	test_num = 0
	bs, err = LittleEndianUnsignedIntToBinaryString(test_num, 2)
	if err != nil {
		log.Println(err.Error())
	}
	println(bs)
	// Test max number (65535)
	test_num = 65535
	bs, err = LittleEndianUnsignedIntToBinaryString(test_num, 2)
	if err != nil {
		log.Println(err.Error())
	}
	println(bs)
	// Test 3172
	test_num = 3172
	bs, err = LittleEndianUnsignedIntToBinaryString(test_num, 2)
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

func main() {
	TestBigEndianUnsignedIntToBinaryString()
	TestLittleEndianUnsignedIntToBinaryString()
	TestLittleEndianBytesToUnsignedInt()
	TestBigEndianBytesToUnsignedInt()
}
