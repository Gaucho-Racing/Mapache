package controller

import (
	"github.com/gin-gonic/gin"
	"ingest/model"
	"ingest/service"
	"net/http"
)

func GetAllUsers(c *gin.Context) {
	result := service.GetAllUsers()
	c.JSON(http.StatusOK, result)
}

func GetUserByID(c *gin.Context) {
	result := service.GetUserByID(c.Param("userID"))
	if result.ID == "" {
		c.JSON(http.StatusNotFound, gin.H{"message": "No user found with given id: " + c.Param("userID")})
	} else {
		c.JSON(http.StatusOK, result)
	}
}

func CreateUser(c *gin.Context) {
	if service.GetRequestUserID(c) != c.Param("userID") && !service.RequestUserHasRole(c, "ADMIN") {
		c.JSON(http.StatusForbidden, gin.H{"message": "You are not authorized to edit this resource"})
		return
	}

	var input model.User
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	input.ID = c.Param("userID")
	err := service.CreateUser(input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, service.GetUserByID(input.ID))
}
