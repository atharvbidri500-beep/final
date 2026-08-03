import { pgTable, text, serial, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const gamificationTable = pgTable("gamification", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  xp: integer("xp").notNull().default(0),
  level: integer("level").notNull().default(1),
  dailyStreak: integer("daily_streak").notNull().default(0),
  weeklyStreak: integer("weekly_streak").notNull().default(0),
  lastActiveDate: timestamp("last_active_date", { withTimezone: true }),
  lastActiveWeek: timestamp("last_active_week", { withTimezone: true }),
  achievements: jsonb("achievements").$type<string[]>().default([]),
  missionsToday: jsonb("missions_today").$type<{ id: string; title: string; done: boolean; xp: number }[]>().default([]),
  missionsDate: timestamp("missions_date", { withTimezone: true }),
  challenge30Day: jsonb("challenge_30_day").$type<{ active: boolean; days: number[]; startedAt: string }>().default({ active: false, days: [], startedAt: "" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertGamificationSchema = createInsertSchema(gamificationTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertGamification = z.infer<typeof insertGamificationSchema>;
export type Gamification = typeof gamificationTable.$inferSelect;
