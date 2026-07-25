import { DB } from "../../../../lib/db";
import { requireRole } from "../../../../lib/auth";

// Lightweight polling endpoint for the student waiting room — returns only
// what's needed to know whether the session has opened yet, no questions.
export default async function handler(req, res) {
  const session = requireRole(req, res, ["admin", "teacher", "student"]);
  if (!session) return;
  if (req.method !== "GET") return res.status(405).end();

  const { code } = req.query;
  const { rows } = await DB.exams(
    `SELECT id, session_code, title, status, start_time, end_time FROM sessions WHERE session_code = $1`,
    [String(code).trim().toUpperCase()]
  );
  if (!rows[0]) return res.status(404).json({ error: "Mã ca thi không tồn tại." });
  res.status(200).json({ session: rows[0] });
}
