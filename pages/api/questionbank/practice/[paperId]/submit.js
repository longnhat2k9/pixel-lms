import { DB } from "../../../../../lib/db";
import { requireRole } from "../../../../../lib/auth";
import { canPractice } from "../../../../../lib/practiceAccess";

// Grades a practice attempt on the spot and returns the breakdown + correct
// answers immediately. Nothing is persisted — practice can be repeated an
// unlimited number of times with no record kept, unlike a real exam attempt.
export default async function handler(req, res) {
  const session = requireRole(req, res, ["admin", "teacher", "student"]);
  if (!session) return;
  if (req.method !== "POST") return res.status(405).end();

  const { paperId } = req.query;
  if (!(await canPractice(session, paperId))) {
    return res.status(403).json({ error: "Bạn không có quyền luyện tập đề thi này." });
  }

  const { answers } = req.body || {};
  const { rows: questions } = await DB.questionbank(
    `SELECT id, type, points, correct_answer FROM questions WHERE paper_id = $1 ORDER BY order_index`,
    [paperId]
  );

  let score = 0;
  let maxScore = 0;
  const breakdown = questions.map((q) => {
    maxScore += Number(q.points);
    const given = answers?.[q.id];
    let isCorrect = null; // null = not auto-gradable (essay/matching)
    if (q.type === "choice2" || q.type === "choice4") {
      isCorrect = given !== undefined && String(given) === String(q.correct_answer?.value);
    } else if (q.type === "fill_blank") {
      const norm = (s) => String(s || "").trim().toLowerCase();
      isCorrect = given !== undefined && norm(given) === norm(q.correct_answer?.value);
    }
    if (isCorrect) score += Number(q.points);
    return {
      questionId: q.id,
      isCorrect,
      correctAnswer: q.correct_answer?.value ?? null,
      points: Number(q.points),
    };
  });

  res.status(200).json({ score, maxScore, breakdown });
}
