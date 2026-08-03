import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Opt-in behavioral activity log for the AI job intelligence engine.
 * Only written when the user has granted ai_job_intel_consent.
 */
export const userActivityLogsTable = pgTable("user_activity_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  eventType: text("event_type").notNull(), // job_viewed | job_saved | job_applied | feature_used | practice | quiz | assessment
  jobId: integer("job_id"),
  data: jsonb("data").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserActivityLogSchema = createInsertSchema(userActivityLogsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertUserActivityLog = z.infer<typeof insertUserActivityLogSchema>;
export type UserActivityLog = typeof userActivityLogsTable.$inferSelect;
