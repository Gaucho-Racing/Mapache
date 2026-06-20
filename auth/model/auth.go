package model

import (
	"fmt"

	"github.com/gaucho-racing/mapache/auth/config"
	"github.com/golang-jwt/jwt/v4"
)

// AuthClaims is the Sentinel v5 JWT payload we care about. sub is the
// signer's entity id; user_id is a custom claim Sentinel stamps when the
// token represents a logged-in user (absent for service-account tokens).
type AuthClaims struct {
	Scope  string `json:"scope"`
	UserID string `json:"user_id"`
	jwt.RegisteredClaims
}

func (c AuthClaims) Valid() error {
	vErr := new(jwt.ValidationError)
	now := jwt.TimeFunc()

	if !c.VerifyExpiresAt(now, true) {
		delta := now.Sub(c.ExpiresAt.Time)
		vErr.Inner = fmt.Errorf("%s by %s", jwt.ErrTokenExpired, delta)
		vErr.Errors |= jwt.ValidationErrorExpired
	}

	if !c.VerifyIssuedAt(now, true) {
		vErr.Inner = jwt.ErrTokenUsedBeforeIssued
		vErr.Errors |= jwt.ValidationErrorIssuedAt
	}

	if !c.VerifyIssuer(config.SentinelIssuer, true) {
		vErr.Inner = jwt.ErrTokenInvalidIssuer
		vErr.Errors |= jwt.ValidationErrorIssuer
	}

	if !c.VerifyAudience(config.Sentinel.ClientID, true) {
		vErr.Inner = jwt.ErrTokenInvalidAudience
		vErr.Errors |= jwt.ValidationErrorAudience
	}

	if vErr.Errors == 0 {
		return nil
	}

	return vErr
}
