import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const careerRoadmapsTable = pgTable("career_roadmaps", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  dreamRole: text("dream_role").notNull(),
  targetSalary: integer("target_salary"),
  targetCompany: text("target_company"),
  content: jsonb("content").$type<Record<string, unknown>>().default({}),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCareerRoadmapSchema = createInsertSchema(careerRoadmapsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCareerRoadmap = z.infer<typeof insertCareerRoadmapSchema>;
export type CareerRoadmap = typeof careerRoadmapsTable.$inferSelect;
