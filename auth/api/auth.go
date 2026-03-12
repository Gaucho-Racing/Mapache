package api

import (
	"net/http"

	"github.com/gaucho-racing/mapache/auth/service"
	"github.com/gin-gonic/gin"
)

func Login(c *gin.Context) {
	code := c.Query("code")
	if code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "code is required"})
		return
	}
	token, err := service.ExchangeCodeForToken(code)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, token)
}
