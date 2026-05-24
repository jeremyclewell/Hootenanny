import {
  events, items, dateVotes, rsvps, itemComments, eventComments, commentViews,
  type Event, type InsertEvent, type Item, type InsertItem, type EditItem,
  type DateVote, type SubmitVote, type Rsvp, type SubmitRsvp, type EventStatus,
  type ItemComment, type EventComment, type SubmitComment,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gt, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";

export interface IStorage {
  // Events
  createEvent(ownerId: string, event: InsertEvent): Promise<Event>;
  getEvent(id: string): Promise<Event | undefined>;
  getEventsByOwner(ownerId: string): Promise<Event[]>;
  updateEvent(id: string, updates: Partial<InsertEvent>): Promise<Event | undefined>;
  updateEventStatus(id: string, status: EventStatus): Promise<Event | undefined>;
  deleteEvent(id: string): Promise<boolean>;
  finalizeEventDate(id: string, date: string, time?: string | null, durationMinutes?: number): Promise<Event | undefined>;
  addCandidateDates(id: string, dates: string[]): Promise<Event | undefined>;
  reopenPolling(id: string, additionalDates: string[]): Promise<Event | undefined>;

  // Items
  getEventItems(eventId: string): Promise<Item[]>;
  getItem(itemId: number): Promise<Item | undefined>;
  addItem(item: InsertItem): Promise<Item>;
  addItems(items: InsertItem[]): Promise<Item[]>;
  claimItem(itemId: number, claimedBy: string, claimedByEmail?: string): Promise<Item | undefined>;
  unclaimItem(itemId: number): Promise<Item | undefined>;
  updateItem(itemId: number, updates: EditItem): Promise<Item | undefined>;
  deleteItem(itemId: number): Promise<boolean>;
  getEventStats(eventId: string): Promise<{ total: number; claimed: number; available: number; custom: number }>;

  // Date polling
  getEventVotes(eventId: string): Promise<DateVote[]>;
  upsertVote(eventId: string, vote: SubmitVote): Promise<DateVote>;

  // RSVPs
  getEventRsvps(eventId: string): Promise<Rsvp[]>;
  upsertRsvp(eventId: string, rsvp: SubmitRsvp): Promise<Rsvp>;
  getRsvp(rsvpId: number): Promise<Rsvp | undefined>;
  deleteRsvp(rsvpId: number): Promise<boolean>;

  // Item comments
  getItemCommentsForEvent(eventId: string): Promise<ItemComment[]>;
  addItemComment(itemId: number, eventId: string, comment: SubmitComment): Promise<ItemComment>;
  getItemComment(commentId: number): Promise<ItemComment | undefined>;
  deleteItemComment(commentId: number): Promise<boolean>;

  // Event discussion comments
  getEventComments(eventId: string): Promise<EventComment[]>;
  addEventComment(eventId: string, comment: SubmitComment, parentId?: number | null): Promise<EventComment>;
  getEventComment(commentId: number): Promise<EventComment | undefined>;
  deleteEventComment(commentId: number): Promise<boolean>;

  // Comment read tracking
  markCommentsRead(ownerId: string, eventId: string): Promise<Date | null>;
  getUnreadCommentCounts(ownerId: string, eventIds: string[]): Promise<Record<string, number>>;
}

export class DatabaseStorage implements IStorage {
  // ── Events ──────────────────────────────────────────────────────────────────

  async createEvent(ownerId: string, insertEvent: InsertEvent): Promise<Event> {
    const id = nanoid();
    const [event] = await db.insert(events).values({
      ...insertEvent,
      id, ownerId, status: "draft",
      date: insertEvent.date || null,
      time: insertEvent.time || null,
      description: insertEvent.description || null,
      location: insertEvent.location || null,
      expectedGuests: insertEvent.expectedGuests || null,
      pollStatus: insertEvent.pollStatus || "none",
      candidateDates: insertEvent.candidateDates || null,
      durationMinutes: insertEvent.durationMinutes ?? 120,
    }).returning();
    return event;
  }

  async getEvent(id: string): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event || undefined;
  }

  async getEventsByOwner(ownerId: string): Promise<Event[]> {
    return db.select().from(events).where(eq(events.ownerId, ownerId)).orderBy(desc(events.createdAt));
  }

  async updateEvent(id: string, updates: Partial<InsertEvent>): Promise<Event | undefined> {
    const [event] = await db.update(events).set(updates).where(eq(events.id, id)).returning();
    return event || undefined;
  }

  async updateEventStatus(id: string, status: EventStatus): Promise<Event | undefined> {
    const [event] = await db.update(events).set({ status }).where(eq(events.id, id)).returning();
    return event || undefined;
  }

  async deleteEvent(id: string): Promise<boolean> {
    const result = await db.delete(events).where(eq(events.id, id)).returning();
    return result.length > 0;
  }

  async finalizeEventDate(id: string, date: string, time?: string | null, durationMinutes?: number, endDate?: string | null, endTime?: string | null): Promise<Event | undefined> {
    const updates: any = { date, time: time || null, pollStatus: "finalized", endDate: endDate || null, endTime: endTime || null };
    if (typeof durationMinutes === "number") updates.durationMinutes = durationMinutes;
    const [event] = await db.update(events).set(updates).where(eq(events.id, id)).returning();
    return event || undefined;
  }

  async addCandidateDates(id: string, dates: string[]): Promise<Event | undefined> {
    const existing = await this.getEvent(id);
    if (!existing) return undefined;
    const merged = Array.from(new Set([...(existing.candidateDates || []), ...dates])).sort();
    const [event] = await db.update(events).set({ candidateDates: merged }).where(eq(events.id, id)).returning();
    return event || undefined;
  }

  async reopenPolling(id: string, additionalDates: string[]): Promise<Event | undefined> {
    const existing = await this.getEvent(id);
    if (!existing) return undefined;
    const base = existing.candidateDates || [];
    const withCurrent = existing.date ? [...base, existing.date] : base;
    const merged = Array.from(new Set([...withCurrent, ...additionalDates])).sort();
    const [event] = await db.update(events).set({ pollStatus: "polling", date: null, time: null, candidateDates: merged }).where(eq(events.id, id)).returning();
    return event || undefined;
  }

  // ── Items ────────────────────────────────────────────────────────────────────

  async getEventItems(eventId: string): Promise<Item[]> {
    return db.select().from(items).where(eq(items.eventId, eventId));
  }

  async getItem(itemId: number): Promise<Item | undefined> {
    const [item] = await db.select().from(items).where(eq(items.id, itemId));
    return item || undefined;
  }

  async getItem(itemId: number): Promise<Item | undefined> {
    const [item] = await db.select().from(items).where(eq(items.id, itemId));
    return item || undefined;
  }

  async addItem(insertItem: InsertItem): Promise<Item> {
    const [item] = await db.insert(items).values({
      ...insertItem,
      isCustom: insertItem.isCustom ?? false,
      claimedBy: insertItem.claimedBy || null,
      claimedByEmail: insertItem.claimedByEmail || null,
    }).returning();
    return item;
  }

  async addItems(inserts: InsertItem[]): Promise<Item[]> {
    if (inserts.length === 0) return [];
    return db.insert(items).values(inserts.map((i) => ({
      ...i, isCustom: i.isCustom ?? false, claimedBy: i.claimedBy || null, claimedByEmail: i.claimedByEmail || null,
    }))).returning();
  }

  async claimItem(itemId: number, claimedBy: string, claimedByEmail?: string): Promise<Item | undefined> {
    const [item] = await db.update(items).set({ claimedBy, claimedByEmail: claimedByEmail || null, claimedAt: new Date() }).where(eq(items.id, itemId)).returning();
    return item || undefined;
  }

  async unclaimItem(itemId: number): Promise<Item | undefined> {
    const [item] = await db.update(items).set({ claimedBy: null, claimedByEmail: null, claimedAt: null }).where(eq(items.id, itemId)).returning();
    return item || undefined;
  }

  async updateItem(itemId: number, updates: EditItem): Promise<Item | undefined> {
    const [item] = await db.update(items).set({ name: updates.name, category: updates.category }).where(eq(items.id, itemId)).returning();
    return item || undefined;
  }

  async deleteItem(itemId: number): Promise<boolean> {
    const result = await db.delete(items).where(eq(items.id, itemId)).returning();
    return result.length > 0;
  }

  async getEventStats(eventId: string): Promise<{ total: number; claimed: number; available: number; custom: number }> {
    const eventItems = await this.getEventItems(eventId);
    const total = eventItems.length;
    const claimed = eventItems.filter((i) => i.claimedBy).length;
    return { total, claimed, available: total - claimed, custom: eventItems.filter((i) => i.isCustom).length };
  }

  // ── Date polling ─────────────────────────────────────────────────────────────

  async getEventVotes(eventId: string): Promise<DateVote[]> {
    return db.select().from(dateVotes).where(eq(dateVotes.eventId, eventId));
  }

  async upsertVote(eventId: string, vote: SubmitVote): Promise<DateVote> {
    const email = vote.voterEmail || "";
    const existing = await db.select().from(dateVotes).where(eq(dateVotes.eventId, eventId));
    const match = existing.find(
      (v) => v.voterName.trim().toLowerCase() === vote.voterName.trim().toLowerCase() &&
        (v.voterEmail || "").trim().toLowerCase() === email.trim().toLowerCase()
    );
    if (match) {
      const [updated] = await db.update(dateVotes).set({ selectedDates: vote.selectedDates, updatedAt: new Date() }).where(eq(dateVotes.id, match.id)).returning();
      return updated;
    }
    const [created] = await db.insert(dateVotes).values({ eventId, voterName: vote.voterName, voterEmail: email || null, selectedDates: vote.selectedDates }).returning();
    return created;
  }

  // ── RSVPs ─────────────────────────────────────────────────────────────────────

  async getEventRsvps(eventId: string): Promise<Rsvp[]> {
    return db.select().from(rsvps).where(eq(rsvps.eventId, eventId));
  }

  async upsertRsvp(eventId: string, rsvp: SubmitRsvp): Promise<Rsvp> {
    const email = rsvp.guestEmail || "";
    const existing = await db.select().from(rsvps).where(eq(rsvps.eventId, eventId));
    const match = existing.find(
      (r) => r.guestName.trim().toLowerCase() === rsvp.guestName.trim().toLowerCase() &&
        (r.guestEmail || "").trim().toLowerCase() === email.trim().toLowerCase()
    );
    if (match) {
      const [updated] = await db.update(rsvps).set({ response: rsvp.response, plusOnes: rsvp.plusOnes ?? 0, updatedAt: new Date() }).where(eq(rsvps.id, match.id)).returning();
      return updated;
    }
    const [created] = await db.insert(rsvps).values({ eventId, guestName: rsvp.guestName, guestEmail: email || null, response: rsvp.response, plusOnes: rsvp.plusOnes ?? 0 }).returning();
    return created;
  }

  async getRsvp(rsvpId: number): Promise<Rsvp | undefined> {
    const [rsvp] = await db.select().from(rsvps).where(eq(rsvps.id, rsvpId));
    return rsvp || undefined;
  }

  async deleteRsvp(rsvpId: number): Promise<boolean> {
    const result = await db.delete(rsvps).where(eq(rsvps.id, rsvpId)).returning();
    return result.length > 0;
  }

  // ── Item comments ─────────────────────────────────────────────────────────────

  async getItemCommentsForEvent(eventId: string): Promise<ItemComment[]> {
    return db.select().from(itemComments).where(eq(itemComments.eventId, eventId)).orderBy(itemComments.createdAt);
  }

  async addItemComment(itemId: number, eventId: string, comment: SubmitComment): Promise<ItemComment> {
    const [created] = await db.insert(itemComments).values({
      itemId, eventId, authorName: comment.authorName.trim(), content: comment.content.trim(),
    }).returning();
    return created;
  }

  async getItemComment(commentId: number): Promise<ItemComment | undefined> {
    const [comment] = await db.select().from(itemComments).where(eq(itemComments.id, commentId));
    return comment || undefined;
  }

  async deleteItemComment(commentId: number): Promise<boolean> {
    const result = await db.delete(itemComments).where(eq(itemComments.id, commentId)).returning();
    return result.length > 0;
  }

  // ── Event discussion comments ─────────────────────────────────────────────────

  async getEventComments(eventId: string): Promise<EventComment[]> {
    return db.select().from(eventComments).where(eq(eventComments.eventId, eventId)).orderBy(eventComments.createdAt);
  }

  async addEventComment(eventId: string, comment: SubmitComment, parentId?: number | null): Promise<EventComment> {
    const [created] = await db.insert(eventComments).values({
      eventId, authorName: comment.authorName.trim(), content: comment.content.trim(),
      parentId: parentId ?? null,
    }).returning();
    return created;
  }

  async getEventComment(commentId: number): Promise<EventComment | undefined> {
    const [comment] = await db.select().from(eventComments).where(eq(eventComments.id, commentId));
    return comment || undefined;
  }

  async deleteEventComment(commentId: number): Promise<boolean> {
    // Delete child replies first to avoid orphans, then delete the comment itself
    await db.delete(eventComments).where(eq(eventComments.parentId, commentId));
    const result = await db.delete(eventComments).where(eq(eventComments.id, commentId)).returning();
    return result.length > 0;
  }

  // ── Comment read tracking ────────────────────────────────────────────────────

  async markCommentsRead(ownerId: string, eventId: string): Promise<Date | null> {
    const existing = await db.select().from(commentViews)
      .where(and(eq(commentViews.ownerId, ownerId), eq(commentViews.eventId, eventId)));
    const previousLastViewedAt = existing.length > 0 ? existing[0].lastViewedAt : null;
    if (existing.length > 0) {
      await db.update(commentViews)
        .set({ lastViewedAt: new Date() })
        .where(and(eq(commentViews.ownerId, ownerId), eq(commentViews.eventId, eventId)));
    } else {
      await db.insert(commentViews).values({ ownerId, eventId, lastViewedAt: new Date() });
    }
    return previousLastViewedAt;
  }

  async getUnreadCommentCounts(ownerId: string, eventIds: string[]): Promise<Record<string, number>> {
    if (eventIds.length === 0) return {};

    const [views, allEc, allIc] = await Promise.all([
      db.select().from(commentViews)
        .where(and(eq(commentViews.ownerId, ownerId), inArray(commentViews.eventId, eventIds))),
      db.select({ id: eventComments.id, eventId: eventComments.eventId, createdAt: eventComments.createdAt })
        .from(eventComments).where(inArray(eventComments.eventId, eventIds)),
      db.select({ id: itemComments.id, eventId: itemComments.eventId, createdAt: itemComments.createdAt })
        .from(itemComments).where(inArray(itemComments.eventId, eventIds)),
    ]);

    const viewMap = new Map(views.map((v) => [v.eventId, v.lastViewedAt]));

    const counts: Record<string, number> = {};
    for (const eventId of eventIds) {
      const lastViewed = viewMap.get(eventId);
      const ecCount = allEc.filter((c) => c.eventId === eventId && (!lastViewed || c.createdAt > lastViewed)).length;
      const icCount = allIc.filter((c) => c.eventId === eventId && (!lastViewed || c.createdAt > lastViewed)).length;
      counts[eventId] = ecCount + icCount;
    }

    return counts;
  }
}

export const storage = new DatabaseStorage();
