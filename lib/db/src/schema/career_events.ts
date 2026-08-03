import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const careerEventsTable = pgTable("career_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCareerEventSchema = createInsertSchema(careerEventsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertCareerEvent = z.infer<typeof insertCareerEventSchema>;
export type CareerEvent = typeof careerEventsTable.$inferSelect;
