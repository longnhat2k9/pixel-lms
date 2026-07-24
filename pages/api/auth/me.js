import { getSession } from "../../../lib/auth";

export default async function handler(req, res) {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: "Chưa đăng nhập." });
  res.status(200).json({ user: session });
}
