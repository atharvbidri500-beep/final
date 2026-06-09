import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const qrCodesTable = pgTable("qr_codes", {
  id: serial("id").primaryKey(),
  type: text("type").notNull().unique(),
  imageUrl: text("image_url").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertQrCodeSchema = createInsertSchema(qrCodesTable).omit({
  id: true,
  updatedAt: true,
});
export type InsertQrCode = z.infer<typeof insertQrCodeSchema>;
export type QrCode = typeof qrCodesTable.$inferSelect;
