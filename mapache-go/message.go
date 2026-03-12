package mapache

import "fmt"

// A Message is a single data message from a vehicle, comprised of a list of Fields.
type Message []Field

// Length returns the number of fields in the message.
func (m Message) Length() int {
	return len(m)
}

// Size returns the total number of bytes in the message.
func (m Message) Size() int {
	size := 0
	for _, field := range m {
		size += field.Size
	}
	return size
}

// FillFromBytes fills the Fields of a Message with the provided byte array.
// It decodes the bytes into integer values and stores them in the Value of each Field.
// It returns an error if the data length does not match the size of the Message.
func (m Message) FillFromBytes(data []byte) error {
	if len(data) != m.Size() {
		return fmt.Errorf("invalid data length, expected %d bytes, got %d", m.Size(), len(data))
	}
	counter := 0
	for i, field := range m {
		field.Bytes = data[counter : counter+field.Size]
		counter += field.Size
		m[i] = field.Decode()
	}
	return nil
}

// FillFromInts fills the Fields of a Message with the provided integers.
// It encodes the integers into bytes and stores them in the Bytes of each Field.
// It returns an error if the number of integers does not match the number of Fields in the Message.
func (m Message) FillFromInts(ints []int) error {
	if len(ints) != m.Length() {
		return fmt.Errorf("invalid ints length, expected %d, got %d", m.Length(), len(ints))
	}
	for i, field := range m {
		field.Value = ints[i]
		field, err := field.Encode()
		if err != nil {
			return err
		}
		m[i] = field
	}
	return nil
}

// ExportSignals returns a list of all Signals contained in each Field of the Message.
// Basically just calls ExportSignals on each Field and concatenates the results.
func (m Message) ExportSignals() []Signal {
	signals := []Signal{}
	for _, field := range m {
		signals = append(signals, field.ExportSignals()...)
	}
	return signals
}

// Field is a single field of a message. It will always be at least 1 byte in size.
// It is meant to be an intermediary structure, purely for encoding and decoding byte arrays.
// A single field may contain multiple signals (tpyically when it contains multiple errors as boolean flags).
type Field struct {
	// Name of the field. Will be mapped to a signal name unless otherwise specified by ExportSignalFunc.
	Name string
	// Bytes, Size, Sign, and Endian are used to properly decode and encode the signal.
	Bytes  []byte
	Size   int
	Sign   SignMode
	Endian Endian
	// Value is the integer value of the field.
	Value int
	// ExportSignalFunc is the function that is used to export the field as an array of signals.
	ExportSignalFunc ExportSignalFunc
}

// ExportSignalFunc is a function that indicates how a field should be exported as an array of signals.
// Any required scaling will be applied here. If ExportSignalFunc is not set, the field will be directly
// exported as a single signal without scaling.
type ExportSignalFunc func(Field) []Signal

// NewField creates a new Field object with the given name, size, sign, endian, and export function.
// If no export function is provided, DefaultSignalExportFunc will be used.
func NewField(name string, size int, sign SignMode, endian Endian, exportSignalFunc ExportSignalFunc) Field {
	return Field{
		Name:             name,
		Size:             size,
		Sign:             sign,
		Endian:           endian,
		ExportSignalFunc: exportSignalFunc,
	}
}

// Decode takes a Field object, decodes the bytes into an integer value, and returns the decoded Field object.
func (f Field) Decode() Field {
	if f.Sign == Signed && f.Endian == BigEndian {
		f.Value = BigEndianBytesToSignedInt(f.Bytes)
	} else if f.Sign == Signed && f.Endian == LittleEndian {
		f.Value = LittleEndianBytesToSignedInt(f.Bytes)
	} else if f.Sign == Unsigned && f.Endian == BigEndian {
		f.Value = BigEndianBytesToUnsignedInt(f.Bytes)
	} else if f.Sign == Unsigned && f.Endian == LittleEndian {
		f.Value = LittleEndianBytesToUnsignedInt(f.Bytes)
	}
	return f
}

// Encode takes a Field object, encodes the integer value into bytes, and returns the encoded Field object.
func (f Field) Encode() (Field, error) {
	var err error
	if f.Sign == Signed && f.Endian == BigEndian {
		f.Bytes, err = BigEndianSignedIntToBinary(f.Value, f.Size)
	} else if f.Sign == Signed && f.Endian == LittleEndian {
		f.Bytes, err = LittleEndianSignedIntToBinary(f.Value, f.Size)
	} else if f.Sign == Unsigned && f.Endian == BigEndian {
		f.Bytes, err = BigEndianUnsignedIntToBinary(f.Value, f.Size)
	} else if f.Sign == Unsigned && f.Endian == LittleEndian {
		f.Bytes, err = LittleEndianUnsignedIntToBinary(f.Value, f.Size)
	} else {
		return f, fmt.Errorf("invalid sign or endian")
	}
	return f, err
}

// CheckBit takes a Field object and a bit position, and returns the integer value of the bit at the given position (0 or 1).
// Bit positions are counted from left to right, where bit 0 is the leftmost bit.
func (f Field) CheckBit(bit int) int {
	byteIndex := bit / 8
	bitPosition := 7 - (bit % 8)
	if byteIndex >= len(f.Bytes) {
		return 0
	}
	return int((f.Bytes[byteIndex] >> bitPosition) & 1)
}

// ExportSignals takes a Field object and exports it as an array of signals.
func (f Field) ExportSignals() []Signal {
	if f.ExportSignalFunc == nil {
		return DefaultSignalExportFunc(f)
	}
	return f.ExportSignalFunc(f)
}

// DefaultSignalExportFunc is the default export function for a field. It exports the field as a single signal with no scaling.
func DefaultSignalExportFunc(f Field) []Signal {
	return []Signal{{
		Name:     f.Name,
		Value:    float64(f.Value),
		RawValue: f.Value,
	}}
}
