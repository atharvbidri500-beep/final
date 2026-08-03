import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const careerProfilesTable = pgTable("career_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  dreamRole: text("dream_role"),
  targetSalary: integer("target_salary"),
  targetCompany: text("target_company"),
  currentRole: text("current_role"),
  yearsOfExperience: integer("years_of_experience"),
  strengths: jsonb("strengths").$type<string[]>().default([]),
  weaknesses: jsonb("weaknesses").$type<string[]>().default([]),
  preferredCompanies: jsonb("preferred_companies").$type<string[]>().default([]),
  preferredLocations: jsonb("preferred_locations").$type<string[]>().default([]),
  resumeUrl: text("resume_url"),
  linkedinUrl: text("linkedin_url"),
  githubUrl: text("github_url"),
  careerMemory: jsonb("career_memory").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCareerProfileSchema = createInsertSchema(careerProfilesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCareerProfile = z.infer<typeof insertCareerProfileSchema>;
export type CareerProfile = typeof careerProfilesTable.$inferSelect;
