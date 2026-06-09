import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const coverLettersTable = pgTable("cover_letters", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  jobRole: text("job_role").notNull(),
  companyName: text("company_name").notNull(),
  experienceLevel: text("experience_level").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCoverLetterSchema = createInsertSchema(coverLettersTable).omit({
  id: true,
  createdAt: true,
});
export type InsertCoverLetter = z.infer<typeof insertCoverLetterSchema>;
export type CoverLetter = typeof coverLettersTable.$inferSelect;
