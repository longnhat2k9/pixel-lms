import { DB } from "../../../../lib/db";
import { requireRole } from "../../../../lib/auth";

export default async function handler(req, res) {
  const { id } = req.query;
  const session = requireRole(req, res, ["admin", "teacher"]);
  if (!session) return;

  if (req.method === "GET") {
    const { rows: pRows } = await DB.questionbank(`SELECT * FROM papers WHERE id = $1`, [id]);
    if (!pRows[0]) return res.status(404).json({ error: "Không tìm thấy đề thi." });
    const { rows: questions } = await DB.questionbank(
      `SELECT * FROM questions WHERE paper_id = $1 ORDER BY order_index, created_at`,
      [id]
    );
    return res.status(200).json({ paper: pRows[0], questions });
  }

  if (req.method === "PUT") {
    const { title, description } = req.body || {};
    const { rows } = await DB.questionbank(
      `UPDATE papers SET title = COALESCE($1,title), description = COALESCE($2,description) WHERE id = $3 RETURNING *`,
      [title, description, id]
    );
    return res.status(200).json({ paper: rows[0] });
  }

  if (req.method === "DELETE") {
    await DB.questionbank(`DELETE FROM papers WHERE id = $1`, [id]);
    return res.status(200).json({ ok: true });
  }

  if (req.method === "POST") {
    // add a question to this paper
    const { type, content, points, data, correct_answer } = req.body || {};
    if (!type || !content) return res.status(400).json({ error: "Thiếu loại câu hỏi hoặc nội dung." });
    const { rows: countRows } = await DB.questionbank(
      `SELECT COUNT(*)::int AS c FROM questions WHERE paper_id = $1`,
      [id]
    );
    const { rows } = await DB.questionbank(
      `INSERT INTO questions (paper_id, type, content, points, order_index, data, correct_answer)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [id, type, content, points || 1, countRows[0].c, JSON.stringify(data || {}), JSON.stringify(correct_answer || {})]
    );
    return res.status(201).json({ question: rows[0] });
  }

  res.status(405).end();
}
