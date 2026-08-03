import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/** Daily snapshot of the AI's learned understanding of a user. */
export const jobIntelProfilesTable = pgTable("job_intel_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
  careerScore: integer("career_score"),
  interviewReadiness: integer("interview_readiness").notNull().default(0),
  consistencyScore: integer("consistency_score").notNull().default(0),
  learningVelocity: integer("learning_velocity").notNull().default(0),
  derivedSkills: jsonb("derived_skills")
    .$type<{ name: string; confidence: number; sources: string[] }[]>().default([]),
  strengths: jsonb("strengths").$type<string[]>().default([]),
  weaknesses: jsonb("weaknesses").$type<string[]>().default([]),
  careerDirection: jsonb("career_direction").$type<{
    dreamRole: string | null;
    targetSalary: number | null;
    targetCompany: string | null;
    currentRole: string | null;
    yearsOfExperience: number;
    preferredCompanies: string[];
    preferredLocations: string[];
    industries: string[];
  }>().default({ dreamRole: null, targetSalary: null, targetCompany: null, currentRole: null, yearsOfExperience: 0, preferredCompanies: [], preferredLocations: [], industries: [] }),
  evidenceStats: jsonb("evidence_stats").$type<Record<string, unknown>>().default({}),
  insight: text("insight"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertJobIntelProfileSchema = createInsertSchema(jobIntelProfilesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertJobIntelProfile = z.infer<typeof insertJobIntelProfileSchema>;
export type JobIntelProfile = typeof jobIntelProfilesTable.$inferSelect;
