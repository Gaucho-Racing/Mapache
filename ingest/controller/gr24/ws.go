package gr24controller

import (
	"github.com/gorilla/websocket"
	"net/http"
)

var SocketUpgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}
