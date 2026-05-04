import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const events = pgTable("events", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  theme: text("theme").notNull(),
  date: text("date"),
  time: text("time"),
  location: text("location"),
  expectedGuests: integer("expected_guests"),
  pollStatus: text("poll_status").default("none").notNull(),
  candidateDates: text("candidate_dates").array(),
  hostToken: text("host_token"),
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

export const insertEventSchema = createInsertSchema(events)
  .omit({
    id: true,
    createdAt: true,
    hostToken: true,
  })
  .extend({
    pollStatus: z.enum(["none", "polling", "finalized"]).optional(),
    candidateDates: z.array(z.string()).optional().nullable(),
  });

export const insertItemSchema = createInsertSchema(items).omit({
  id: true,
  claimedAt: true,
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
  hostToken: z.string().min(1, "Host token is required"),
});

export const addCandidateDatesSchema = z.object({
  hostToken: z.string().min(1, "Host token is required"),
  dates: z.array(z.string().min(1)).min(1, "Add at least one date"),
});

export const reopenPollSchema = z.object({
  hostToken: z.string().min(1, "Host token is required"),
  additionalDates: z.array(z.string().min(1)).default([]),
});

export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Item = typeof items.$inferSelect;
export type InsertItem = z.infer<typeof insertItemSchema>;
export type ClaimItem = z.infer<typeof claimItemSchema>;
export type EditItem = z.infer<typeof editItemSchema>;
export type DateVote = typeof dateVotes.$inferSelect;
export type SubmitVote = z.infer<typeof submitVoteSchema>;
export type FinalizeDate = z.infer<typeof finalizeDateSchema>;
