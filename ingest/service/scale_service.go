package service

import (
	"os"
	"strconv"
	"strings"
)

func GetScaleEnvVar(suffix string, node string, variable string) float64 {
	scaleVar := os.Getenv("SCALE_" + strings.ToUpper(suffix) + "_" + strings.ToUpper(node) + "_" + strings.ToUpper(variable))
	if scaleVar != "" {
		scaleFloat, err := strconv.ParseFloat(scaleVar, 64)
		if err != nil {
			return 1
		}
		return scaleFloat
	}
	return 1
}
