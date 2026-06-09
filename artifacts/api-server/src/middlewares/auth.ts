import { Request, Response, NextFunction } from "express";
import * as jwt from "../lib/jwt.js";

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice(7);
    const payload = jwt.verify(token);
    if (payload && typeof payload.id === "number") {
      (req as any).userId = payload.id;
    }
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = auth.slice(7);
  const payload = jwt.verify(token);
  if (!payload || typeof payload.id !== "number") {
    res.status(401).json({ error: "Invalid token" });
    return;
  }
  (req as any).userId = payload.id;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = auth.slice(7);
  const payload = jwt.verify(token);
  if (!payload || payload.role !== "admin") {
    res.status(401).json({ error: "Admin access required" });
    return;
  }
  (req as any).isAdmin = true;
  next();
}
