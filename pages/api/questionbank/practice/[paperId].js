import { DB } from "../../../../lib/db";
import { requireRole } from "../../../../lib/auth";
import { canPractice } from "../../../../lib/practiceAccess";
import { buildOrderingData, buildGroupingData } from "../../../../lib/shuffle";

// Returns the paper + questions with correct answers stripped out, for
// unlimited self-practice (no session, no timer, no attempt record).
export default async function handler(req, res) {
  const session = requireRole(req, res, ["admin", "teacher", "student"]);
  if (!session) return;
  if (req.method !== "GET") return res.status(405).end();

  const { paperId } = req.query;
  if (!(await canPractice(session, paperId))) {
    return res.status(403).json({ error: "Bạn không có quyền luyện tập đề thi này." });
  }

  const { rows: paperRows } = await DB.questionbank(`SELECT id, title FROM papers WHERE id = $1`, [paperId]);
  if (!paperRows[0]) return res.status(404).json({ error: "Không tìm thấy đề thi." });

  const { rows: rawQuestions } = await DB.questionbank(
    `SELECT id, type, content, points, order_index, data FROM questions WHERE paper_id = $1 ORDER BY order_index`,
    [paperId]
  );

  const isGrader = session.role === "admin" || session.role === "teacher";
  const questions = rawQuestions.map((q) => {
    if (q.type === "ordering") {
      const items = q.data?.items || [];
      return { ...q, data: buildOrderingData(items, `${paperId}-${q.id}`, isGrader) };
    }
    if (q.type === "grouping") {
      const columns = q.data?.columns || [];
      const items = q.data?.items || [];
      return { ...q, data: buildGroupingData(columns, items, `${paperId}-${q.id}`, isGrader) };
    }
    return q;
  });

  res.status(200).json({ paper: paperRows[0], questions });
}
