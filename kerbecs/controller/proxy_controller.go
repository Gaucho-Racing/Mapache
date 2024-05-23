package controller

import (
	"bytes"
	"github.com/bk1031/rincon-go"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/goccy/go-json"
	"github.com/google/uuid"
	"io"
	"kerbecs/config"
	"kerbecs/model"
	"kerbecs/utils"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strconv"
	"time"
)

func StartProxyServer() error {
	proxyRouter := SetupProxyRouter()
	InitializeProxyRoutes(proxyRouter)
	return proxyRouter.Run(":" + config.Port)
}

func SetupProxyRouter() *gin.Engine {
	if config.Env == "PROD" {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.Default()
	r.Use(cors.New(cors.Config{
		AllowAllOrigins:  true,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Length", "Content-Type", "Authorization"},
		MaxAge:           12 * time.Hour,
		AllowCredentials: true,
	}))
	r.Use(ProxyRequestLogger())
	r.Use(ProxyAuthMiddleware())
	r.Use(ProxyResponseLogger())
	return r
}

func InitializeProxyRoutes(router *gin.Engine) {
	router.Any("/*path", ProxyHandler)
}

func ProxyRequestLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID, _ := uuid.NewV7()
		c.Set("Request-ID", requestID.String())
		c.Set("Request-Start-Time", time.Now())
		utils.SugarLogger.Infoln("-------------------------------------------------------------------")
		utils.SugarLogger.Infoln(time.Now().Format("Mon Jan 02 15:04:05 MST 2006"))
		utils.SugarLogger.Infoln("REQUEST ID: " + requestID.String())
		utils.SugarLogger.Infoln("REQUEST ROUTE: " + c.Request.Host + c.Request.URL.String() + " [" + c.Request.Method + "]")
		bodyBytes, err := io.ReadAll(c.Request.Body)
		if err != nil {
			utils.SugarLogger.Infoln("REQUEST BODY: " + err.Error())
		} else {
			utils.SugarLogger.Infoln("REQUEST BODY: " + string(bodyBytes))
		}
		c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
		utils.SugarLogger.Infoln("REQUEST ORIGIN: " + c.ClientIP())
		c.Request.Header.Set("Request-ID", requestID.String())
		c.Next()
	}
}

func ProxyAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()
	}
}

func ProxyHandler(c *gin.Context) {
	//requestID := c.GetHeader("Request-ID")
	startTime, _ := c.Get("Request-Start-Time")
	println(c.Request.URL.Path)
	service, err := config.RinconClient.MatchRoute(c.Request.URL.Path)
	if err != nil {
		c.JSON(404, model.Response{
			Status:    "ERROR",
			Ping:      strconv.FormatInt(time.Now().Sub(startTime.(time.Time)).Milliseconds(), 10) + "ms",
			Gateway:   config.Service.FormattedNameWithVersion(),
			Service:   config.RinconClient.Rincon().FormattedNameWithVersion(),
			Timestamp: time.Now().Format("Mon Jan 02 15:04:05 MST 2006"),
			Data:      json.RawMessage("{\"message\": \"No service to handle route: " + c.Request.URL.String() + "\"}"),
		})
		return
	}
	utils.SugarLogger.Infoln("PROXY TO: (" + strconv.Itoa(service.ID) + ") " + service.Name + " @ " + service.Endpoint)
	endpoint, err := url.Parse(service.Endpoint)
	if err != nil {
		c.JSON(500, model.Response{
			Status:    "ERROR",
			Ping:      strconv.FormatInt(time.Now().Sub(startTime.(time.Time)).Milliseconds(), 10) + "ms",
			Gateway:   config.Service.FormattedNameWithVersion(),
			Service:   config.RinconClient.Rincon().FormattedNameWithVersion(),
			Timestamp: time.Now().Format("Mon Jan 02 15:04:05 MST 2006"),
			Data:      json.RawMessage("{\"message\": \"Failed to parse service endpoint: " + service.Endpoint + "\"}"),
		})
		return
	}
	proxy := httputil.NewSingleHostReverseProxy(endpoint)
	proxy.ModifyResponse = func(response *http.Response) error {
		respModel, err := BuildResponseStruct(response, *service)
		if err != nil {
			return err
		}
		respModel.Timestamp = time.Now().Format("Mon Jan 02 15:04:05 MST 2006")
		respModel.Ping = strconv.FormatInt(time.Now().Sub(startTime.(time.Time)).Milliseconds(), 10) + "ms"
		b, _ := json.Marshal(respModel)
		response.Body = io.NopCloser(bytes.NewReader(b))
		response.ContentLength = int64(len(b))
		response.Header.Set("Content-Length", strconv.Itoa(len(b)))
		return nil
	}
	proxy.ErrorHandler = func(writer http.ResponseWriter, request *http.Request, err error) {
		utils.SugarLogger.Errorln("Failed to proxy request: " + err.Error())
		writer.WriteHeader(502)
		respModel := model.Response{
			Status:    "ERROR",
			Ping:      strconv.FormatInt(time.Now().Sub(startTime.(time.Time)).Milliseconds(), 10) + "ms",
			Gateway:   config.Service.FormattedNameWithVersion(),
			Service:   service.FormattedNameWithVersion(),
			Timestamp: time.Now().Format("Mon Jan 02 15:04:05 MST 2006"),
		}
		respModel.Data = json.RawMessage("{\"message\": \"Failed to reach " + service.Name + ": " + err.Error() + "\"}")
		b, _ := json.Marshal(respModel)
		writer.Write(b)
	}
	proxy.ServeHTTP(c.Writer, c.Request)
}

func ProxyResponseLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()
		utils.SugarLogger.Infoln("RESPONSE STATUS: " + strconv.Itoa(c.Writer.Status()))
	}
}

func BuildResponseStruct(response *http.Response, proxiedService rincon.Service) (model.Response, error) {
	respModel := model.Response{
		Gateway: config.Service.FormattedNameWithVersion(),
		Service: proxiedService.FormattedNameWithVersion(),
	}
	bodyBytes, err := io.ReadAll(response.Body)
	if err != nil {
		utils.SugarLogger.Errorln("Failed to read response body: " + err.Error())
		return respModel, err
	}
	err = json.Unmarshal(bodyBytes, &respModel.Data)
	if err != nil {
		utils.SugarLogger.Errorln("Failed to unmarshall response body, returning as message string: " + err.Error())
		respModel.Data = json.RawMessage("{\"message\": \"" + string(bodyBytes) + "\"}")
	}
	if response.StatusCode < 200 {
		respModel.Status = "INFO"
	} else if response.StatusCode < 300 {
		respModel.Status = "SUCCESS"
	} else if response.StatusCode < 400 {
		respModel.Status = "REDIRECT"
	} else {
		respModel.Status = "ERROR"
	}
	return respModel, nil
}
