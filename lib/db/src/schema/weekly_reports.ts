import { pgTable, text, serial, timestamp, integer, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const weeklyReportsTable = pgTable("weekly_reports", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  weekStart: timestamp("week_start", { withTimezone: true }).notNull(),
  content: jsonb("content").$type<Record<string, unknown>>().default({}),
  sentViaEmail: boolean("sent_via_email").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertWeeklyReportSchema = createInsertSchema(weeklyReportsTable).omit({
  id: true,
  sentViaEmail: true,
  createdAt: true,
});
export type InsertWeeklyReport = z.infer<typeof insertWeeklyReportSchema>;
export type WeeklyReport = typeof weeklyReportsTable.$inferSelect;
