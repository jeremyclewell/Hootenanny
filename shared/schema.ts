import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";

export const events = pgTable("events", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  status: text("status").default("draft").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  theme: text("theme").notNull(),
  date: text("date"),
  time: text("time"),
  endDate: text("end_date"),
  endTime: text("end_time"),
  location: text("location"),
  expectedGuests: integer("expected_guests"),
  pollStatus: text("poll_status").default("none").notNull(),
  candidateDates: text("candidate_dates").array(),
  durationMinutes: integer("duration_minutes").default(120).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const items = pgTable("items", {
  id: serial("id").primaryKey(),
  eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category").notNull(),
  isCustom: boolean("is_custom").default(false).notNull(),
  claimedBy: text("claimed_by"),
  claimedByEmail: text("claimed_by_email"),
  claimedAt: timestamp("claimed_at"),
});

export const dateVotes = pgTable("date_votes", {
  id: serial("id").primaryKey(),
  eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  voterName: text("voter_name").notNull(),
  voterEmail: text("voter_email"),
  selectedDates: text("selected_dates").array().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const rsvps = pgTable("rsvps", {
  id: serial("id").primaryKey(),
  eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  guestName: text("guest_name").notNull(),
  guestEmail: text("guest_email"),
  response: text("response").notNull(),
  plusOnes: integer("plus_ones").default(0).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const itemComments = pgTable("item_comments", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").notNull().references(() => items.id, { onDelete: "cascade" }),
  eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  authorName: text("author_name").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const eventComments = pgTable("event_comments", {
  id: serial("id").primaryKey(),
  eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  parentId: integer("parent_id"),
  authorName: text("author_name").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const commentViews = pgTable("comment_views", {
  id: serial("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  lastViewedAt: timestamp("last_viewed_at").defaultNow().notNull(),
});

// ── Zod schemas ───────────────────────────────────────────────────────────────

export const eventStatusEnum = z.enum(["draft", "published"]);
export const rsvpResponseEnum = z.enum(["yes", "no", "maybe"]);

export const submitRsvpSchema = z.object({
  guestName: z.string().min(1, "Name is required"),
  guestEmail: z.string().email().optional().or(z.literal("")),
  response: rsvpResponseEnum,
  plusOnes: z.number().int().min(0).max(20).default(0),
});

export const insertEventSchema = createInsertSchema(events)
  .omit({ id: true, ownerId: true, status: true, createdAt: true })
  .extend({
    title: z.string().min(1, "Event title is required"),
    theme: z.string().min(1, "Event theme is required"),
    location: z.string().min(1, "Location is required"),
    pollStatus: z.enum(["none", "polling", "finalized"]).optional(),
    candidateDates: z.array(z.string()).optional().nullable(),
    durationMinutes: z.number().int().min(15).max(24 * 60).optional(),
  });

export const insertItemSchema = createInsertSchema(items).omit({ id: true, claimedAt: true });

export const customItemSchema = z.object({
  name: z.string().min(1, "Item name is required"),
  category: z.string().min(1, "Category is required"),
});

export const claimItemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email().optional().or(z.literal("")),
});

export const editItemSchema = z.object({
  name: z.string().min(1, "Item name is required"),
  category: z.string().min(1, "Category is required"),
});

export const submitVoteSchema = z.object({
  voterName: z.string().min(1, "Name is required"),
  voterEmail: z.string().email().optional().or(z.literal("")),
  selectedDates: z.array(z.string()).default([]),
});

export const finalizeDateSchema = z.object({
  date: z.string().min(1, "Date is required"),
  time: z.string().optional().nullable(),
  durationMinutes: z.number().int().min(15).max(24 * 60).optional(),
  endDate: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
});

export const updateEventSchema = insertEventSchema.partial().omit({ pollStatus: true, candidateDates: true });

export const addCandidateDatesSchema = z.object({
  dates: z.array(z.string().min(1)).min(1, "Add at least one date"),
});

export const reopenPollSchema = z.object({
  additionalDates: z.array(z.string().min(1)).default([]),
});

export const submitCommentSchema = z.object({
  authorName: z.string().min(1, "Name is required"),
  content: z.string().min(1, "Comment cannot be empty").max(1000),
  parentId: z.number().int().optional().nullable(),
});

// ── Types ─────────────────────────────────────────────────────────────────────

export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Item = typeof items.$inferSelect;
export type InsertItem = z.infer<typeof insertItemSchema>;
export type ClaimItem = z.infer<typeof claimItemSchema>;
export type EditItem = z.infer<typeof editItemSchema>;
export type DateVote = typeof dateVotes.$inferSelect;
export type SubmitVote = z.infer<typeof submitVoteSchema>;
export type FinalizeDate = z.infer<typeof finalizeDateSchema>;
export type Rsvp = typeof rsvps.$inferSelect;
export type SubmitRsvp = z.infer<typeof submitRsvpSchema>;
export type RsvpResponse = z.infer<typeof rsvpResponseEnum>;
export type EventStatus = z.infer<typeof eventStatusEnum>;
export type ItemComment = typeof itemComments.$inferSelect;
export type EventComment = typeof eventComments.$inferSelect;
export type SubmitComment = z.infer<typeof submitCommentSchema>;
