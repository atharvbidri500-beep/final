import type { Request, Response, NextFunction } from "express";

interface Bucket {
  count: number;
  windowStart: number;
}

const buckets = new Map<string, Bucket>();

function cleanup(now: number): void {
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStart > 60 * 60 * 1000) {
      buckets.delete(key);
    }
  }
}

export function rateLimit(options: { limit: number; windowMs: number; message?: string }) {
  const { limit, windowMs } = options;
  const message = options.message ?? "Too many requests, please try again later.";

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    if (buckets.size > 10_000) cleanup(now);

    const key = `${req.ip ?? "unknown"}:${req.path}`;
    const bucket = buckets.get(key);

    if (!bucket || now - bucket.windowStart >= windowMs) {
      buckets.set(key, { count: 1, windowStart: now });
      next();
      return;
    }

    if (bucket.count >= limit) {
      res.status(429).json({ error: message });
      return;
    }

    bucket.count += 1;
    next();
  };
}
