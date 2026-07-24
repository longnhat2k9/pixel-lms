import { DB } from "../../../../lib/db";
import { requireRole } from "../../../../lib/auth";

export default async function handler(req, res) {
  const session = requireRole(req, res, ["admin", "teacher"]);
  if (!session) return;

  if (req.method === "GET") {
    const { rows } = await DB.questionbank(`SELECT * FROM papers ORDER BY created_at DESC`);
    return res.status(200).json({ papers: rows });
  }

  if (req.method === "POST") {
    const { title, description } = req.body || {};
    if (!title) return res.status(400).json({ error: "Thiếu tên đề thi." });
    const { rows } = await DB.questionbank(
      `INSERT INTO papers (title, description, created_by) VALUES ($1,$2,$3) RETURNING *`,
      [title, description || "", session.id]
    );
    return res.status(201).json({ paper: rows[0] });
  }

  res.status(405).end();
}
