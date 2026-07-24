import { DB } from "../../../../lib/db";
import { requireRole } from "../../../../lib/auth";

export default async function handler(req, res) {
  const { id } = req.query;
  const session = requireRole(req, res, ["admin", "teacher"]);
  if (!session) return;

  if (req.method === "PUT") {
    const { content, type, points, order_index, data, correct_answer } = req.body || {};
    const { rows } = await DB.questionbank(
      `UPDATE questions SET
        content = COALESCE($1, content),
        type = COALESCE($2, type),
        points = COALESCE($3, points),
        order_index = COALESCE($4, order_index),
        data = COALESCE($5, data),
        correct_answer = COALESCE($6, correct_answer)
       WHERE id = $7 RETURNING *`,
      [
        content, type, points, order_index,
        data ? JSON.stringify(data) : null,
        correct_answer ? JSON.stringify(correct_answer) : null,
        id,
      ]
    );
    return res.status(200).json({ question: rows[0] });
  }

  if (req.method === "DELETE") {
    await DB.questionbank(`DELETE FROM questions WHERE id = $1`, [id]);
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
