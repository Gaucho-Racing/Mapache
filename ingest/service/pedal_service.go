package service

import "ingest/model/gr24"

func CreatePedal(pedal gr24.Pedal) error {
	if result := DB.Create(&pedal); result.Error != nil {
		return result.Error
	}
	return nil
}
