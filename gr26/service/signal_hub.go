package service

import (
	"sync"

	mapache "github.com/gaucho-racing/mapache/mapache-go"
	"github.com/gorilla/websocket"
)

type Client struct {
	Conn *websocket.Conn
	Send chan mapache.Signal
}

type SignalHub struct {
	mu          sync.RWMutex
	subscribers map[string]map[string]map[*Client]struct{}
}

var Hub *SignalHub

func init() {
	Hub = NewSignalHub()
}

func NewSignalHub() *SignalHub {
	return &SignalHub{
		subscribers: make(map[string]map[string]map[*Client]struct{}),
	}
}

func (h *SignalHub) Subscribe(vehicleID string, signalNames []string, client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.subscribers[vehicleID] == nil {
		h.subscribers[vehicleID] = make(map[string]map[*Client]struct{})
	}
	for _, name := range signalNames {
		if h.subscribers[vehicleID][name] == nil {
			h.subscribers[vehicleID][name] = make(map[*Client]struct{})
		}
		h.subscribers[vehicleID][name][client] = struct{}{}
	}
}

func (h *SignalHub) Unsubscribe(vehicleID string, signalNames []string, client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	signals, ok := h.subscribers[vehicleID]
	if !ok {
		return
	}
	for _, name := range signalNames {
		clients, ok := signals[name]
		if !ok {
			continue
		}
		delete(clients, client)
		if len(clients) == 0 {
			delete(signals, name)
		}
	}
	if len(signals) == 0 {
		delete(h.subscribers, vehicleID)
	}
}

func (h *SignalHub) Publish(signal mapache.Signal) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	signals, ok := h.subscribers[signal.VehicleID]
	if !ok {
		return
	}
	clients, ok := signals[signal.Name]
	if !ok {
		return
	}
	for client := range clients {
		select {
		case client.Send <- signal:
		default:
		}
	}
}
