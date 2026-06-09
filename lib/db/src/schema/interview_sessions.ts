import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const interviewSessionsTable = pgTable("interview_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  category: text("category").notNull(),
  questionCount: integer("question_count").notNull().default(0),
  avgCommunicationScore: integer("avg_communication_score"),
  avgConfidenceScore: integer("avg_confidence_score"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertInterviewSessionSchema = createInsertSchema(interviewSessionsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertInterviewSession = z.infer<typeof insertInterviewSessionSchema>;
export type InterviewSession = typeof interviewSessionsTable.$inferSelect;
