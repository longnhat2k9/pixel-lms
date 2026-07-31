import { DB } from "../../../../../lib/db";
import { requireRole } from "../../../../../lib/auth";
import { canPractice } from "../../../../../lib/practiceAccess";
import { gradeQuestion, matchFillBlank, fillBlankValues } from "../../../../../lib/grading";

// Grades a practice attempt on the spot and returns the breakdown + correct
// answers immediately. Students can repeat this an unlimited number of
// times — each submission is still recorded as its own row in the Bài làm
// (attempts) module (kind = 'practice') so teachers/admins can see practice
// history too, it's just never time-limited or blocked from retrying.
export default async function handler(req, res) {
  const session = requireRole(req, res, ["admin", "teacher", "student"]);
  if (!session) return;
  if (req.method !== "POST") return res.status(405).end();

  const { paperId } = req.query;
  if (!(await canPractice(session, paperId))) {
    return res.status(403).json({ error: "Bạn không có quyền luyện tập đề thi này." });
  }

  const { answers } = req.body || {};
  const { rows: paperRows } = await DB.questionbank(`SELECT title, show_answers FROM papers WHERE id = $1`, [paperId]);
  const paperTitle = paperRows[0]?.title || "Luyện tập";
  const showAnswers = session.role !== "student" || paperRows[0]?.show_answers !== false;

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
      isCorrect = given !== undefined && given !== null && String(given) === String(q.correct_answer?.value);
    } else if (q.type === "fill_blank") {
      isCorrect = matchFillBlank(given, q.correct_answer);
    }
    score += gradeQuestion(q, given);
    if (!showAnswers) {
      return { questionId: q.id, isCorrect: null, correctAnswer: null, points: Number(q.points) };
    }
    return {
      questionId: q.id,
      isCorrect,
      correctAnswer: q.type === "fill_blank" ? fillBlankValues(q.correct_answer) : (q.correct_answer?.value ?? null),
      points: Number(q.points),
    };
  });

  // Only students' own practice runs are logged as a Bài làm — a
  // teacher/admin clicking "Xem thử" isn't a student result to grade.
  if (session.role === "student") {
    await DB.submissions(
      `INSERT INTO attempts
        (session_id, session_code, paper_id, exam_title_snapshot, student_id, student_name_snapshot,
         time_limit_minutes, status, answers, auto_score, final_score, submitted_at, kind)
       VALUES (NULL, 'PRACTICE', $1, $2, $3, $4, 0, 'submitted', $5, $6, $6, now(), 'practice')`,
      [paperId, paperTitle, session.id, session.fullName, JSON.stringify(answers || {}), score]
    );
  }

  res.status(200).json({ score, maxScore, showAnswers, breakdown });
}
