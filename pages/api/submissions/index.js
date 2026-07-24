import { DB } from "../../../lib/db";
import { requireRole } from "../../../lib/auth";

export default async function handler(req, res) {
  const session = requireRole(req, res, ["admin", "teacher", "student"]);
  if (!session) return;
  if (req.method !== "GET") return res.status(405).end();

  if (session.role === "student") {
    const { rows } = await DB.submissions(
      `SELECT * FROM attempts WHERE student_id = $1 ORDER BY started_at DESC`,
      [session.id]
    );
    return res.status(200).json({ attempts: rows });
  }

  const { rows } = await DB.submissions(`SELECT * FROM attempts ORDER BY started_at DESC LIMIT 500`);
  res.status(200).json({ attempts: rows });
}
