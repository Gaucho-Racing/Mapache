package utils

import (
	"math/rand"
	"rincon/config"
	"strconv"
	"strings"
)

func GenerateID(length int) int {
	if length == 0 {
		length, _ = strconv.Atoi(config.ServiceIDLength)
	}
	var id string
	for i := 0; i < length; i++ {
		if i == 0 {
			id += strconv.Itoa(rand.Intn(9) + 1)
		} else {
			id += strconv.Itoa(rand.Intn(10))
		}
	}
	idInt, _ := strconv.Atoi(id)
	return idInt
}

func NormalizeName(name string) string {
	return strings.ToLower(strings.ReplaceAll(name, " ", "_"))
}
