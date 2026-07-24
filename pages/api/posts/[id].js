import { DB } from "../../../lib/db";
import { getSession, requireRole } from "../../../lib/auth";

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === "GET") {
    const session = getSession(req);
    const isStaff = session && (session.role === "admin" || session.role === "teacher");
    const { rows } = await DB.posts(`SELECT * FROM posts WHERE id = $1`, [id]);
    const post = rows[0];
    if (!post || (!post.published && !isStaff)) return res.status(404).json({ error: "Không tìm thấy bài viết." });
    return res.status(200).json({ post });
  }

  const session = requireRole(req, res, ["admin", "teacher"]);
  if (!session) return;

  if (req.method === "PUT") {
    const { title, excerpt, content, published } = req.body || {};
    const { rows } = await DB.posts(
      `UPDATE posts SET
        title = COALESCE($1,title), excerpt = COALESCE($2,excerpt),
        content = COALESCE($3,content), published = COALESCE($4,published),
        updated_at = now()
       WHERE id = $5 RETURNING *`,
      [title, excerpt, content, published, id]
    );
    return res.status(200).json({ post: rows[0] });
  }

  if (req.method === "DELETE") {
    await DB.posts(`DELETE FROM posts WHERE id = $1`, [id]);
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
