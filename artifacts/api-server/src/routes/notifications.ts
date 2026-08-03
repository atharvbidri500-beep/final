import { Router } from "express";
import { eq, desc, and, sql } from "drizzle-orm";
import { db, notificationsTable, emailPreferencesTable } from "@workspace/db";

const router = Router();

router.get("/notifications", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const items = await db.select().from(notificationsTable)
    .where(eq(notificationsTable.userId, userId))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(50);
  res.json(items.map(n => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body ?? null,
    link: n.link ?? null,
    read: n.read,
    createdAt: n.createdAt.toISOString(),
  })));
});

router.get("/notifications/unread-count", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [row] = await db.select({ count: sql<number>`count(*)` }).from(notificationsTable)
    .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.read, false)));
  res.json({ count: Number(row?.count ?? 0) });
});

router.post("/notifications/read", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { id } = req.body;
  if (id) {
    await db.update(notificationsTable).set({ read: true })
      .where(and(eq(notificationsTable.id, Number(id)), eq(notificationsTable.userId, userId)));
  } else {
    await db.update(notificationsTable).set({ read: true }).where(eq(notificationsTable.userId, userId));
  }
  res.json({ success: true });
});

router.get("/users/email-preferences", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [pref] = await db.select().from(emailPreferencesTable).where(eq(emailPreferencesTable.userId, userId));
  res.json({
    emailNotifications: pref?.emailNotifications ?? true,
    unsubscribed: pref?.unsubscribed ?? false,
  });
});

router.put("/users/email-preferences", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { emailNotifications, unsubscribed } = req.body;
  const existing = await db.select().from(emailPreferencesTable).where(eq(emailPreferencesTable.userId, userId));
  if (existing.length === 0) {
    await db.insert(emailPreferencesTable).values({
      userId,
      emailNotifications: typeof emailNotifications === "boolean" ? emailNotifications : true,
      unsubscribed: typeof unsubscribed === "boolean" ? unsubscribed : false,
    });
  } else {
    await db.update(emailPreferencesTable).set({
      ...(typeof emailNotifications === "boolean" ? { emailNotifications } : {}),
      ...(typeof unsubscribed === "boolean" ? { unsubscribed } : {}),
    }).where(eq(emailPreferencesTable.userId, userId));
  }
  const [pref] = await db.select().from(emailPreferencesTable).where(eq(emailPreferencesTable.userId, userId));
  res.json({
    emailNotifications: pref?.emailNotifications ?? true,
    unsubscribed: pref?.unsubscribed ?? false,
  });
});

export default router;
