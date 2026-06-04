package model

import "time"

// ShelterIngested tracks which shelter parquet files we've already
// pulled in. file_ulid is the ULID embedded in shelter's S3 object key
// (the bit after "batch_" in "batch_01k....parquet"); we treat that as
// the natural primary key so a duplicate poll or restart is a no-op.
type ShelterIngested struct {
	FileULID  string    `json:"file_ulid" gorm:"primaryKey"`
	S3Key     string    `json:"s3_key"`
	Rows      int       `json:"rows"`
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime;precision:6"`
}

func (ShelterIngested) TableName() string {
	return "gr26_shelter_ingested"
}
