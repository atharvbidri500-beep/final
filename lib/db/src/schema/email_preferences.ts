import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const emailPreferencesTable = pgTable("email_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  emailNotifications: boolean("email_notifications").notNull().default(true),
  unsubscribed: boolean("unsubscribed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertEmailPreferenceSchema = createInsertSchema(emailPreferencesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertEmailPreference = z.infer<typeof insertEmailPreferenceSchema>;
export type EmailPreference = typeof emailPreferencesTable.$inferSelect;
