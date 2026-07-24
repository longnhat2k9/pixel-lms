import { DB } from "../../../lib/db";
import { getSession, requireRole } from "../../../lib/auth";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const session = getSession(req);
    const isStaff = session && (session.role === "admin" || session.role === "teacher");
    const { rows } = await DB.posts(
      isStaff
        ? `SELECT * FROM posts ORDER BY created_at DESC`
        : `SELECT * FROM posts WHERE published = true ORDER BY created_at DESC`
    );
    return res.status(200).json({ posts: rows });
  }

  if (req.method === "POST") {
    const session = requireRole(req, res, ["admin", "teacher"]);
    if (!session) return;
    const { title, excerpt, content, published } = req.body || {};
    if (!title || !content) return res.status(400).json({ error: "Thiếu tiêu đề hoặc nội dung." });
    const { rows } = await DB.posts(
      `INSERT INTO posts (title, excerpt, content, author_id, author_name_snapshot, published)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [title, excerpt || "", content, session.id, session.fullName, published !== false]
    );
    return res.status(201).json({ post: rows[0] });
  }

  res.status(405).end();
}
