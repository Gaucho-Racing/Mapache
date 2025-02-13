package service

import (
	"auth/config"
	"auth/model"
	"auth/utils"
	"context"

	"github.com/golang-jwt/jwt/v4"
	"github.com/lestrrat-go/jwx/jwk"
)

var publicKey interface{}

func InitializeKeys() {
	set, err := jwk.Fetch(context.Background(), config.Sentinel.JwksUrl)
	if err != nil {
		utils.SugarLogger.Errorln("Failed to fetch JWKS:", err)
		return
	}

	key, ok := set.Get(0)
	if !ok {
		utils.SugarLogger.Errorln("No keys found in JWKS")
		return
	}

	if err := key.Raw(&publicKey); err != nil {
		utils.SugarLogger.Errorln("Failed to get public key:", err)
		return
	}
}

func ValidateJWT(token string) (*model.AuthClaims, error) {
	claims := &model.AuthClaims{}
	_, err := jwt.ParseWithClaims(token, claims, func(token *jwt.Token) (interface{}, error) {
		return publicKey, nil
	})
	if err != nil {
		utils.SugarLogger.Errorln(err.Error())
		return nil, err
	}
	return claims, nil
}
