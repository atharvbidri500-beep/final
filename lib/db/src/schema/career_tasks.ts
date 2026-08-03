import { pgTable, text, serial, timestamp, integer, boolean, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const careerTasksTable = pgTable("career_tasks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull().default("custom"),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: date("due_date", { mode: "date" }),
  done: boolean("done").notNull().default(false),
  relatedId: integer("related_id"),
  reminderAt: timestamp("reminder_at", { withTimezone: true }),
  reminderSent: boolean("reminder_sent").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCareerTaskSchema = createInsertSchema(careerTasksTable).omit({
  id: true,
  reminderSent: true,
  createdAt: true,
});
export type InsertCareerTask = z.infer<typeof insertCareerTaskSchema>;
export type CareerTask = typeof careerTasksTable.$inferSelect;
