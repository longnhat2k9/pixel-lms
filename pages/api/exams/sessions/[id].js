import { DB } from "../../../../lib/db";
import { requireRole } from "../../../../lib/auth";

export default async function handler(req, res) {
  const { id } = req.query;
  const session = requireRole(req, res, ["admin", "teacher"]);
  if (!session) return;

  if (req.method === "GET") {
    const { rows } = await DB.exams(`SELECT * FROM sessions WHERE id = $1`, [id]);
    if (!rows[0]) return res.status(404).json({ error: "Không tìm thấy ca thi." });
    const { rows: attempts } = await DB.submissions(
      `SELECT * FROM attempts WHERE session_id = $1 ORDER BY started_at DESC`,
      [id]
    );
    return res.status(200).json({ session: rows[0], attempts });
  }

  if (req.method === "PUT") {
    const { title, timeLimitMinutes, startTime, endTime, status, allowMultipleAttempts, notes } = req.body || {};
    const { rows } = await DB.exams(
      `UPDATE sessions SET
        title = COALESCE($1,title),
        time_limit_minutes = COALESCE($2,time_limit_minutes),
        start_time = COALESCE($3,start_time),
        end_time = COALESCE($4,end_time),
        status = COALESCE($5,status),
        allow_multiple_attempts = COALESCE($6,allow_multiple_attempts),
        notes = COALESCE($7,notes)
       WHERE id = $8 RETURNING *`,
      [title, timeLimitMinutes, startTime, endTime, status, allowMultipleAttempts, notes, id]
    );
    return res.status(200).json({ session: rows[0] });
  }

  if (req.method === "DELETE") {
    await DB.exams(`DELETE FROM sessions WHERE id = $1`, [id]);
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
