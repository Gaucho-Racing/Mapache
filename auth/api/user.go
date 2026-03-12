package api

import (
	"net/http"

	"github.com/gaucho-racing/mapache/auth/service"
	"github.com/gin-gonic/gin"
)

func GetAllUsers(c *gin.Context) {
	users, err := service.GetAllUsers()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, users)
}

func GetUser(c *gin.Context) {
	user, err := service.GetUser(c.Param("userID"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, user)
}

func GetCurrentUser(c *gin.Context) {
	user, err := service.GetCurrentUser(c.GetString("Auth-Token"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, user)
}
