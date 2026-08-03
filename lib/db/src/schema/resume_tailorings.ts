import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const resumeTailoringsTable = pgTable("resume_tailorings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  resumeId: integer("resume_id"),
  jobTitle: text("job_title").notNull(),
  company: text("company"),
  originalText: text("original_text").notNull(),
  tailoredText: text("tailored_text").notNull(),
  keywords: jsonb("keywords").$type<string[]>().default([]),
  changes: jsonb("changes").$type<string[]>().default([]),
  targetScore: integer("target_score"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertResumeTailoringSchema = createInsertSchema(resumeTailoringsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertResumeTailoring = z.infer<typeof insertResumeTailoringSchema>;
export type ResumeTailoring = typeof resumeTailoringsTable.$inferSelect;
