import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const interviewAnalyticsTable = pgTable("interview_analytics", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  userId: integer("user_id").notNull(),
  interviewType: text("interview_type").notNull().default("general"),
  companyName: text("company_name"),
  transcript: text("transcript"),
  audioUrl: text("audio_url"),
  audioDurationSec: integer("audio_duration_sec"),
  speakingSpeedWpm: integer("speaking_speed_wpm"),
  fillerWords: jsonb("filler_words").$type<{ word: string; count: number }[]>().default([]),
  pauseCount: integer("pause_count").notNull().default(0),
  feedback: text("feedback"),
  weaknesses: jsonb("weaknesses").$type<string[]>().default([]),
  improvementRoadmap: jsonb("improvement_roadmap").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertInterviewAnalyticSchema = createInsertSchema(interviewAnalyticsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertInterviewAnalytic = z.infer<typeof insertInterviewAnalyticSchema>;
export type InterviewAnalytic = typeof interviewAnalyticsTable.$inferSelect;
