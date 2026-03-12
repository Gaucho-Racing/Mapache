package service

import (
	"context"

	"github.com/gaucho-racing/mapache/auth/config"
	"github.com/gaucho-racing/mapache/auth/model"
	"github.com/gaucho-racing/mapache/auth/pkg/logger"
	"github.com/golang-jwt/jwt/v4"
	"github.com/lestrrat-go/jwx/jwk"
)

var publicKey interface{}

func InitializeKeys() {
	set, err := jwk.Fetch(context.Background(), config.Sentinel.JwksUrl)
	if err != nil {
		logger.SugarLogger.Errorln("Failed to fetch JWKS:", err)
		return
	}

	key, ok := set.Get(0)
	if !ok {
		logger.SugarLogger.Errorln("No keys found in JWKS")
		return
	}

	if err := key.Raw(&publicKey); err != nil {
		logger.SugarLogger.Errorln("Failed to get public key:", err)
		return
	}
}

func ValidateJWT(token string) (*model.AuthClaims, error) {
	claims := &model.AuthClaims{}
	_, err := jwt.ParseWithClaims(token, claims, func(token *jwt.Token) (interface{}, error) {
		return publicKey, nil
	})
	if err != nil {
		logger.SugarLogger.Errorln(err.Error())
		return nil, err
	}
	return claims, nil
}
