package websocket

import (
	"encoding/json"
	"log/slog"
	"sync"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

// Message types for WebSocket communication
const (
	MessageTypeTaskCreated     = "task_created"
	MessageTypeTaskUpdated     = "task_updated"
	MessageTypeTaskDeleted     = "task_deleted"
	MessageTypeProjectCreated  = "project_created"
	MessageTypeProjectUpdated  = "project_updated"
	MessageTypeProjectDeleted  = "project_deleted"
	MessageTypeProjectAssigned = "project_assigned"   // User was assigned to a task in a project
	MessageTypeProjectRemoved  = "project_removed"    // User no longer has tasks in a project
)

// Message represents a WebSocket message
type Message struct {
	Type      string      `json:"type"`
	ProjectID string      `json:"project_id"`
	UserID    string      `json:"user_id,omitempty"`
	Data      interface{} `json:"data"`
}

// Client represents a WebSocket client connection
type Client struct {
	ID        uuid.UUID
	ProjectID string // For project-level subscriptions
	UserID    string // For user-level subscriptions
	Conn      *websocket.Conn
	Send      chan []byte
	Hub       *Hub
}

// Hub maintains the set of active clients and broadcasts messages
type Hub struct {
	// Registered clients by project ID
	clients map[string]map[*Client]bool
	
	// Registered clients by user ID (for user-level notifications)
	userClients map[string]map[*Client]bool
	
	// Register requests from clients
	register chan *Client
	
	// Unregister requests from clients
	unregister chan *Client
	
	// Broadcast message to all clients in a project
	broadcast chan *Message
	
	// Broadcast message to a specific user
	userBroadcast chan *Message
	
	mu sync.RWMutex
}

// NewHub creates a new Hub instance
func NewHub() *Hub {
	return &Hub{
		clients:       make(map[string]map[*Client]bool),
		userClients:   make(map[string]map[*Client]bool),
		register:      make(chan *Client),
		unregister:    make(chan *Client),
		broadcast:     make(chan *Message, 256),
		userBroadcast: make(chan *Message, 256),
	}
}

// Run starts the hub's main loop
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			// Register for project-level updates
			if client.ProjectID != "" {
				if h.clients[client.ProjectID] == nil {
					h.clients[client.ProjectID] = make(map[*Client]bool)
				}
				h.clients[client.ProjectID][client] = true
				slog.Info("Client connected to project", "project_id", client.ProjectID, "client_id", client.ID)
			}
			// Register for user-level updates
			if client.UserID != "" {
				if h.userClients[client.UserID] == nil {
					h.userClients[client.UserID] = make(map[*Client]bool)
				}
				h.userClients[client.UserID][client] = true
				slog.Info("Client connected for user", "user_id", client.UserID, "client_id", client.ID)
			}
			h.mu.Unlock()

		case client := <-h.unregister:
			h.mu.Lock()
			// Unregister from project-level
			if client.ProjectID != "" {
				if clients, ok := h.clients[client.ProjectID]; ok {
					if _, exists := clients[client]; exists {
						delete(clients, client)
						if len(clients) == 0 {
							delete(h.clients, client.ProjectID)
						}
					}
				}
			}
			// Unregister from user-level
			if client.UserID != "" {
				if clients, ok := h.userClients[client.UserID]; ok {
					if _, exists := clients[client]; exists {
						delete(clients, client)
						if len(clients) == 0 {
							delete(h.userClients, client.UserID)
						}
					}
				}
			}
			close(client.Send)
			h.mu.Unlock()
			slog.Info("Client disconnected", "client_id", client.ID)

		case message := <-h.broadcast:
			h.mu.RLock()
			clients := h.clients[message.ProjectID]
			h.mu.RUnlock()

			if clients != nil {
				data, err := json.Marshal(message)
				if err != nil {
					slog.Error("Failed to marshal message", "error", err)
					continue
				}

				for client := range clients {
					select {
					case client.Send <- data:
					default:
						h.mu.Lock()
						delete(h.clients[client.ProjectID], client)
						close(client.Send)
						h.mu.Unlock()
					}
				}
			}

		case message := <-h.userBroadcast:
			h.mu.RLock()
			clients := h.userClients[message.UserID]
			h.mu.RUnlock()

			if clients != nil {
				data, err := json.Marshal(message)
				if err != nil {
					slog.Error("Failed to marshal user message", "error", err)
					continue
				}

				for client := range clients {
					select {
					case client.Send <- data:
					default:
						h.mu.Lock()
						delete(h.userClients[client.UserID], client)
						close(client.Send)
						h.mu.Unlock()
					}
				}
			}
		}
	}
}

// Broadcast sends a message to all clients subscribed to a project
func (h *Hub) Broadcast(projectID string, msgType string, data interface{}) {
	h.broadcast <- &Message{
		Type:      msgType,
		ProjectID: projectID,
		Data:      data,
	}
}

// BroadcastToUser sends a message to a specific user
func (h *Hub) BroadcastToUser(userID string, msgType string, data interface{}) {
	h.userBroadcast <- &Message{
		Type:   msgType,
		UserID: userID,
		Data:   data,
	}
}

// ReadPump pumps messages from the WebSocket connection to the hub
func (c *Client) ReadPump() {
	defer func() {
		c.Hub.unregister <- c
		c.Conn.Close()
	}()

	for {
		_, _, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				slog.Error("WebSocket read error", "error", err)
			}
			break
		}
		// We don't process incoming messages from clients for now
	}
}

// WritePump pumps messages from the hub to the WebSocket connection
func (c *Client) WritePump() {
	defer func() {
		c.Conn.Close()
	}()

	for {
		message, ok := <-c.Send
		if !ok {
			c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
			return
		}

		if err := c.Conn.WriteMessage(websocket.TextMessage, message); err != nil {
			slog.Error("WebSocket write error", "error", err)
			return
		}
	}
}
