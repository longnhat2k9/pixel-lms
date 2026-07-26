// Auto-grades a single question against a given answer. Only choice2,
// choice4, and fill_blank are objectively gradable; essay/matching return 0
// until a teacher enters a manual score for them.
export function gradeQuestion(q, given) {
  if (q.type === "choice2" || q.type === "choice4") {
    return given !== undefined && given !== null && String(given) === String(q.correct_answer?.value)
      ? Number(q.points)
      : 0;
  }
  if (q.type === "fill_blank") {
    const norm = (s) => String(s || "").trim().toLowerCase();
    return given !== undefined && given !== null && norm(given) === norm(q.correct_answer?.value)
      ? Number(q.points)
      : 0;
  }
  return 0;
}

// autoScore: sum of pure auto-grading against each question's CURRENT
// correct_answer (recalculated fresh every time this runs — this is what
// makes "chấm lại" pick up answer-key edits a teacher made afterwards).
// finalScore: same, but any question with a manual override keeps that
// teacher-entered value instead of the auto-graded one.
export function computeAttemptScores(questions, answers, overrides = {}) {
  let autoScore = 0;
  let finalScore = 0;
  for (const q of questions) {
    const auto = gradeQuestion(q, answers?.[q.id]);
    autoScore += auto;
    if (Object.prototype.hasOwnProperty.call(overrides, q.id)) {
      finalScore += Number(overrides[q.id] || 0);
    } else {
      finalScore += auto;
    }
  }
  return { autoScore, finalScore };
}
