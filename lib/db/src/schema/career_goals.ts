import { pgTable, text, serial, timestamp, integer, date, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const careerGoalsTable = pgTable("career_goals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  targetValue: integer("target_value"),
  currentValue: integer("current_value").notNull().default(0),
  deadline: date("deadline", { mode: "date" }),
  status: text("status").notNull().default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCareerGoalSchema = createInsertSchema(careerGoalsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCareerGoal = z.infer<typeof insertCareerGoalSchema>;
export type CareerGoal = typeof careerGoalsTable.$inferSelect;
