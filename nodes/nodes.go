package nodes

import "fmt"

// SignMode is a type to represent whether an integer is signed or unsigned
type SignMode int

const (
	Signed   SignMode = 1
	Unsigned SignMode = 0
)

// Endian is a type to represent whether an integer is big endian or little endian
type Endian int

const (
	BigEndian    Endian = 1
	LittleEndian Endian = 0
)

// Field is a struct to represent a specific value in a vehicle node
// Multiple fields can be used to create an easy to encode/decode structure
type Field struct {
	Name   string
	Bytes  []byte
	Value  int
	Length int
	Sign   SignMode
	Endian Endian
}

// Decode decodes the bytes stored in a Field object and returns the integer value
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

// Encode encodes the integer value stored in a Field object and returns the bytes
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
