package controller

import (
	"github.com/gin-gonic/gin"
	"ingest/model"
	"ingest/service"
	"net/http"
)

func RegisterAccount(c *gin.Context) {
	var input model.User
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	if service.GetIDForEmail(input.Email) != "" {
		c.JSON(http.StatusConflict, gin.H{"message": "Account with this email already exists"})
		return
	}
	token, err := service.RegisterAccount(input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"id": service.GetIDForEmail(input.Email), "token": token})
}

func LoginAccount(c *gin.Context) {
	var input model.User
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	if service.GetIDForEmail(input.Email) == "" {
		c.JSON(http.StatusNotFound, gin.H{"message": "Account with this email does not exist"})
		return
	}
	token, err := service.LoginAccount(input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"id": service.GetIDForEmail(input.Email), "token": token})
}
