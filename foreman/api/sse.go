package api

import (
	"time"

	"github.com/gaucho-racing/mapache/foreman/service"
	"github.com/gin-gonic/gin"
)

// StreamJobEvents pushes the job's current state to the client as SSE,
// re-sending on a tick until the job reaches a terminal status or the
// client disconnects. The route is configured envelope:passthrough in
// kerbecs so the stream is not wrapped.
func StreamJobEvents(c *gin.Context) {
	id := c.Param("id")
	job, err := service.Get(id)
	if respondServiceErr(c, err) {
		return
	}

	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no")

	c.SSEvent("job", job)
	c.Writer.Flush()
	if job.IsTerminal() {
		return
	}

	ctx := c.Request.Context()
	ticker := time.NewTicker(time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			job, err := service.Get(id)
			if err != nil {
				return
			}
			c.SSEvent("job", job)
			c.Writer.Flush()
			if job.IsTerminal() {
				return
			}
		}
	}
}
