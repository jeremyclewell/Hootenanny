import { events, items, dateVotes, type Event, type InsertEvent, type Item, type InsertItem, type EditItem, type DateVote, type SubmitVote } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

export interface IStorage {
  // Event operations
  createEvent(event: InsertEvent): Promise<Event>;
  getEvent(id: string): Promise<Event | undefined>;
  finalizeEventDate(id: string, date: string, time?: string | null): Promise<Event | undefined>;

  // Item operations
  getEventItems(eventId: string): Promise<Item[]>;
  addItem(item: InsertItem): Promise<Item>;
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
      })
      .returning();
    return event;
  }

  async getEvent(id: string): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event || undefined;
  }

  async finalizeEventDate(id: string, date: string, time?: string | null): Promise<Event | undefined> {
    const [event] = await db
      .update(events)
      .set({ date, time: time || null, pollStatus: "finalized" })
      .where(eq(events.id, id))
      .returning();
    return event || undefined;
  }

  async getEventItems(eventId: string): Promise<Item[]> {
    return await db.select().from(items).where(eq(items.eventId, eventId));
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
}

export const storage = new DatabaseStorage();
