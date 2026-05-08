import { events, items, dateVotes, rsvps, type Event, type InsertEvent, type Item, type InsertItem, type EditItem, type DateVote, type SubmitVote, type Rsvp, type SubmitRsvp } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

export interface IStorage {
  // Event operations
  createEvent(event: InsertEvent): Promise<Event>;
  getEvent(id: string): Promise<Event | undefined>;
  finalizeEventDate(id: string, date: string, time?: string | null, durationMinutes?: number): Promise<Event | undefined>;
  addCandidateDates(id: string, dates: string[]): Promise<Event | undefined>;
  reopenPolling(id: string, additionalDates: string[]): Promise<Event | undefined>;

  // Item operations
  getEventItems(eventId: string): Promise<Item[]>;
  getItem(itemId: number): Promise<Item | undefined>;
  addItem(item: InsertItem): Promise<Item>;
  addItems(items: InsertItem[]): Promise<Item[]>;
  claimItem(itemId: number, claimedBy: string, claimedByEmail?: string): Promise<Item | undefined>;
  unclaimItem(itemId: number): Promise<Item | undefined>;
  updateItem(itemId: number, updates: EditItem): Promise<Item | undefined>;
  deleteItem(itemId: number): Promise<boolean>;

  // Stats
  getEventStats(eventId: string): Promise<{
    total: number;
    claimed: number;
    available: number;
    custom: number;
  }>;

  // Date polling
  getEventVotes(eventId: string): Promise<DateVote[]>;
  upsertVote(eventId: string, vote: SubmitVote): Promise<DateVote>;

  // RSVPs
  getEventRsvps(eventId: string): Promise<Rsvp[]>;
  upsertRsvp(eventId: string, rsvp: SubmitRsvp): Promise<Rsvp>;
  getRsvp(rsvpId: number): Promise<Rsvp | undefined>;
  deleteRsvp(rsvpId: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const id = nanoid();
    const hostToken = nanoid(32);
    const [event] = await db
      .insert(events)
      .values({
        ...insertEvent,
        id,
        hostToken,
        date: insertEvent.date || null,
        time: insertEvent.time || null,
        description: insertEvent.description || null,
        location: insertEvent.location || null,
        expectedGuests: insertEvent.expectedGuests || null,
        pollStatus: insertEvent.pollStatus || "none",
        candidateDates: insertEvent.candidateDates || null,
        durationMinutes: insertEvent.durationMinutes ?? 120,
      })
      .returning();
    return event;
  }

  async getEvent(id: string): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event || undefined;
  }

  async finalizeEventDate(id: string, date: string, time?: string | null, durationMinutes?: number): Promise<Event | undefined> {
    const updates: { date: string; time: string | null; pollStatus: string; durationMinutes?: number } = {
      date,
      time: time || null,
      pollStatus: "finalized",
    };
    if (typeof durationMinutes === "number") {
      updates.durationMinutes = durationMinutes;
    }
    const [event] = await db
      .update(events)
      .set(updates)
      .where(eq(events.id, id))
      .returning();
    return event || undefined;
  }

  async addCandidateDates(id: string, dates: string[]): Promise<Event | undefined> {
    const existing = await this.getEvent(id);
    if (!existing) return undefined;
    const merged = Array.from(new Set([...(existing.candidateDates || []), ...dates])).sort();
    const [event] = await db
      .update(events)
      .set({ candidateDates: merged })
      .where(eq(events.id, id))
      .returning();
    return event || undefined;
  }

  async reopenPolling(id: string, additionalDates: string[]): Promise<Event | undefined> {
    const existing = await this.getEvent(id);
    if (!existing) return undefined;
    const base = existing.candidateDates || [];
    const withCurrent = existing.date ? [...base, existing.date] : base;
    const merged = Array.from(new Set([...withCurrent, ...additionalDates])).sort();
    const [event] = await db
      .update(events)
      .set({
        pollStatus: "polling",
        date: null,
        time: null,
        candidateDates: merged,
      })
      .where(eq(events.id, id))
      .returning();
    return event || undefined;
  }

  async getEventItems(eventId: string): Promise<Item[]> {
    return await db.select().from(items).where(eq(items.eventId, eventId));
  }

  async getItem(itemId: number): Promise<Item | undefined> {
    const [item] = await db.select().from(items).where(eq(items.id, itemId));
    return item || undefined;
  }

  async addItem(insertItem: InsertItem): Promise<Item> {
    const [item] = await db
      .insert(items)
      .values({
        ...insertItem,
        isCustom: insertItem.isCustom ?? false,
        claimedBy: insertItem.claimedBy || null,
        claimedByEmail: insertItem.claimedByEmail || null,
      })
      .returning();
    return item;
  }

  async addItems(inserts: InsertItem[]): Promise<Item[]> {
    if (inserts.length === 0) return [];
    return await db
      .insert(items)
      .values(
        inserts.map((i) => ({
          ...i,
          isCustom: i.isCustom ?? false,
          claimedBy: i.claimedBy || null,
          claimedByEmail: i.claimedByEmail || null,
        })),
      )
      .returning();
  }

  async claimItem(itemId: number, claimedBy: string, claimedByEmail?: string): Promise<Item | undefined> {
    const [item] = await db
      .update(items)
      .set({
        claimedBy,
        claimedByEmail: claimedByEmail || null,
        claimedAt: new Date(),
      })
      .where(eq(items.id, itemId))
      .returning();

    return item || undefined;
  }

  async unclaimItem(itemId: number): Promise<Item | undefined> {
    const [item] = await db
      .update(items)
      .set({
        claimedBy: null,
        claimedByEmail: null,
        claimedAt: null,
      })
      .where(eq(items.id, itemId))
      .returning();

    return item || undefined;
  }

  async updateItem(itemId: number, updates: EditItem): Promise<Item | undefined> {
    const [item] = await db
      .update(items)
      .set({
        name: updates.name,
        category: updates.category,
      })
      .where(eq(items.id, itemId))
      .returning();

    return item || undefined;
  }

  async deleteItem(itemId: number): Promise<boolean> {
    const result = await db
      .delete(items)
      .where(eq(items.id, itemId))
      .returning();

    return result.length > 0;
  }

  async getEventStats(eventId: string): Promise<{
    total: number;
    claimed: number;
    available: number;
    custom: number;
  }> {
    const eventItems = await this.getEventItems(eventId);
    const total = eventItems.length;
    const claimed = eventItems.filter(item => item.claimedBy).length;
    const available = total - claimed;
    const custom = eventItems.filter(item => item.isCustom).length;

    return { total, claimed, available, custom };
  }

  async getEventVotes(eventId: string): Promise<DateVote[]> {
    return await db.select().from(dateVotes).where(eq(dateVotes.eventId, eventId));
  }

  async upsertVote(eventId: string, vote: SubmitVote): Promise<DateVote> {
    const email = vote.voterEmail || "";
    const existing = await db
      .select()
      .from(dateVotes)
      .where(eq(dateVotes.eventId, eventId));

    const match = existing.find(
      (v) =>
        v.voterName.trim().toLowerCase() === vote.voterName.trim().toLowerCase() &&
        (v.voterEmail || "").trim().toLowerCase() === email.trim().toLowerCase()
    );

    if (match) {
      const [updated] = await db
        .update(dateVotes)
        .set({
          selectedDates: vote.selectedDates,
          updatedAt: new Date(),
        })
        .where(eq(dateVotes.id, match.id))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(dateVotes)
      .values({
        eventId,
        voterName: vote.voterName,
        voterEmail: email || null,
        selectedDates: vote.selectedDates,
      })
      .returning();
    return created;
  }

  async getEventRsvps(eventId: string): Promise<Rsvp[]> {
    return await db.select().from(rsvps).where(eq(rsvps.eventId, eventId));
  }

  async upsertRsvp(eventId: string, rsvp: SubmitRsvp): Promise<Rsvp> {
    const email = rsvp.guestEmail || "";
    const existing = await db
      .select()
      .from(rsvps)
      .where(eq(rsvps.eventId, eventId));

    const match = existing.find(
      (r) =>
        r.guestName.trim().toLowerCase() === rsvp.guestName.trim().toLowerCase() &&
        (r.guestEmail || "").trim().toLowerCase() === email.trim().toLowerCase()
    );

    if (match) {
      const [updated] = await db
        .update(rsvps)
        .set({
          response: rsvp.response,
          plusOnes: rsvp.plusOnes ?? 0,
          updatedAt: new Date(),
        })
        .where(eq(rsvps.id, match.id))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(rsvps)
      .values({
        eventId,
        guestName: rsvp.guestName,
        guestEmail: email || null,
        response: rsvp.response,
        plusOnes: rsvp.plusOnes ?? 0,
      })
      .returning();
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
}

export const storage = new DatabaseStorage();
