import { pool, db, careerEventsTable } from "@workspace/db";

/** Append a timeline event used for Career Memory + analytics. Fire-and-forget. */
export async function recordEvent(
  userId: number,
  type: string,
  title: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  try {
    await db.insert(careerEventsTable).values({ userId, type, title, metadata });
  } catch (err) {
    console.error("recordEvent failed:", err);
  }
}

export async function getCareerTimeline(userId: number, limit = 50) {
  const { rows } = await pool.query(
    `SELECT * FROM career_events WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [userId, limit],
  ) as any;
  return rows;
}
