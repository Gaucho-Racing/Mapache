package model

import (
	"encoding/json"
	"reflect"
	"strings"
	"testing"
)

var secretMarkers = []string{"hash", "secret", "password"}

func TestModelsNeverSerializeSecrets(t *testing.T) {
	for _, m := range All() {
		name := reflect.TypeOf(m).Elem().Name()
		raw, err := json.Marshal(m)
		if err != nil {
			t.Fatalf("%s: marshal: %v", name, err)
		}
		var fields map[string]any
		if err := json.Unmarshal(raw, &fields); err != nil {
			t.Fatalf("%s: unmarshal: %v", name, err)
		}
		for key := range fields {
			for _, marker := range secretMarkers {
				if strings.Contains(strings.ToLower(key), marker) {
					t.Errorf("%s serializes %q; tag it json:\"-\"", name, key)
				}
			}
		}
	}
}

func TestAllModelsDeclareSchemaQualifiedTable(t *testing.T) {
	type tabler interface{ TableName() string }
	for _, m := range All() {
		name := reflect.TypeOf(m).Elem().Name()
		tm, ok := m.(tabler)
		if !ok {
			t.Errorf("%s has no TableName method", name)
			continue
		}
		if parts := strings.Split(tm.TableName(), "."); len(parts) != 2 || parts[0] == "" || parts[1] == "" {
			t.Errorf("%s.TableName() = %q, want <schema>.<table>", name, tm.TableName())
		}
	}
}
