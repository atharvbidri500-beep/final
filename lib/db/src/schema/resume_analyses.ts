import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const resumeAnalysesTable = pgTable("resume_analyses", {
  id: serial("id").primaryKey(),
  resumeId: integer("resume_id").notNull(),
  userId: integer("user_id").notNull(),
  atsScore: integer("ats_score"),
  qualityScore: integer("quality_score"),
  healthScore: integer("health_score"),
  readabilityScore: integer("readability_score"),
  keywordScore: integer("keyword_score"),
  missingKeywords: jsonb("missing_keywords").$type<string[]>().default([]),
  skillGaps: jsonb("skill_gaps").$type<string[]>().default([]),
  industryComparison: jsonb("industry_comparison").$type<Record<string, unknown>>().default({}),
  suggestions: jsonb("suggestions").$type<string[]>().default([]),
  strengths: jsonb("strengths").$type<string[]>().default([]),
  recruiterSimulation: jsonb("recruiter_simulation").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertResumeAnalysisSchema = createInsertSchema(resumeAnalysesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertResumeAnalysis = z.infer<typeof insertResumeAnalysisSchema>;
export type ResumeAnalysis = typeof resumeAnalysesTable.$inferSelect;
