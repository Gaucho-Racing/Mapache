package api

import (
	"net/http"

	mapache "github.com/gaucho-racing/mapache/mapache-go/v3"
	"github.com/gaucho-racing/mapache/vehicle/service"
	ulid "github.com/gaucho-racing/ulid-go"
	"github.com/gin-gonic/gin"
)

func GetAllDashboards(c *gin.Context) {
	c.JSON(http.StatusOK, service.GetAllDashboards())
}

func GetDashboardByID(c *gin.Context) {
	d, err := service.GetDashboardByID(c.Param("dashboardID"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "dashboard not found"})
		return
	}
	c.JSON(http.StatusOK, d)
}

func CreateDashboard(c *gin.Context) {
	var input mapache.Dashboard
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	input.ID = ulid.Make().Prefixed("dsh")
	input.CreatedBy = c.GetString("Auth-UserID")
	d, err := service.CreateDashboard(input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, d)
}

func UpdateDashboard(c *gin.Context) {
	id := c.Param("dashboardID")
	existing, err := service.GetDashboardByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "dashboard not found"})
		return
	}
	var input mapache.Dashboard
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	// Preserve immutable fields. Name/description are the only mutable
	// dashboard-level fields; widgets are mutated via the widget endpoints.
	input.ID = id
	input.CreatedBy = existing.CreatedBy
	input.CreatedAt = existing.CreatedAt
	d, err := service.UpdateDashboard(input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, d)
}

func DeleteDashboard(c *gin.Context) {
	if err := service.DeleteDashboard(c.Param("dashboardID")); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "dashboard deleted"})
}

func CreateWidget(c *gin.Context) {
	var input mapache.DashboardWidget
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	input.ID = ulid.Make().Prefixed("wgt")
	input.DashboardID = c.Param("dashboardID")
	w, err := service.CreateWidget(input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, w)
}

// UpdateWidget is the hot endpoint — react-grid-layout's drag/resize
// fires a PUT every time the user releases a widget. The handler trusts
// the body to carry the full widget so the client can edit layout and
// config in one round-trip.
func UpdateWidget(c *gin.Context) {
	var input mapache.DashboardWidget
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	input.ID = c.Param("widgetID")
	input.DashboardID = c.Param("dashboardID")
	w, err := service.UpdateWidget(input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, w)
}

func DeleteWidget(c *gin.Context) {
	if err := service.DeleteWidget(c.Param("widgetID")); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "widget deleted"})
}
