import { pgTable, text, serial, timestamp, integer, jsonb, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const jobApplicationsTable = pgTable("job_applications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  jobId: integer("job_id"),
  company: text("company").notNull(),
  position: text("position").notNull(),
  status: text("status").notNull().default("saved"),
  appliedAt: timestamp("applied_at", { withTimezone: true }),
  interviewDate: timestamp("interview_date", { withTimezone: true }),
  offerAmount: integer("offer_amount"),
  notes: text("notes"),
  attachments: jsonb("attachments").$type<{ name: string; url: string; type: string }[]>().default([]),
  timeline: jsonb("timeline").$type<{ date: string; event: string }[]>().default([]),
  lastFollowUpAt: timestamp("last_follow_up_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertJobApplicationSchema = createInsertSchema(jobApplicationsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertJobApplication = z.infer<typeof insertJobApplicationSchema>;
export type JobApplication = typeof jobApplicationsTable.$inferSelect;
