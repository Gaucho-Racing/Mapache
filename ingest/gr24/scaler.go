package gr24

import (
	"ingest/utils"
	"os"
	"reflect"
	"strconv"
	"strings"
)

func AutoScale(node interface{}) interface{} {
	t := reflect.TypeOf(node)
	t.Field()
	return node
}

func getScaleValue(node string, field string) float64 {
	scaleVar := os.Getenv("SCALE_GR24_" + strings.ToUpper(node) + "_" + strings.ToUpper(field))
	if scaleVar != "" {
		scaleFloat, err := strconv.ParseFloat(scaleVar, 64)
		if err != nil {
			utils.SugarLogger.Errorln(err)
			return 1
		}
		return scaleFloat
	}
	return 1
}
