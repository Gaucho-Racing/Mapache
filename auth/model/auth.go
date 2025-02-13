package model

import (
	"auth/config"
	"fmt"

	"github.com/golang-jwt/jwt/v4"
)

type AuthClaims struct {
	Scope string `json:"scope"`
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

	if !c.VerifyIssuer("https://sso.gauchoracing.com", true) {
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
