import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../../components/Layout";
import MarkdownRenderer from "../../../components/MarkdownRenderer";
import { printReact } from "../../../lib/print";
import { ExamPaperDoc, AnswerKeyDoc } from "../../../components/printDocs";
import { useUser, apiFetch } from "../../../lib/useUser";

const TYPE_LABEL = {
  choice2: "2 lựa chọn (Đúng/Sai)",
  choice4: "4 lựa chọn",
  fill_blank: "Điền khuyết",
  essay: "Tự luận",
  matching: "Nối câu",
};

function emptyForm() {
  return {
    type: "choice4",
    content: "",
    points: 1,
    options: ["", "", "", ""],
    correctIndex: 0,
    correctText: "",
  };
}

function questionToForm(q) {
  const isChoice = q.type === "choice2" || q.type === "choice4";
  return {
    type: q.type,
    content: q.content,
    points: q.points,
    options: q.type === "choice4" ? (q.data?.options || ["", "", "", ""]) : ["", "", "", ""],
    correctIndex: isChoice ? Number(q.correct_answer?.value || 0) : 0,
    correctText: q.type === "fill_blank" ? (q.correct_answer?.value || "") : "",
  };
}

function buildPayload(form) {
  let data = {};
  let correct_answer = {};
  if (form.type === "choice2") {
    data = { options: ["Đúng", "Sai"] };
    correct_answer = { value: String(form.correctIndex) };
  } else if (form.type === "choice4") {
    data = { options: form.options };
    correct_answer = { value: String(form.correctIndex) };
  } else if (form.type === "fill_blank") {
    correct_answer = { value: form.correctText };
  }
  return { type: form.type, content: form.content, points: Number(form.points), data, correct_answer };
}

function QuestionFields({ form, setForm }) {
  return (
    <>
      <div className="grid md:grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-mute">Loại câu hỏi</label>
          <select className="pxl-input mt-1" value={form.type} onChange={(e) => setForm({ ...emptyForm(), type: e.target.value })}>
            {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-mute">Điểm</label>
          <input type="number" step="0.1" className="pxl-input mt-1" value={form.points}
            onChange={(e) => setForm({ ...form, points: e.target.value })} />
        </div>
      </div>

      <div>
        <label className="text-xs text-mute">Nội dung câu hỏi</label>
        <textarea className="pxl-input mt-1 font-mono text-sm" rows={3} value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })} required />
        <div className="text-xs text-mute mt-1">
          Hỗ trợ Markdown & LaTeX: chèn ảnh bằng <code>![mô tả](url)</code>, công thức bằng <code>$...$</code> hoặc <code>$$...$$</code>.
        </div>
        {form.content && (
          <div className="mt-2 bg-panel2 rounded-pixel p-3 text-sm">
            <div className="text-xs text-mute mb-1">Xem trước:</div>
            <MarkdownRenderer content={form.content} />
          </div>
        )}
      </div>

      {form.type === "choice2" && (
        <div>
          <label className="text-xs text-mute">Đáp án đúng</label>
          <select className="pxl-input mt-1" value={form.correctIndex}
            onChange={(e) => setForm({ ...form, correctIndex: Number(e.target.value) })}>
            <option value={0}>Đúng</option>
            <option value={1}>Sai</option>
          </select>
        </div>
      )}

      {form.type === "choice4" && (
        <div className="space-y-2">
          {form.options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="radio" name={`correct4-${form._editId || "new"}`} checked={form.correctIndex === i}
                onChange={() => setForm({ ...form, correctIndex: i })} />
              <input className="pxl-input" placeholder={`Lựa chọn ${i + 1}`} value={opt}
                onChange={(e) => {
                  const options = [...form.options];
                  options[i] = e.target.value;
                  setForm({ ...form, options });
                }} required />
            </div>
          ))}
        </div>
      )}

      {form.type === "fill_blank" && (
        <div>
          <label className="text-xs text-mute">Đáp án đúng</label>
          <input className="pxl-input mt-1" value={form.correctText}
            onChange={(e) => setForm({ ...form, correctText: e.target.value })} required />
        </div>
      )}

      {(form.type === "essay" || form.type === "matching") && (
        <div className="text-xs text-mute">Câu {form.type === "essay" ? "tự luận" : "nối câu"} được chấm điểm thủ công ở phần Bài làm.</div>
      )}
    </>
  );
}

export default function PaperDetail() {
  const user = useUser(["admin", "teacher"]);
  const router = useRouter();
  const { id } = router.query;
  const [paper, setPaper] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);

  async function load() {
    try {
      const d = await apiFetch(`/api/questionbank/papers/${id}`);
      setPaper(d.paper);
      setQuestions(d.questions);
    } catch (e) { setError(e.message); }
  }
  useEffect(() => { if (user && id) load(); }, [user, id]);

  async function addQuestion(e) {
    e.preventDefault();
    try {
      await apiFetch(`/api/questionbank/papers/${id}`, {
        method: "POST",
        body: JSON.stringify(buildPayload(form)),
      });
      setForm(emptyForm());
      load();
    } catch (e) { setError(e.message); }
  }

  function startEdit(q) {
    setEditingId(q.id);
    setEditForm({ ...questionToForm(q), _editId: q.id });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(null);
  }

  async function saveEdit(qid) {
    try {
      await apiFetch(`/api/questionbank/questions/${qid}`, {
        method: "PUT",
        body: JSON.stringify(buildPayload(editForm)),
      });
      setEditingId(null);
      setEditForm(null);
      load();
    } catch (e) { setError(e.message); }
  }

  async function removeQuestion(qid) {
    if (!confirm("Xóa câu hỏi này?")) return;
    try { await apiFetch(`/api/questionbank/questions/${qid}`, { method: "DELETE" }); load(); }
    catch (e) { setError(e.message); }
  }

  if (!user || !paper) return user ? <Layout user={user}><div className="text-mute">Đang tải...</div></Layout> : null;

  return (
    <Layout user={user}>
      <div className="flex items-start justify-between gap-4 mb-1">
        <h1 className="text-2xl font-bold">{paper.title}</h1>
        <div className="flex gap-2 shrink-0">
          <button
            className="pxl-btn-outline text-xs px-3 py-1.5"
            disabled={questions.length === 0}
            onClick={() => printReact(`De thi - ${paper.title}`, <ExamPaperDoc paper={paper} questions={questions} />)}
          >
            🖨️ In đề
          </button>
          <button
            className="pxl-btn-outline text-xs px-3 py-1.5"
            disabled={questions.length === 0}
            onClick={() => printReact(`Dap an - ${paper.title}`, <AnswerKeyDoc paper={paper} questions={questions} />)}
          >
            🖨️ In đáp án
          </button>
        </div>
      </div>
      <p className="text-mute mb-6 text-sm">{paper.description}</p>
      {error && <div className="mb-4 text-sm text-danger">{error}</div>}

      <form onSubmit={addQuestion} className="pxl-card p-5 mb-8 space-y-3">
        <QuestionFields form={form} setForm={setForm} />
        <button className="pxl-btn">+ Thêm câu hỏi</button>
      </form>

      <div className="space-y-3">
        {questions.map((q, idx) => {
          const letters = ["A", "B", "C", "D"];

          if (editingId === q.id) {
            return (
              <div key={q.id} className="pxl-card p-5 space-y-3 border border-accent/40">
                <div className="text-xs text-mute">Đang sửa câu {idx + 1}</div>
                <QuestionFields form={editForm} setForm={setEditForm} />
                <div className="flex gap-2">
                  <button className="pxl-btn" onClick={() => saveEdit(q.id)}>Lưu</button>
                  <button className="pxl-btn-outline" onClick={cancelEdit}>Hủy</button>
                </div>
              </div>
            );
          }

          return (
            <div key={q.id} className="pxl-card p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="pxl-badge bg-panel2 text-gray-300">{TYPE_LABEL[q.type]}</span>
                  <span className="pxl-badge bg-panel2 text-gray-300">{q.points} điểm</span>
                </div>
                <div className="flex gap-3 shrink-0">
                  <button className="text-accent text-xs" onClick={() => startEdit(q)}>Sửa</button>
                  <button className="text-danger text-xs" onClick={() => removeQuestion(q.id)}>Xóa</button>
                </div>
              </div>

              <div className="flex gap-2 mb-3">
                <span className="text-sm font-semibold text-mute shrink-0">Câu {idx + 1}.</span>
                <div className="text-sm flex-1 min-w-0">
                  <MarkdownRenderer content={q.content} />
                </div>
              </div>

              {(q.type === "choice2" || q.type === "choice4") && (
                <div className={`grid gap-2 ${q.type === "choice4" ? "md:grid-cols-2" : ""}`}>
                  {(q.data?.options || []).map((o, i) => {
                    const isCorrect = String(i) === String(q.correct_answer?.value);
                    return (
                      <div
                        key={i}
                        className={`flex items-center gap-2 rounded-pixel px-3 py-2 text-sm ${
                          isCorrect ? "bg-accent2/10 border border-accent2/40" : "bg-panel2 border border-transparent"
                        }`}
                      >
                        <span
                          className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                            isCorrect ? "bg-accent2 text-ink" : "bg-line text-gray-300"
                          }`}
                        >
                          {q.type === "choice4" ? letters[i] : isCorrect ? "✓" : ""}
                        </span>
                        <span className={`min-w-0 ${isCorrect ? "text-accent2" : "text-gray-300"}`}>
                          <MarkdownRenderer content={o} inline />
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {q.type === "fill_blank" && (
                <div className="inline-flex items-center gap-2 bg-accent2/10 border border-accent2/40 rounded-pixel px-3 py-1.5 text-sm text-accent2">
                  <span className="text-xs text-mute">Đáp án đúng:</span>
                  <MarkdownRenderer content={q.correct_answer?.value} inline />
                </div>
              )}

              {(q.type === "essay" || q.type === "matching") && (
                <div className="text-xs text-mute">Chấm điểm thủ công khi có bài nộp.</div>
              )}
            </div>
          );
        })}
        {questions.length === 0 && <div className="text-mute text-sm">Chưa có câu hỏi nào.</div>}
      </div>
    </Layout>
  );
}
