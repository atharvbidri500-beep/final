import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  mobile: text("mobile"),
  city: text("city"),
  isPremium: boolean("is_premium").notNull().default(false),
  premiumExpiresAt: timestamp("premium_expires_at", { withTimezone: true }),
  plan: text("plan").notNull().default("free"),
  aiJobIntelConsent: boolean("ai_job_intel_consent").notNull().default(false),
  resumeCount: integer("resume_count").notNull().default(0),
  coverLetterCount: integer("cover_letter_count").notNull().default(0),
  interviewCount: integer("interview_count").notNull().default(0),
  englishUseCount: integer("english_use_count").notNull().default(0),
  englishUseDate: timestamp("english_use_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
