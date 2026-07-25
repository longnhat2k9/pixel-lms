import { DB } from "../../../../lib/db";
import { requireRole } from "../../../../lib/auth";

// Returns the attempt plus its questions. Students never see correct
// answers (used for the exam-taking screen). Teachers/admins get the
// correct_answer field too, so the grading screen can show full context.
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

  const isGrader = session.role === "admin" || session.role === "teacher";
  const { rows: questions } = await DB.questionbank(
    `SELECT id, type, content, points, order_index, data${isGrader ? ", correct_answer" : ""}
     FROM questions WHERE paper_id = $1 ORDER BY order_index`,
    [attempt.paper_id]
  );

  res.status(200).json({ attempt, questions });
}
