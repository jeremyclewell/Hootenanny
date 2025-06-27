import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertEventSchema, insertItemSchema, claimItemSchema } from "@shared/schema";
import { getThemeItems } from "../client/src/lib/theme-items";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  const clients = new Map<WebSocket, string>(); // WebSocket -> eventId

  wss.on('connection', (ws) => {
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'join' && message.eventId) {
          clients.set(ws, message.eventId);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
    });
  });

  // Broadcast updates to all clients watching an event
  function broadcastToEvent(eventId: string, data: any) {
    clients.forEach((watchedEventId, client) => {
      if (watchedEventId === eventId && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  }

  // Create new event
  app.post("/api/events", async (req, res) => {
    try {
      const eventData = insertEventSchema.parse(req.body);
      const event = await storage.createEvent(eventData);
      
      // Add theme-based items
      const themeItems = getThemeItems(eventData.theme);
      for (const item of themeItems) {
        await storage.addItem({
          eventId: event.id,
          name: item.name,
          category: item.category,
          isCustom: false,
          claimedBy: null,
          claimedByEmail: null,
        });
      }
      
      res.json(event);
    } catch (error) {
      res.status(400).json({ message: "Invalid event data" });
    }
  });

  // Get event by ID
  app.get("/api/events/:id", async (req, res) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch event" });
    }
  });

  // Get event items
  app.get("/api/events/:id/items", async (req, res) => {
    try {
      const items = await storage.getEventItems(req.params.id);
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch items" });
    }
  });

  // Get event stats
  app.get("/api/events/:id/stats", async (req, res) => {
    try {
      const stats = await storage.getEventStats(req.params.id);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Add custom item
  app.post("/api/events/:id/items", async (req, res) => {
    try {
      const itemData = insertItemSchema.parse({
        ...req.body,
        eventId: req.params.id,
        isCustom: true,
      });
      const item = await storage.addItem(itemData);
      
      // Broadcast update
      broadcastToEvent(req.params.id, {
        type: 'itemAdded',
        item,
      });
      
      res.json(item);
    } catch (error) {
      res.status(400).json({ message: "Invalid item data" });
    }
  });

  // Claim item
  app.post("/api/items/:id/claim", async (req, res) => {
    try {
      const claimData = claimItemSchema.parse(req.body);
      const item = await storage.claimItem(
        parseInt(req.params.id), 
        claimData.name, 
        claimData.email || undefined
      );
      
      if (!item) {
        return res.status(400).json({ message: "Item not found or already claimed" });
      }
      
      // Broadcast update
      broadcastToEvent(item.eventId, {
        type: 'itemClaimed',
        item,
      });
      
      res.json(item);
    } catch (error) {
      res.status(400).json({ message: "Invalid claim data" });
    }
  });

  return httpServer;
}
