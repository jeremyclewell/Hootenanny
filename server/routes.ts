import type { Express, RequestHandler, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertEventSchema, customItemSchema, claimItemSchema, editItemSchema, submitVoteSchema, finalizeDateSchema, addCandidateDatesSchema, reopenPollSchema, submitRsvpSchema, submitCommentSchema, type Event } from "@shared/schema";
import { getThemeItems } from "../client/src/lib/theme-items";
import { setupAuth, isAuthenticated, registerAuthRoutes } from "./replit_integrations/auth";

function getUserId(req: any): string | undefined {
  return req.user?.claims?.sub;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Wire Replit Auth — must come before other routes that use req.user
  await setupAuth(app);
  registerAuthRoutes(app);

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

  // Helper: check whether the requester owns this event. Optionally
  // accepts authentication state — if the user isn't logged in, returns
  // false. Used to gate host-only actions (publish, delete, finalize,
  // candidate-dates, reopen, rsvp removal).
  function isOwner(req: any, event: Event): boolean {
    const userId = getUserId(req);
    return !!userId && userId === event.ownerId;
  }

  // Helper: verify event is visible to the requester. Drafts are owner-only.
  function canViewEvent(req: any, event: Event): boolean {
    if (event.status === "published") return true;
    return isOwner(req, event);
  }

  // Standard 403 for draft events viewed by non-owners
  function respondDraftHidden(res: Response) {
    return res.status(403).json({ message: "Event is not published yet", status: "draft" });
  }

  // Create new event (requires login)
  app.post("/api/events", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req)!;
      const eventData = insertEventSchema.parse(req.body);
      const event = await storage.createEvent(userId, eventData);

      // Seed theme items at creation so the host can prep the menu
      // (add / edit / remove items) even while a date poll is open.
      const themeItems = getThemeItems(eventData.theme);
      await storage.addItems(
        themeItems.map((item) => ({
          eventId: event.id,
          name: item.name,
          category: item.category,
          isCustom: false,
          claimedBy: null,
          claimedByEmail: null,
        })),
      );

      res.json(event);
    } catch (error) {
      res.status(400).json({ message: "Invalid event data" });
    }
  });

  // List the current user's events (authored by them)
  app.get("/api/my/events", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req)!;
      const events = await storage.getEventsByOwner(userId);
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  // Publish a draft event (owner only)
  app.post("/api/events/:id/publish", isAuthenticated, async (req: any, res) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event) return res.status(404).json({ message: "Event not found" });
      if (!isOwner(req, event)) return res.status(403).json({ message: "Only the event owner can publish" });
      const updated = await storage.updateEventStatus(req.params.id, "published");
      if (!updated) return res.status(500).json({ message: "Failed to publish" });
      broadcastToEvent(req.params.id, { type: "eventPublished", event: updated });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to publish event" });
    }
  });

  // Unpublish back to draft (owner only)
  app.post("/api/events/:id/unpublish", isAuthenticated, async (req: any, res) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event) return res.status(404).json({ message: "Event not found" });
      if (!isOwner(req, event)) return res.status(403).json({ message: "Only the event owner can unpublish" });
      const updated = await storage.updateEventStatus(req.params.id, "draft");
      if (!updated) return res.status(500).json({ message: "Failed to unpublish" });
      broadcastToEvent(req.params.id, { type: "eventUnpublished", event: updated });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to unpublish event" });
    }
  });

  // Delete an event (owner only)
  app.delete("/api/events/:id", isAuthenticated, async (req: any, res) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event) return res.status(404).json({ message: "Event not found" });
      if (!isOwner(req, event)) return res.status(403).json({ message: "Only the event owner can delete this event" });
      const ok = await storage.deleteEvent(req.params.id);
      if (!ok) return res.status(500).json({ message: "Failed to delete" });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  // Get event by ID. Drafts are visible only to the owner.
  app.get("/api/events/:id", async (req: any, res) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      if (!canViewEvent(req, event)) return respondDraftHidden(res);
      res.json(event);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch event" });
    }
  });

  // Get event items
  app.get("/api/events/:id/items", async (req: any, res) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event) return res.status(404).json({ message: "Event not found" });
      if (!canViewEvent(req, event)) return respondDraftHidden(res);
      const items = await storage.getEventItems(req.params.id);
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch items" });
    }
  });

  // Get event stats
  app.get("/api/events/:id/stats", async (req: any, res) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event) return res.status(404).json({ message: "Event not found" });
      if (!canViewEvent(req, event)) return respondDraftHidden(res);
      const stats = await storage.getEventStats(req.params.id);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Get poll votes for an event (voter emails are stripped — they are
  // private to the host and never displayed in the UI)
  app.get("/api/events/:id/votes", async (req: any, res) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event) return res.status(404).json({ message: "Event not found" });
      if (!canViewEvent(req, event)) return respondDraftHidden(res);
      const votes = await storage.getEventVotes(req.params.id);
      const publicVotes = votes.map(({ voterEmail: _voterEmail, ...rest }) => rest);
      res.json(publicVotes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch votes" });
    }
  });

  // Submit or update a vote
  app.post("/api/events/:id/votes", async (req: any, res) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      if (!canViewEvent(req, event)) return respondDraftHidden(res);
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

  // Finalize a date (owner only)
  app.post("/api/events/:id/finalize", isAuthenticated, async (req: any, res) => {
    try {
      const { date, time, durationMinutes } = finalizeDateSchema.parse(req.body);

      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      if (!isOwner(req, event)) {
        return res.status(403).json({ message: "Only the event host can finalize the date" });
      }
      if (event.pollStatus !== "polling") {
        return res.status(400).json({ message: "This event is not in polling mode" });
      }

      const candidateSet = new Set(event.candidateDates || []);
      if (!candidateSet.has(date)) {
        return res.status(400).json({ message: "Date is not one of the candidate dates" });
      }

      const updated = await storage.finalizeEventDate(req.params.id, date, time || null, durationMinutes);
      if (!updated) {
        return res.status(500).json({ message: "Failed to finalize date" });
      }

      // Seed the theme items now that there's a real date
      const existingItems = await storage.getEventItems(req.params.id);
      if (existingItems.length === 0) {
        const themeItems = getThemeItems(updated.theme);
        await storage.addItems(
          themeItems.map((item) => ({
            eventId: updated.id,
            name: item.name,
            category: item.category,
            isCustom: false,
            claimedBy: null,
            claimedByEmail: null,
          })),
        );
      }

      broadcastToEvent(req.params.id, {
        type: 'dateFinalized',
        event: updated,
      });

      res.json(updated);
    } catch (error) {
      res.status(400).json({ message: "Invalid finalize data" });
    }
  });

  // Add additional candidate dates to an active poll (owner only)
  app.post("/api/events/:id/candidate-dates", isAuthenticated, async (req: any, res) => {
    try {
      const { dates } = addCandidateDatesSchema.parse(req.body);

      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      if (!isOwner(req, event)) {
        return res.status(403).json({ message: "Only the event host can edit candidate dates" });
      }
      if (event.pollStatus !== "polling") {
        return res.status(400).json({ message: "This event is not in polling mode" });
      }

      const updated = await storage.addCandidateDates(req.params.id, dates);
      if (!updated) {
        return res.status(500).json({ message: "Failed to add candidate dates" });
      }

      broadcastToEvent(req.params.id, {
        type: "candidateDatesUpdated",
        event: updated,
      });

      res.json(updated);
    } catch (error) {
      res.status(400).json({ message: "Invalid candidate dates data" });
    }
  });

  // Reopen polling on a finalized event (owner only). Preserves prior votes
  // and items; the previously finalized date is rolled back into the
  // candidate set so prior votes remain meaningful.
  app.post("/api/events/:id/reopen", isAuthenticated, async (req: any, res) => {
    try {
      const { additionalDates } = reopenPollSchema.parse(req.body);

      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      if (!isOwner(req, event)) {
        return res.status(403).json({ message: "Only the event host can reopen polling" });
      }
      if (event.pollStatus !== "finalized") {
        return res.status(400).json({ message: "This event is not finalized" });
      }

      const updated = await storage.reopenPolling(req.params.id, additionalDates);
      if (!updated) {
        return res.status(500).json({ message: "Failed to reopen polling" });
      }

      broadcastToEvent(req.params.id, {
        type: "pollReopened",
        event: updated,
      });

      res.json(updated);
    } catch (error) {
      res.status(400).json({ message: "Invalid reopen data" });
    }
  });

  // RSVPs — list (guest emails stripped, kept private to host)
  app.get("/api/events/:id/rsvps", async (req: any, res) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event) return res.status(404).json({ message: "Event not found" });
      if (!canViewEvent(req, event)) return respondDraftHidden(res);
      const rsvps = await storage.getEventRsvps(req.params.id);
      const publicRsvps = rsvps.map(({ guestEmail: _email, ...rest }) => rest);
      res.json(publicRsvps);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch RSVPs" });
    }
  });

  // Submit or update an RSVP
  app.post("/api/events/:id/rsvps", async (req: any, res) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      if (!canViewEvent(req, event)) return respondDraftHidden(res);

      const rsvpData = submitRsvpSchema.parse(req.body);
      const rsvp = await storage.upsertRsvp(req.params.id, rsvpData);

      const { guestEmail: _email, ...publicRsvp } = rsvp;

      broadcastToEvent(req.params.id, {
        type: "rsvpSubmitted",
        rsvp: publicRsvp,
      });

      res.json(publicRsvp);
    } catch (error) {
      res.status(400).json({ message: "Invalid RSVP data" });
    }
  });

  // Delete an RSVP. A guest can remove their own (matching name + optional
  // email) or the authenticated host can remove any entry on their event.
  app.delete("/api/events/:id/rsvps/:rsvpId", async (req: any, res) => {
    try {
      const eventId = req.params.id;
      const rsvpId = parseInt(req.params.rsvpId, 10);
      if (Number.isNaN(rsvpId)) {
        return res.status(400).json({ message: "Invalid RSVP id" });
      }

      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      const rsvp = await storage.getRsvp(rsvpId);
      if (!rsvp || rsvp.eventId !== eventId) {
        return res.status(404).json({ message: "RSVP not found" });
      }

      const { guestName, guestEmail } = (req.body || {}) as {
        guestName?: string;
        guestEmail?: string;
      };

      const isHost = isOwner(req, event);
      const norm = (s: string | null | undefined) => (s || "").trim().toLowerCase();
      const isOwnRsvp =
        !!guestName &&
        norm(guestName) === norm(rsvp.guestName) &&
        norm(guestEmail) === norm(rsvp.guestEmail);

      if (!isHost && !isOwnRsvp) {
        return res
          .status(403)
          .json({ message: "Not allowed to remove this RSVP" });
      }

      const success = await storage.deleteRsvp(rsvpId);
      if (!success) {
        return res.status(500).json({ message: "Failed to delete RSVP" });
      }

      broadcastToEvent(eventId, {
        type: "rsvpDeleted",
        rsvpId,
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete RSVP" });
    }
  });

  // Add custom item — clients are only allowed to set name + category;
  // every other field (eventId, isCustom, claimed*) is fixed by the server.
  app.post("/api/events/:id/items", async (req: any, res) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event) return res.status(404).json({ message: "Event not found" });
      if (!canViewEvent(req, event)) return respondDraftHidden(res);

      const { name, category } = customItemSchema.parse(req.body);
      const item = await storage.addItem({
        eventId: req.params.id,
        name,
        category,
        isCustom: true,
        claimedBy: null,
        claimedByEmail: null,
      });

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

      const item = await storage.getItem(itemId);

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

      const item = await storage.getItem(itemId);

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
      broadcastToEvent(item.eventId, {
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

      const item = await storage.getItem(itemId);

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

      broadcastToEvent(item.eventId, {
        type: 'itemDeleted',
        itemId: itemId,
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete item" });
    }
  });

  // ── Item comments ────────────────────────────────────────────────────────────

  // Get all item comments for an event (batch fetch so frontend can show counts)
  app.get("/api/events/:id/item-comments", async (req: any, res) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event) return res.status(404).json({ message: "Event not found" });
      if (!canViewEvent(req, event)) return respondDraftHidden(res);
      const comments = await storage.getItemCommentsForEvent(req.params.id);
      res.json(comments);
    } catch {
      res.status(500).json({ message: "Failed to fetch item comments" });
    }
  });

  // Post a comment on a specific item
  app.post("/api/items/:itemId/comments", async (req: any, res) => {
    try {
      const itemId = parseInt(req.params.itemId, 10);
      if (Number.isNaN(itemId)) return res.status(400).json({ message: "Invalid item id" });

      const item = await storage.getItem(itemId);
      if (!item) return res.status(404).json({ message: "Item not found" });

      const event = await storage.getEvent(item.eventId);
      if (!event) return res.status(404).json({ message: "Event not found" });
      if (!canViewEvent(req, event)) return respondDraftHidden(res);

      const comment = submitCommentSchema.parse(req.body);
      const created = await storage.addItemComment(itemId, item.eventId, comment);
      broadcastToEvent(item.eventId, { type: "itemCommentAdded", comment: created });
      res.json(created);
    } catch {
      res.status(400).json({ message: "Invalid comment data" });
    }
  });

  // Delete an item comment (host of the event, or author name match)
  app.delete("/api/item-comments/:commentId", async (req: any, res) => {
    try {
      const commentId = parseInt(req.params.commentId, 10);
      if (Number.isNaN(commentId)) return res.status(400).json({ message: "Invalid comment id" });

      const comment = await storage.getItemComment(commentId);
      if (!comment) return res.status(404).json({ message: "Comment not found" });

      const event = await storage.getEvent(comment.eventId);
      if (!event) return res.status(404).json({ message: "Event not found" });

      const { authorName } = (req.body || {}) as { authorName?: string };
      const norm = (s?: string | null) => (s || "").trim().toLowerCase();
      const hostOk = isOwner(req, event);
      const authorOk = !!authorName && norm(authorName) === norm(comment.authorName);

      if (!hostOk && !authorOk) return res.status(403).json({ message: "Not allowed to delete this comment" });

      await storage.deleteItemComment(commentId);
      broadcastToEvent(comment.eventId, { type: "itemCommentDeleted", commentId, itemId: comment.itemId });
      res.json({ success: true });
    } catch {
      res.status(500).json({ message: "Failed to delete comment" });
    }
  });

  // ── Event discussion ──────────────────────────────────────────────────────────

  // Get all discussion comments for an event
  app.get("/api/events/:id/comments", async (req: any, res) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event) return res.status(404).json({ message: "Event not found" });
      if (!canViewEvent(req, event)) return respondDraftHidden(res);
      const comments = await storage.getEventComments(req.params.id);
      res.json(comments);
    } catch {
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  // Post a discussion comment
  app.post("/api/events/:id/comments", async (req: any, res) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event) return res.status(404).json({ message: "Event not found" });
      if (!canViewEvent(req, event)) return respondDraftHidden(res);

      const comment = submitCommentSchema.parse(req.body);
      const created = await storage.addEventComment(req.params.id, comment);
      broadcastToEvent(req.params.id, { type: "eventCommentAdded", comment: created });
      res.json(created);
    } catch {
      res.status(400).json({ message: "Invalid comment data" });
    }
  });

  // Delete a discussion comment (host or author)
  app.delete("/api/event-comments/:commentId", async (req: any, res) => {
    try {
      const commentId = parseInt(req.params.commentId, 10);
      if (Number.isNaN(commentId)) return res.status(400).json({ message: "Invalid comment id" });

      const comment = await storage.getEventComment(commentId);
      if (!comment) return res.status(404).json({ message: "Comment not found" });

      const event = await storage.getEvent(comment.eventId);
      if (!event) return res.status(404).json({ message: "Event not found" });

      const { authorName } = (req.body || {}) as { authorName?: string };
      const norm = (s?: string | null) => (s || "").trim().toLowerCase();
      const hostOk = isOwner(req, event);
      const authorOk = !!authorName && norm(authorName) === norm(comment.authorName);

      if (!hostOk && !authorOk) return res.status(403).json({ message: "Not allowed to delete this comment" });

      await storage.deleteEventComment(commentId);
      broadcastToEvent(comment.eventId, { type: "eventCommentDeleted", commentId });
      res.json({ success: true });
    } catch {
      res.status(500).json({ message: "Failed to delete comment" });
    }
  });

  return httpServer;
}
