import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const salaryOffersTable = pgTable("salary_offers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  company: text("company").notNull(),
  position: text("position").notNull(),
  offeredAmount: integer("offered_amount").notNull(),
  expectedAmount: integer("expected_amount"),
  marketRange: jsonb("market_range").$type<{ min: number; max: number; source: string }>().default({ min: 0, max: 0, source: "" }),
  strategy: text("strategy"),
  counterOffer: integer("counter_offer"),
  negotiationEmails: jsonb("negotiation_emails").$type<{ subject: string; body: string }[]>().default([]),
  status: text("status").notNull().default("analyzed"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSalaryOfferSchema = createInsertSchema(salaryOffersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSalaryOffer = z.infer<typeof insertSalaryOfferSchema>;
export type SalaryOffer = typeof salaryOffersTable.$inferSelect;
