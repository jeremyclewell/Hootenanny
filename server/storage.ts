import { events, items, type Event, type InsertEvent, type Item, type InsertItem } from "@shared/schema";
import { nanoid } from "nanoid";

export interface IStorage {
  // Event operations
  createEvent(event: InsertEvent): Promise<Event>;
  getEvent(id: string): Promise<Event | undefined>;
  
  // Item operations
  getEventItems(eventId: string): Promise<Item[]>;
  addItem(item: InsertItem): Promise<Item>;
  claimItem(itemId: number, claimedBy: string, claimedByEmail?: string): Promise<Item | undefined>;
  
  // Stats
  getEventStats(eventId: string): Promise<{
    total: number;
    claimed: number;
    available: number;
    custom: number;
  }>;
}

export class MemStorage implements IStorage {
  private events: Map<string, Event>;
  private items: Map<number, Item>;
  private currentItemId: number;

  constructor() {
    this.events = new Map();
    this.items = new Map();
    this.currentItemId = 1;
  }

  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const id = nanoid();
    const event: Event = {
      ...insertEvent,
      id,
      date: insertEvent.date || null,
      description: insertEvent.description || null,
      location: insertEvent.location || null,
      expectedGuests: insertEvent.expectedGuests || null,
      createdAt: new Date(),
    };
    this.events.set(id, event);
    return event;
  }

  async getEvent(id: string): Promise<Event | undefined> {
    return this.events.get(id);
  }

  async getEventItems(eventId: string): Promise<Item[]> {
    return Array.from(this.items.values()).filter(item => item.eventId === eventId);
  }

  async addItem(insertItem: InsertItem): Promise<Item> {
    const id = this.currentItemId++;
    const item: Item = {
      ...insertItem,
      id,
      isCustom: insertItem.isCustom ?? false,
      claimedBy: insertItem.claimedBy || null,
      claimedByEmail: insertItem.claimedByEmail || null,
      claimedAt: null,
    };
    this.items.set(id, item);
    return item;
  }

  async claimItem(itemId: number, claimedBy: string, claimedByEmail?: string): Promise<Item | undefined> {
    const item = this.items.get(itemId);
    if (!item || item.claimedBy) {
      return undefined;
    }

    const updatedItem: Item = {
      ...item,
      claimedBy,
      claimedByEmail: claimedByEmail || null,
      claimedAt: new Date(),
    };
    this.items.set(itemId, updatedItem);
    return updatedItem;
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
}

export const storage = new MemStorage();
