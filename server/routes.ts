import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertEventSchema, insertItemSchema, claimItemSchema, editItemSchema, submitVoteSchema, finalizeDateSchema, type Event } from "@shared/schema";
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

  // Strip the host token from event responses sent over the wire
  function publicEvent(event: Event): Omit<Event, "hostToken">;
  function publicEvent(event: Event | undefined): Omit<Event, "hostToken"> | undefined;
  function publicEvent(event: Event | undefined): Omit<Event, "hostToken"> | undefined {
    if (!event) return event;
    const { hostToken: _hostToken, ...rest } = event;
    return rest;
  }

  // Create new event
  app.post("/api/events", async (req, res) => {
    try {
      const eventData = insertEventSchema.parse(req.body);
      const event = await storage.createEvent(eventData);

      // Only seed theme items when this is a fixed-date event.
      // Polling events seed items after the host finalizes a date.
      if (event.pollStatus !== "polling") {
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
      }

      // Return the full event including the host token so the creator's
      // browser can store it in localStorage and prove ownership later.
      res.json(event);
    } catch (error) {
      res.status(400).json({ message: "Invalid event data" });
    }
  });

  // Get event by ID (host token stripped)
  app.get("/api/events/:id", async (req, res) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.json(publicEvent(event));
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

  // Get poll votes for an event
  app.get("/api/events/:id/votes", async (req, res) => {
    try {
      const votes = await storage.getEventVotes(req.params.id);
      res.json(votes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch votes" });
    }
  });

  // Submit or update a vote
  app.post("/api/events/:id/votes", async (req, res) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      if (event.pollStatus !== "polling") {
        return res.status(400).json({ message: "This event is not accepting votes" });
      }

      const voteData = submitVoteSchema.parse(req.body);

      // Only allow voting for dates that are part of the candidate set
      const candidateSet = new Set(event.candidateDates || []);
      const filtered = voteData.selectedDates.filter((d) => candidateSet.has(d));

      const vote = await storage.upsertVote(req.params.id, {
        ...voteData,
        selectedDates: filtered,
      });

      broadcastToEvent(req.params.id, {
        type: 'voteSubmitted',
        vote,
      });

      res.json(vote);
    } catch (error) {
      res.status(400).json({ message: "Invalid vote data" });
    }
  });

  // Finalize a date (host only)
  app.post("/api/events/:id/finalize", async (req, res) => {
    try {
      const { date, hostToken } = finalizeDateSchema.parse(req.body);

      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      if (event.hostToken !== hostToken) {
        return res.status(403).json({ message: "Only the event host can finalize the date" });
      }
      if (event.pollStatus !== "polling") {
        return res.status(400).json({ message: "This event is not in polling mode" });
      }

      const candidateSet = new Set(event.candidateDates || []);
      if (!candidateSet.has(date)) {
        return res.status(400).json({ message: "Date is not one of the candidate dates" });
      }

      const updated = await storage.finalizeEventDate(req.params.id, date);
      if (!updated) {
        return res.status(500).json({ message: "Failed to finalize date" });
      }

      // Seed the theme items now that there's a real date
      const existingItems = await storage.getEventItems(req.params.id);
      if (existingItems.length === 0) {
        const themeItems = getThemeItems(updated.theme);
        for (const item of themeItems) {
          await storage.addItem({
            eventId: updated.id,
            name: item.name,
            category: item.category,
            isCustom: false,
            claimedBy: null,
            claimedByEmail: null,
          });
        }
      }

      broadcastToEvent(req.params.id, {
        type: 'dateFinalized',
        event: publicEvent(updated),
      });

      res.json(publicEvent(updated));
    } catch (error) {
      res.status(400).json({ message: "Invalid finalize data" });
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

  // Update item (only unclaimed items)
  app.put("/api/items/:id", async (req, res) => {
    try {
      const itemId = parseInt(req.params.id);
      const updateData = editItemSchema.parse(req.body);

      // First get the item to check if it's unclaimed
      const items = await storage.getEventItems(req.body.eventId);
      const item = items.find(i => i.id === itemId);

      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }

      if (item.claimedBy) {
        return res.status(400).json({ message: "Cannot edit claimed items" });
      }

      const updatedItem = await storage.updateItem(itemId, updateData);

      if (!updatedItem) {
        return res.status(500).json({ message: "Failed to update item" });
      }

      // Broadcast update
      broadcastToEvent(item.eventId, {
        type: 'itemUpdated',
        item: updatedItem,
      });

      res.json(updatedItem);
    } catch (error) {
      res.status(400).json({ message: "Invalid update data" });
    }
  });

  // Unclaim item
  app.post("/api/items/:id/unclaim", async (req, res) => {
    try {
      const itemId = parseInt(req.params.id);
      const { eventId } = req.body;

      if (!eventId) {
        return res.status(400).json({ message: "Event ID is required" });
      }

      // First get the item to check if it's claimed
      const items = await storage.getEventItems(eventId);
      const item = items.find(i => i.id === itemId);

      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }

      if (!item.claimedBy) {
        return res.status(400).json({ message: "Item is not claimed" });
      }

      const unclaimedItem = await storage.unclaimItem(itemId);

      if (!unclaimedItem) {
        return res.status(500).json({ message: "Failed to unclaim item" });
      }

      // Broadcast update
      broadcastToEvent(eventId, {
        type: 'itemUnclaimed',
        item: unclaimedItem,
      });

      res.json(unclaimedItem);
    } catch (error) {
      res.status(500).json({ message: "Failed to unclaim item" });
    }
  });

  // Delete item (only unclaimed items)
  app.delete("/api/items/:id", async (req, res) => {
    try {
      const itemId = parseInt(req.params.id);
      const { eventId } = req.body;

      if (!eventId) {
        return res.status(400).json({ message: "Event ID is required" });
      }

      // First get the item to check if it's unclaimed
      const items = await storage.getEventItems(eventId);
      const item = items.find(i => i.id === itemId);

      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }

      if (item.claimedBy) {
        return res.status(400).json({ message: "Cannot delete claimed items" });
      }

      const success = await storage.deleteItem(itemId);

      if (!success) {
        return res.status(500).json({ message: "Failed to delete item" });
      }

      // Broadcast update
      broadcastToEvent(eventId, {
        type: 'itemDeleted',
        itemId: itemId,
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete item" });
    }
  });

  return httpServer;
}
