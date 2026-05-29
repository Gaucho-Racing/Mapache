package mapache

import "testing"

func TestJSON_ValueReturnsStringForJSONB(t *testing.T) {
	j := JSON(`{"a":1}`)
	v, err := j.Value()
	if err != nil {
		t.Fatalf("Value failed: %v", err)
	}
	s, ok := v.(string)
	if !ok {
		t.Fatalf("expected string driver value (for implicit jsonb cast), got %T", v)
	}
	if s != `{"a":1}` {
		t.Errorf("got %q, want %q", s, `{"a":1}`)
	}
}

func TestJSON_ValueNilWhenEmpty(t *testing.T) {
	var j JSON
	v, err := j.Value()
	if err != nil {
		t.Fatalf("Value failed: %v", err)
	}
	if v != nil {
		t.Errorf("expected nil driver value for empty JSON, got %v", v)
	}
}

func TestJSON_ScanFromBytesAndString(t *testing.T) {
	var fromBytes JSON
	if err := fromBytes.Scan([]byte(`{"b":2}`)); err != nil {
		t.Fatalf("Scan([]byte) failed: %v", err)
	}
	if string(fromBytes) != `{"b":2}` {
		t.Errorf("got %q", fromBytes)
	}

	var fromString JSON
	if err := fromString.Scan(`{"c":3}`); err != nil {
		t.Fatalf("Scan(string) failed: %v", err)
	}
	if string(fromString) != `{"c":3}` {
		t.Errorf("got %q", fromString)
	}
}

func TestJSON_ScanNil(t *testing.T) {
	j := JSON(`{"old":1}`)
	if err := j.Scan(nil); err != nil {
		t.Fatalf("Scan(nil) failed: %v", err)
	}
	if j != nil {
		t.Errorf("expected nil after scanning nil, got %q", j)
	}
}

func TestJSON_ScanUnsupportedType(t *testing.T) {
	var j JSON
	if err := j.Scan(42); err == nil {
		t.Error("expected error scanning unsupported type, got nil")
	}
}
