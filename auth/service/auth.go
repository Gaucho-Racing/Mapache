package service

import (
	"context"
	"fmt"

	"github.com/gaucho-racing/mapache/auth/config"
	"github.com/gaucho-racing/mapache/auth/model"
	"github.com/gaucho-racing/mapache/auth/pkg/logger"
	"github.com/golang-jwt/jwt/v4"
	"github.com/lestrrat-go/jwx/jwk"
)

// jwksKeySet caches the JWKS document fetched from Sentinel at boot.
// Loaded once on Init; the per-request validation path looks up the
// signing key by the token's `kid` header. Multiple active keys is
// the normal state in Sentinel v5 (key rotation), so we can't just
// pin the first one like the v4 client did.
var jwksKeySet jwk.Set

func InitializeKeys() {
	set, err := jwk.Fetch(context.Background(), config.Sentinel.Url+"/api/core/keys")
	if err != nil {
		logger.SugarLogger.Errorln("Failed to fetch JWKS:", err)
		return
	}
	if set.Len() == 0 {
		logger.SugarLogger.Errorln("No keys found in JWKS")
		return
	}
	jwksKeySet = set
	logger.SugarLogger.Infof("Loaded %d signing key(s) from Sentinel JWKS", set.Len())
}

func ValidateJWT(token string) (*model.AuthClaims, error) {
	claims := &model.AuthClaims{}
	_, err := jwt.ParseWithClaims(token, claims, func(t *jwt.Token) (interface{}, error) {
		if jwksKeySet == nil {
			return nil, fmt.Errorf("JWKS not initialized")
		}
		kid, _ := t.Header["kid"].(string)
		var key jwk.Key
		if kid != "" {
			if k, ok := jwksKeySet.LookupKeyID(kid); ok {
				key = k
			}
		}
		// Token without a kid (or kid not in the set) — fall back to the
		// first key. Sentinel v5 currently issues a single active key, so
		// this keeps validation working while we wait for real rotation.
		if key == nil {
			k, ok := jwksKeySet.Get(0)
			if !ok {
				return nil, fmt.Errorf("no keys available")
			}
			key = k
		}
		var raw interface{}
		if err := key.Raw(&raw); err != nil {
			return nil, fmt.Errorf("decode signing key: %w", err)
		}
		return raw, nil
	})
	if err != nil {
		logger.SugarLogger.Errorln(err.Error())
		return nil, err
	}
	return claims, nil
}
