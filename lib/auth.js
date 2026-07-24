import crypto from "crypto";

const COOKIE_NAME = "pxl_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("Missing env var AUTH_SECRET.");
  return s;
}

function b64url(input) {
  return Buffer.from(input).toString("base64url");
}

function sign(payloadB64) {
  return crypto.createHmac("sha256", secret()).update(payloadB64).digest("base64url");
}

// payload: { id, username, role, fullName }
export function createSessionToken(payload) {
  const body = { ...payload, exp: Date.now() + MAX_AGE_SECONDS * 1000 };
  const payloadB64 = b64url(JSON.stringify(body));
  const sig = sign(payloadB64);
  return `${payloadB64}.${sig}`;
}

export function verifySessionToken(token) {
  if (!token || !token.includes(".")) return null;
  const [payloadB64, sig] = token.split(".");
  const expected = sign(payloadB64);
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const body = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
    if (body.exp < Date.now()) return null;
    return body;
  } catch {
    return null;
  }
}

export function setSessionCookie(res, token) {
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE_SECONDS}${
      process.env.NODE_ENV === "production" ? "; Secure" : ""
    }`
  );
}

export function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=; Path=/; HttpOnly; Max-Age=0`);
}

function parseCookies(req) {
  const header = req.headers.cookie || "";
  return Object.fromEntries(
    header.split(";").filter(Boolean).map((c) => {
      const idx = c.indexOf("=");
      return [c.slice(0, idx).trim(), decodeURIComponent(c.slice(idx + 1))];
    })
  );
}

export function getSession(req) {
  const cookies = parseCookies(req);
  const token = cookies[COOKIE_NAME];
  return verifySessionToken(token);
}

// Use inside API routes: const user = requireRole(req, res, ["admin","teacher"]);
// Returns the session, or null after already sending a 401/403 response.
export function requireRole(req, res, roles) {
  const session = getSession(req);
  if (!session) {
    res.status(401).json({ error: "Chưa đăng nhập." });
    return null;
  }
  if (roles && roles.length && !roles.includes(session.role)) {
    res.status(403).json({ error: "Bạn không có quyền thực hiện thao tác này." });
    return null;
  }
  return session;
}

export function hmacPassword(raw) {
  // Passwords are stored in plaintext in `accounts` by design, matching the
  // Pixel CMS convention, so admins/teachers can print account lists with
  // credentials. This helper is kept as a single choke point in case that
  // tradeoff is revisited later.
  return raw;
}
