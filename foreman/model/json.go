package model

import (
	"database/sql/driver"
	"errors"
)

// JSON is a jsonb column that round-trips as raw JSON in API responses.
// A plain []byte would marshal to base64 via encoding/json; this renders
// the stored object (params/result) as-is.
type JSON []byte

func (j JSON) MarshalJSON() ([]byte, error) {
	if len(j) == 0 {
		return []byte("null"), nil
	}
	return j, nil
}

func (j *JSON) UnmarshalJSON(b []byte) error {
	if j == nil {
		return errors.New("model.JSON: UnmarshalJSON on nil pointer")
	}
	*j = append((*j)[0:0], b...)
	return nil
}

func (j JSON) Value() (driver.Value, error) {
	if len(j) == 0 {
		return nil, nil
	}
	return string(j), nil
}

func (j *JSON) Scan(value any) error {
	switch v := value.(type) {
	case nil:
		*j = nil
	case []byte:
		*j = append((*j)[0:0], v...)
	case string:
		*j = append((*j)[0:0], v...)
	default:
		return errors.New("model.JSON: unsupported Scan type")
	}
	return nil
}
