import { pgTable, text, serial, timestamp, integer, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/** A scored recommendation produced by the AI job intelligence engine. */
export const jobIntelRecommendationsTable = pgTable("job_intel_recommendations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  profileId: integer("profile_id").notNull(),
  jobId: integer("job_id").notNull(),
  score: integer("score").notNull().default(0),
  breakdown: jsonb("breakdown").$type<{ factor: string; points: number; max: number; note: string }[]>().default([]),
  matchedSkills: jsonb("matched_skills").$type<string[]>().default([]),
  missingSkills: jsonb("missing_skills").$type<string[]>().default([]),
  improvements: jsonb("improvements").$type<string[]>().default([]),
  competitiveness: text("competitiveness").notNull().default("Low"),
  reasons: jsonb("reasons").$type<string[]>().default([]),
  feedback: boolean("feedback"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertJobIntelRecommendationSchema = createInsertSchema(jobIntelRecommendationsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertJobIntelRecommendation = z.infer<typeof insertJobIntelRecommendationSchema>;
export type JobIntelRecommendation = typeof jobIntelRecommendationsTable.$inferSelect;
