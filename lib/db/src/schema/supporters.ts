import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const supportersTable = pgTable("supporters", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  mobile: text("mobile").notNull(),
  amount: integer("amount").notNull(),
  upiTransactionId: text("upi_transaction_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSupporterSchema = createInsertSchema(supportersTable).omit({
  id: true,
  createdAt: true,
});
export type InsertSupporter = z.infer<typeof insertSupporterSchema>;
export type Supporter = typeof supportersTable.$inferSelect;
