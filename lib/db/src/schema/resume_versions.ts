import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const resumeVersionsTable = pgTable("resume_versions", {
  id: serial("id").primaryKey(),
  resumeId: integer("resume_id").notNull(),
  userId: integer("user_id").notNull(),
  versionNo: integer("version_no").notNull().default(1),
  snapshot: jsonb("snapshot").$type<Record<string, unknown>>().default({}),
  atsScore: integer("ats_score"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertResumeVersionSchema = createInsertSchema(resumeVersionsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertResumeVersion = z.infer<typeof insertResumeVersionSchema>;
export type ResumeVersion = typeof resumeVersionsTable.$inferSelect;
