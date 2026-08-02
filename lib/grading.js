function normalizeText(s) {
  return String(s || "").trim().toLowerCase();
}

// fill_blank correct_answer can be either the legacy { value: "text" } shape
// or the newer { values: ["text1", "text2", ...] } shape that accepts
// several correct answers. This always returns a clean array of accepted
// values regardless of which shape is stored.
export function fillBlankValues(correct_answer) {
  if (Array.isArray(correct_answer?.values)) {
    return correct_answer.values.filter((v) => v !== undefined && v !== null && String(v).trim() !== "");
  }
  if (correct_answer?.value !== undefined && correct_answer.value !== null && String(correct_answer.value).trim() !== "") {
    return [correct_answer.value];
  }
  return [];
}

export function matchFillBlank(given, correct_answer) {
  if (given === undefined || given === null) return false;
  const givenNorm = normalizeText(given);
  return fillBlankValues(correct_answer).some((v) => normalizeText(v) === givenNorm);
}

// Auto-grades a single question against a given answer. Only choice2,
// choice4, fill_blank, and ordering are objectively gradable; essay/matching
// return 0 until a teacher enters a manual score for them.
export function gradeQuestion(q, given) {
  if (q.type === "choice2" || q.type === "choice4") {
    return given !== undefined && given !== null && String(given) === String(q.correct_answer?.value)
      ? Number(q.points)
      : 0;
  }
  if (q.type === "fill_blank") {
    return matchFillBlank(given, q.correct_answer) ? Number(q.points) : 0;
  }
  if (q.type === "ordering") {
    return isOrderingCorrect(q, given) ? Number(q.points) : 0;
  }
  if (q.type === "grouping") {
    return isGroupingCorrect(q, given) ? Number(q.points) : 0;
  }
  return 0;
}

// `given` for an ordering question is an array of ORIGINAL item indices in
// the order the student arranged them. Correct means it exactly matches
// [0, 1, 2, ...] — i.e. the order the teacher originally entered the items.
export function isOrderingCorrect(q, given) {
  const n = (q.data?.items || []).length;
  if (!Array.isArray(given) || given.length !== n || n === 0) return false;
  return given.every((v, i) => Number(v) === i);
}

// `given` for a grouping question is an object mapping item id (original
// index) -> chosen column index, e.g. { "0": 2, "1": 0 }. Correct means
// every single item is assigned to the column the teacher put it in.
export function isGroupingCorrect(q, given) {
  const items = q.data?.items || [];
  if (items.length === 0 || !given || typeof given !== "object") return false;
  return items.every((it, i) => Number(given[i]) === Number(it.columnIndex));
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
