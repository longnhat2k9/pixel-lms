import { DB } from "../../../../lib/db";
import { requireRole } from "../../../../lib/auth";

// Returns the attempt plus its questions with correct answers stripped out,
// for rendering the exam-taking screen.
export default async function handler(req, res) {
  const { id } = req.query;
  const session = requireRole(req, res, ["admin", "teacher", "student"]);
  if (!session) return;
  if (req.method !== "GET") return res.status(405).end();

  const { rows } = await DB.submissions(`SELECT * FROM attempts WHERE id = $1`, [id]);
  const attempt = rows[0];
  if (!attempt) return res.status(404).json({ error: "Không tìm thấy bài làm." });
  if (session.role === "student" && attempt.student_id !== session.id) {
    return res.status(403).json({ error: "Không có quyền." });
  }

  const { rows: questions } = await DB.questionbank(
    `SELECT id, type, content, points, order_index, data FROM questions WHERE paper_id = $1 ORDER BY order_index`,
    [attempt.paper_id]
  );

  res.status(200).json({ attempt, questions });
}
