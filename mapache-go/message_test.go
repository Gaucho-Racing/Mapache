package mapache

import (
	"testing"
)

func TestMessage(t *testing.T) {
	ecuStatusMessage := Message{
		NewField("ecu_state", 1, Unsigned, BigEndian, nil),
		NewField("ecu_status_flags", 3, Unsigned, BigEndian, func(f Field) []Signal {
			signals := []Signal{}
			bitMap := []string{
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
			}
			for i := 0; i < len(bitMap); i++ {
				signals = append(signals, Signal{
					Name:     bitMap[i],
					Value:    float64(f.CheckBit(i)),
					RawValue: f.CheckBit(i),
				})
			}
			return signals
		}),
		NewField("ecu_maps", 1, Unsigned, BigEndian, func(f Field) []Signal {
			signals := []Signal{}
			signals = append(signals, Signal{
				Name:     "ecu_power_level",
				Value:    float64((f.Value >> 4) & 0x0F),
				RawValue: (f.Value >> 4) & 0x0F,
			})
			signals = append(signals, Signal{
				Name:     "ecu_torque_map",
				Value:    float64(f.Value & 0x0F),
				RawValue: f.Value & 0x0F,
			})
			return signals
		}),
		NewField("ecu_max_cell_temp", 1, Unsigned, BigEndian, func(f Field) []Signal {
			signals := []Signal{}
			signals = append(signals, Signal{
				Name:     "ecu_max_cell_temp",
				Value:    float64(f.Value) * 0.25,
				RawValue: f.Value,
			})
			return signals
		}),
		NewField("ecu_acu_state_of_charge", 1, Unsigned, BigEndian, func(f Field) []Signal {
			signals := []Signal{}
			signals = append(signals, Signal{
				Name:     "ecu_acu_state_of_charge",
				Value:    float64(f.Value) * 20 / 51,
				RawValue: f.Value,
			})
			return signals
		}),
		NewField("ecu_glv_state_of_charge", 1, Unsigned, BigEndian, func(f Field) []Signal {
			signals := []Signal{}
			signals = append(signals, Signal{
				Name:     "ecu_glv_state_of_charge",
				Value:    float64(f.Value) * 20 / 51,
				RawValue: f.Value,
			})
			return signals
		}),
	}
	t.Run("Invalid byte length", func(t *testing.T) {
		err := ecuStatusMessage.FillFromBytes([]byte{0, 0})
		if err == nil {
			t.Errorf("Expected error, got nil")
		}
	})
	t.Run("Test zero values", func(t *testing.T) {
		err := ecuStatusMessage.FillFromBytes([]byte{0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00})
		if err != nil {
			t.Errorf("Expected nil, got %v", err)
		}
		signals := ecuStatusMessage.ExportSignals()
		for _, signal := range signals {
			if signal.Value != 0 {
				t.Errorf("Expected Value 0, got %f", signal.Value)
			}
			if signal.RawValue != 0 {
				t.Errorf("Expected RawValue 0, got %d", signal.RawValue)
			}
		}
	})
	t.Run("Test nonzero values", func(t *testing.T) {
		err := ecuStatusMessage.FillFromBytes([]byte{0x12, 0x42, 0xFF, 0x00, 0x31, 0x82, 0x58, 0x72})
		if err != nil {
			t.Errorf("Expected nil, got %v", err)
		}
		signals := ecuStatusMessage.ExportSignals()
		expectedValues := []float64{
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
		}
		for i, signal := range signals {
			if int(signal.Value) != int(expectedValues[i]) {
				t.Errorf("Expected Value %f, got %f", expectedValues[i], signal.Value)
			}
		}
	})
}

func TestNewField(t *testing.T) {
	field := NewField("test", 1, Unsigned, BigEndian, nil)
	if field.Size != 1 {
		t.Errorf("Expected Size 1, got %d", field.Size)
	}
	if field.Sign != Unsigned {
		t.Errorf("Expected Sign Unsigned, got %d", field.Sign)
	}
}

func TestDecode(t *testing.T) {
	testCases := []struct {
		name     string
		field    Field
		expected int64
	}{
		{
			name: "Signed BigEndian Positive",
			field: Field{
				Bytes:  []byte{0x12, 0x34},
				Size:   2,
				Sign:   Signed,
				Endian: BigEndian,
			},
			expected: 0x1234,
		},
		{
			name: "Signed BigEndian Negative",
			field: Field{
				Bytes:  []byte{0xFF, 0xFE},
				Size:   2,
				Sign:   Signed,
				Endian: BigEndian,
			},
			expected: -2,
		},
		{
			name: "Signed LittleEndian Positive",
			field: Field{
				Bytes:  []byte{0x34, 0x12},
				Size:   2,
				Sign:   Signed,
				Endian: LittleEndian,
			},
			expected: 0x1234,
		},
		{
			name: "Signed LittleEndian Negative",
			field: Field{
				Bytes:  []byte{0xFE, 0xFF},
				Size:   2,
				Sign:   Signed,
				Endian: LittleEndian,
			},
			expected: -2,
		},
		{
			name: "Unsigned BigEndian",
			field: Field{
				Bytes:  []byte{0xFF, 0xFE},
				Size:   2,
				Sign:   Unsigned,
				Endian: BigEndian,
			},
			expected: 0xFFFE,
		},
		{
			name: "Unsigned LittleEndian",
			field: Field{
				Bytes:  []byte{0xFE, 0xFF},
				Size:   2,
				Sign:   Unsigned,
				Endian: LittleEndian,
			},
			expected: 0xFFFE,
		},
		{
			name: "Single Byte Signed Positive",
			field: Field{
				Bytes:  []byte{0x7F},
				Size:   1,
				Sign:   Signed,
				Endian: BigEndian,
			},
			expected: 127,
		},
		{
			name: "Single Byte Signed Negative",
			field: Field{
				Bytes:  []byte{0xCF},
				Size:   1,
				Sign:   Signed,
				Endian: BigEndian,
			},
			expected: -49,
		},
		{
			name: "Four Bytes Unsigned BigEndian",
			field: Field{
				Bytes:  []byte{0x12, 0x34, 0x56, 0x78},
				Size:   4,
				Sign:   Unsigned,
				Endian: BigEndian,
			},
			expected: 0x12345678,
		},
		{
			name: "Four Bytes Unsigned LittleEndian",
			field: Field{
				Bytes:  []byte{0x78, 0x56, 0x34, 0x12},
				Size:   4,
				Sign:   Unsigned,
				Endian: LittleEndian,
			},
			expected: 0x12345678,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result := tc.field.Decode()
			if result.Value != int(tc.expected) {
				t.Errorf("Expected %d (0x%X), got %d (0x%X)",
					tc.expected, tc.expected, result.Value, result.Value)
			}
		})
	}
}

func TestEncode(t *testing.T) {
	testCases := []struct {
		name        string
		field       Field
		expected    []byte
		expectError bool
	}{
		{
			name: "Signed BigEndian Positive",
			field: Field{
				Value:  0x1234,
				Size:   2,
				Sign:   Signed,
				Endian: BigEndian,
			},
			expected: []byte{0x12, 0x34},
		},
		{
			name: "Signed BigEndian Negative",
			field: Field{
				Value:  -2,
				Size:   2,
				Sign:   Signed,
				Endian: BigEndian,
			},
			expected: []byte{0xFF, 0xFE},
		},
		{
			name: "Signed LittleEndian Positive",
			field: Field{
				Value:  0x1234,
				Size:   2,
				Sign:   Signed,
				Endian: LittleEndian,
			},
			expected: []byte{0x34, 0x12},
		},
		{
			name: "Signed LittleEndian Negative",
			field: Field{
				Value:  -2,
				Size:   2,
				Sign:   Signed,
				Endian: LittleEndian,
			},
			expected: []byte{0xFE, 0xFF},
		},
		{
			name: "Unsigned BigEndian",
			field: Field{
				Value:  0xFFFE,
				Size:   2,
				Sign:   Unsigned,
				Endian: BigEndian,
			},
			expected: []byte{0xFF, 0xFE},
		},
		{
			name: "Unsigned LittleEndian",
			field: Field{
				Value:  0xFFFE,
				Size:   2,
				Sign:   Unsigned,
				Endian: LittleEndian,
			},
			expected: []byte{0xFE, 0xFF},
		},
		{
			name: "Single Byte Signed Positive",
			field: Field{
				Value:  127,
				Size:   1,
				Sign:   Signed,
				Endian: BigEndian,
			},
			expected: []byte{0x7F},
		},
		{
			name: "Single Byte Signed Negative",
			field: Field{
				Value:  -49,
				Size:   1,
				Sign:   Signed,
				Endian: BigEndian,
			},
			expected: []byte{0xCF},
		},
		{
			name: "Four Bytes Unsigned BigEndian",
			field: Field{
				Value:  0x12345678,
				Size:   4,
				Sign:   Unsigned,
				Endian: BigEndian,
			},
			expected: []byte{0x12, 0x34, 0x56, 0x78},
		},
		{
			name: "Four Bytes Unsigned LittleEndian",
			field: Field{
				Value:  0x12345678,
				Size:   4,
				Sign:   Unsigned,
				Endian: LittleEndian,
			},
			expected: []byte{0x78, 0x56, 0x34, 0x12},
		},
		{
			name: "Value Too Large For Size",
			field: Field{
				Value:  0x1234,
				Size:   1,
				Sign:   Unsigned,
				Endian: BigEndian,
			},
			expectError: true,
		},
		{
			name: "Negative Value For Unsigned",
			field: Field{
				Value:  -1,
				Size:   2,
				Sign:   Unsigned,
				Endian: BigEndian,
			},
			expectError: true,
		},
		{
			name: "Invalid Sign Value",
			field: Field{
				Value:  123,
				Size:   2,
				Sign:   3, // Invalid sign value
				Endian: BigEndian,
			},
			expectError: true,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result, err := tc.field.Encode()

			if tc.expectError {
				if err == nil {
					t.Error("Expected error but got nil")
				}
				return
			}

			if err != nil {
				t.Errorf("Unexpected error: %v", err)
				return
			}

			if len(result.Bytes) != len(tc.expected) {
				t.Errorf("Expected %d bytes, got %d bytes", len(tc.expected), len(result.Bytes))
				return
			}

			for i := 0; i < len(tc.expected); i++ {
				if result.Bytes[i] != tc.expected[i] {
					t.Errorf("Byte %d: expected 0x%02X, got 0x%02X",
						i, tc.expected[i], result.Bytes[i])
				}
			}
		})
	}
}

func TestCheckBit(t *testing.T) {
	testBytes := []byte{0x12, 0x34}
	field := Field{
		Bytes: testBytes,
		Size:  len(testBytes),
	}
	for i := 0; i < field.Size*8; i++ {
		if field.CheckBit(i) != int((testBytes[i/8]>>uint(7-i%8))&1) {
			t.Errorf("Expected %d, got %d", int((testBytes[i/8]>>uint(7-i%8))&1), field.CheckBit(i))
		}
	}
}
