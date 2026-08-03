import { pgTable, text, serial, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const portfoliosTable = pgTable("portfolios", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  headline: text("headline"),
  about: text("about"),
  theme: text("theme").notNull().default("modern"),
  projects: jsonb("projects").$type<{ name: string; description: string; link?: string; tags?: string[] }[]>().default([]),
  certifications: jsonb("certifications").$type<{ name: string; issuer?: string }[]>().default([]),
  achievements: jsonb("achievements").$type<string[]>().default([]),
  contactEmail: text("contact_email"),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  published: boolean("published").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPortfolioSchema = createInsertSchema(portfoliosTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPortfolio = z.infer<typeof insertPortfolioSchema>;
export type Portfolio = typeof portfoliosTable.$inferSelect;
