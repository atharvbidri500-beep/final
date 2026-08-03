import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const certificationsTable = pgTable("certifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  issuer: text("issuer"),
  issuedDate: timestamp("issued_date", { withTimezone: true }),
  credentialUrl: text("credential_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCertificationSchema = createInsertSchema(certificationsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertCertification = z.infer<typeof insertCertificationSchema>;
export type Certification = typeof certificationsTable.$inferSelect;
