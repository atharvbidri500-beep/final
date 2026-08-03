import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const careerSnapshotsTable = pgTable("career_snapshots", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  period: text("period").notNull().default("week"),
  periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
  careerScore: integer("career_score"),
  atsAverage: integer("ats_average"),
  interviewAverage: integer("interview_average"),
  applicationsCount: integer("applications_count").notNull().default(0),
  responsesCount: integer("responses_count").notNull().default(0),
  offersCount: integer("offers_count").notNull().default(0),
  xpEarned: integer("xp_earned").notNull().default(0),
  skillsAdded: integer("skills_added").notNull().default(0),
  resumeSaves: integer("resume_saves").notNull().default(0),
  extra: jsonb("extra").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCareerSnapshotSchema = createInsertSchema(careerSnapshotsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertCareerSnapshot = z.infer<typeof insertCareerSnapshotSchema>;
export type CareerSnapshot = typeof careerSnapshotsTable.$inferSelect;
