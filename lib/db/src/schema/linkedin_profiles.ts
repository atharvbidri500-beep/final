import { pgTable, text, serial, timestamp, integer, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const linkedinProfilesTable = pgTable("linkedin_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  headline: text("headline"),
  about: text("about"),
  experience: jsonb("experience").$type<{ role: string; company: string; description?: string }[]>().default([]),
  skills: jsonb("skills").$type<string[]>().default([]),
  featuredProjects: jsonb("featured_projects").$type<{ name: string; description?: string; link?: string }[]>().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertLinkedinProfileSchema = createInsertSchema(linkedinProfilesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertLinkedinProfile = z.infer<typeof insertLinkedinProfileSchema>;
export type LinkedinProfile = typeof linkedinProfilesTable.$inferSelect;

export const contentIdeasTable = pgTable("content_ideas", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  category: text("category").notNull().default("post"),
  content: text("content").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertContentIdeaSchema = createInsertSchema(contentIdeasTable).omit({
  id: true,
  used: true,
  createdAt: true,
});
export type InsertContentIdea = z.infer<typeof insertContentIdeaSchema>;
export type ContentIdea = typeof contentIdeasTable.$inferSelect;
