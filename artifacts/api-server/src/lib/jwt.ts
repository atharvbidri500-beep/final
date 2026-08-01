import * as crypto from "crypto";

const SECRET = process.env.SESSION_SECRET ?? "careerboost_jwt_secret_2024";

function base64url(input: string | Buffer): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export function sign(payload: Record<string, unknown>, expiresInDays = 30): string {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify({
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expiresInDays * 86400,
  }));
  const sig = base64url(
    crypto.createHmac("sha256", SECRET).update(`${header}.${body}`).digest()
  );
  return `${header}.${body}.${sig}`;
}

export function verify(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;
    const expected = base64url(
      crypto.createHmac("sha256", SECRET).update(`${header}.${body}`).digest()
    );
    if (sig !== expected) return null;
    const decoded = JSON.parse(Buffer.from(body, "base64").toString());
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) return null;
    return decoded;
  } catch {
    return null;
  }
}
