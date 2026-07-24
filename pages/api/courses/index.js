import { DB } from "../../../lib/db";
import { requireRole } from "../../../lib/auth";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const session = requireRole(req, res, ["admin", "teacher", "student"]);
    if (!session) return;

    if (session.role === "admin") {
      const { rows } = await DB.courses(`SELECT * FROM courses ORDER BY created_at DESC`);
      return res.status(200).json({ courses: rows });
    }

    const { rows } = await DB.courses(
      `SELECT c.* FROM courses c
       JOIN course_access a ON a.course_id = c.id
       WHERE a.user_id = $1
       ORDER BY c.created_at DESC`,
      [session.id]
    );
    return res.status(200).json({ courses: rows });
  }

  if (req.method === "POST") {
    const session = requireRole(req, res, ["admin"]);
    if (!session) return;
    const { title, description } = req.body || {};
    if (!title) return res.status(400).json({ error: "Thiếu tên khóa học." });
    const { rows } = await DB.courses(
      `INSERT INTO courses (title, description, created_by) VALUES ($1,$2,$3) RETURNING *`,
      [title, description || "", session.id]
    );
    return res.status(201).json({ course: rows[0] });
  }

  res.status(405).end();
}
