import { DB } from "../../../../lib/db";
import { requireRole } from "../../../../lib/auth";

function randomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export default async function handler(req, res) {
  const session = requireRole(req, res, ["admin", "teacher"]);
  if (!session) return;

  if (req.method === "GET") {
    const { rows } = await DB.exams(`SELECT * FROM sessions ORDER BY created_at DESC`);
    return res.status(200).json({ sessions: rows });
  }

  if (req.method === "POST") {
    const { title, paperId, timeLimitMinutes, startTime, endTime, allowMultipleAttempts, notes } = req.body || {};
    if (!title || !paperId) return res.status(400).json({ error: "Thiếu tên ca thi hoặc đề thi." });

    const { rows: paperRows } = await DB.questionbank(`SELECT id FROM papers WHERE id = $1`, [paperId]);
    if (!paperRows[0]) return res.status(400).json({ error: "Đề thi không tồn tại." });

    let code = randomCode();
    for (let i = 0; i < 5; i++) {
      const { rows: clash } = await DB.exams(`SELECT 1 FROM sessions WHERE session_code = $1`, [code]);
      if (!clash[0]) break;
      code = randomCode();
    }

    const { rows } = await DB.exams(
      `INSERT INTO sessions (session_code, title, paper_id, time_limit_minutes, start_time, end_time,
        allow_multiple_attempts, notes, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'scheduled',$9) RETURNING *`,
      [
        code, title, paperId, timeLimitMinutes || 60,
        startTime || null, endTime || null, !!allowMultipleAttempts, notes || null, session.id,
      ]
    );
    return res.status(201).json({ session: rows[0] });
  }

  res.status(405).end();
}
