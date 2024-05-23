package api

import (
	"github.com/gin-gonic/gin"
	"net/http"
	"rincon/model"
	"rincon/service"
	"strconv"
)

func GetAllServices(c *gin.Context) {
	result := service.GetAllServices()
	c.JSON(http.StatusOK, result)
}

func GetService(c *gin.Context) {
	if i, err := strconv.Atoi(c.Param("name")); err == nil {
		// integer id passed
		result := service.GetServiceByID(i)
		if result.ID != i {
			c.JSON(http.StatusNotFound, gin.H{"message": "No service with id " + strconv.Itoa(i) + " found"})
			return
		}
		c.JSON(http.StatusOK, result)
		return
	}
	// string name passed
	result := service.GetServicesByName(c.Param("name"))
	c.JSON(http.StatusOK, result)
}

func CreateService(c *gin.Context) {
	var input model.Service
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	createdService, err := service.CreateService(input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, createdService)
}

func RemoveService(c *gin.Context) {
	if id, err := strconv.Atoi(c.Param("name")); err == nil {
		service.RemoveService(id)
		c.JSON(http.StatusOK, gin.H{"message": "Service with id " + strconv.Itoa(id) + " removed"})
		return
	}
	c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid service id"})
}
