import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../../components/Layout";
import QuestionCard, { TYPE_LABEL } from "../../../components/QuestionCard";
import { printReact } from "../../../lib/print";
import { ExamPaperDoc, AnswerKeyDoc } from "../../../components/printDocs";
import { useUser, apiFetch } from "../../../lib/useUser";

function emptyGroupColumns() {
  return [{ name: "", items: [""] }, { name: "", items: [""] }];
}

function emptyForm() {
  return {
    type: "choice4",
    content: "",
    points: 1,
    options: ["", "", "", ""],
    correctIndex: 0,
    correctTexts: [""],
    orderItems: ["", ""],
    groupColumns: emptyGroupColumns(),
  };
}

function questionToForm(q) {
  const isChoice = q.type === "choice2" || q.type === "choice4";
  const legacyValues = Array.isArray(q.correct_answer?.values)
    ? q.correct_answer.values
    : q.correct_answer?.value !== undefined && q.correct_answer?.value !== null
    ? [q.correct_answer.value]
    : [];
  const groupColumns =
    q.type === "grouping" && q.data?.columns?.length
      ? q.data.columns.map((name, idx) => {
          const colItems = (q.data.items || []).filter((it) => it.columnIndex === idx).map((it) => it.text);
          return { name, items: colItems.length ? colItems : [""] };
        })
      : emptyGroupColumns();
  return {
    type: q.type,
    content: q.content,
    points: q.points,
    options: q.type === "choice4" ? (q.data?.options || ["", "", "", ""]) : ["", "", "", ""],
    correctIndex: isChoice ? Number(q.correct_answer?.value || 0) : 0,
    correctTexts: q.type === "fill_blank" ? (legacyValues.length ? legacyValues : [""]) : [""],
    orderItems: q.type === "ordering" ? (q.data?.items?.length ? q.data.items : ["", ""]) : ["", ""],
    groupColumns,
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
    correct_answer = { values: (form.correctTexts || []).map((v) => v.trim()).filter((v) => v !== "") };
  } else if (form.type === "ordering") {
    data = { items: (form.orderItems || []).map((v) => v.trim()).filter((v) => v !== "") };
  } else if (form.type === "grouping") {
    const columns = [];
    const items = [];
    (form.groupColumns || []).forEach((col) => {
      const colName = (col.name || "").trim();
      if (!colName) return;
      const colIdx = columns.length;
      columns.push(colName);
      (col.items || []).forEach((text) => {
        const t = (text || "").trim();
        if (t) items.push({ text: t, columnIndex: colIdx });
      });
    });
    data = { columns, items };
  }
  return { type: form.type, content: form.content, points: Number(form.points) || 0, data, correct_answer };
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
          <label className="text-xs text-mute">Đáp án đúng (có thể thêm nhiều đáp án được chấp nhận)</label>
          <div className="space-y-2 mt-1">
            {form.correctTexts.map((text, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  className="pxl-input"
                  placeholder={i === 0 ? "Đáp án đúng" : `Đáp án đúng khác #${i + 1}`}
                  value={text}
                  onChange={(e) => {
                    const correctTexts = [...form.correctTexts];
                    correctTexts[i] = e.target.value;
                    setForm({ ...form, correctTexts });
                  }}
                  required={i === 0}
                />
                {form.correctTexts.length > 1 && (
                  <button
                    type="button"
                    className="text-danger text-xs shrink-0"
                    onClick={() => setForm({ ...form, correctTexts: form.correctTexts.filter((_, j) => j !== i) })}
                  >
                    Xóa
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            className="pxl-btn-outline text-xs px-2 py-1 mt-2"
            onClick={() => setForm({ ...form, correctTexts: [...form.correctTexts, ""] })}
          >
            + Thêm đáp án đúng khác
          </button>
        </div>
      )}

      {form.type === "ordering" && (
        <div>
          <label className="text-xs text-mute">Các mục theo đúng thứ tự (từ trên xuống dưới)</label>
          <div className="space-y-2 mt-1">
            {form.orderItems.map((text, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-mute w-5 shrink-0">{i + 1}.</span>
                <input
                  className="pxl-input"
                  placeholder={`Mục thứ ${i + 1}`}
                  value={text}
                  onChange={(e) => {
                    const orderItems = [...form.orderItems];
                    orderItems[i] = e.target.value;
                    setForm({ ...form, orderItems });
                  }}
                  required={i < 2}
                />
                <div className="flex flex-col shrink-0">
                  <button type="button" className="text-xs text-mute hover:text-accent leading-none px-1"
                    disabled={i === 0}
                    onClick={() => {
                      const orderItems = [...form.orderItems];
                      [orderItems[i - 1], orderItems[i]] = [orderItems[i], orderItems[i - 1]];
                      setForm({ ...form, orderItems });
                    }}>▲</button>
                  <button type="button" className="text-xs text-mute hover:text-accent leading-none px-1"
                    disabled={i === form.orderItems.length - 1}
                    onClick={() => {
                      const orderItems = [...form.orderItems];
                      [orderItems[i], orderItems[i + 1]] = [orderItems[i + 1], orderItems[i]];
                      setForm({ ...form, orderItems });
                    }}>▼</button>
                </div>
                {form.orderItems.length > 2 && (
                  <button
                    type="button"
                    className="text-danger text-xs shrink-0"
                    onClick={() => setForm({ ...form, orderItems: form.orderItems.filter((_, j) => j !== i) })}
                  >
                    Xóa
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            className="pxl-btn-outline text-xs px-2 py-1 mt-2"
            onClick={() => setForm({ ...form, orderItems: [...form.orderItems, ""] })}
          >
            + Thêm mục
          </button>
          <div className="text-xs text-mute mt-2">Học sinh sẽ thấy các mục này bị xáo trộn và phải kéo/nhấn mũi tên để sắp xếp lại đúng thứ tự trên.</div>
        </div>
      )}

      {form.type === "grouping" && (
        <div>
          <label className="text-xs text-mute">Các cột và đáp án đúng của từng cột</label>
          <div className={`grid gap-3 mt-1 ${form.groupColumns.length > 1 ? "md:grid-cols-2" : ""}`}>
            {form.groupColumns.map((col, colIdx) => (
              <div key={colIdx} className="bg-panel2 rounded-pixel p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    className="pxl-input text-sm font-medium"
                    placeholder={`Tên cột ${colIdx + 1}`}
                    value={col.name}
                    onChange={(e) => {
                      const groupColumns = [...form.groupColumns];
                      groupColumns[colIdx] = { ...col, name: e.target.value };
                      setForm({ ...form, groupColumns });
                    }}
                    required={colIdx < 2}
                  />
                  {form.groupColumns.length > 2 && (
                    <button
                      type="button"
                      className="text-danger text-xs shrink-0"
                      onClick={() => setForm({ ...form, groupColumns: form.groupColumns.filter((_, j) => j !== colIdx) })}
                    >
                      Xóa cột
                    </button>
                  )}
                </div>

                <div className="space-y-1.5 pl-1">
                  {col.items.map((text, itemIdx) => (
                    <div key={itemIdx} className="flex items-center gap-2">
                      <input
                        className="pxl-input text-sm"
                        placeholder={`Đáp án ${itemIdx + 1}`}
                        value={text}
                        onChange={(e) => {
                          const groupColumns = [...form.groupColumns];
                          const items = [...col.items];
                          items[itemIdx] = e.target.value;
                          groupColumns[colIdx] = { ...col, items };
                          setForm({ ...form, groupColumns });
                        }}
                      />
                      {col.items.length > 1 && (
                        <button
                          type="button"
                          className="text-danger text-xs shrink-0"
                          onClick={() => {
                            const groupColumns = [...form.groupColumns];
                            groupColumns[colIdx] = { ...col, items: col.items.filter((_, j) => j !== itemIdx) };
                            setForm({ ...form, groupColumns });
                          }}
                        >
                          Xóa
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    className="pxl-btn-outline text-xs px-2 py-1"
                    onClick={() => {
                      const groupColumns = [...form.groupColumns];
                      groupColumns[colIdx] = { ...col, items: [...col.items, ""] };
                      setForm({ ...form, groupColumns });
                    }}
                  >
                    + Thêm đáp án vào cột này
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="pxl-btn-outline text-xs px-2 py-1 mt-3"
            onClick={() => setForm({ ...form, groupColumns: [...form.groupColumns, { name: "", items: [""] }] })}
          >
            + Thêm cột
          </button>
          <div className="text-xs text-mute mt-2">
            Học sinh sẽ thấy toàn bộ đáp án của các cột gộp chung 1 ô, phải kéo (hoặc chọn từ danh sách) để xếp từng đáp án vào đúng cột.
          </div>
        </div>
      )}

      {(form.type === "essay" || form.type === "matching") && (
        <div className="text-xs text-mute">Câu {form.type === "essay" ? "tự luận" : "nối câu"} được chấm điểm thủ công ở phần Bài làm.</div>
      )}
    </>
  );
}

function QuestionFormWithPreview({ form, setForm, onSubmit, submitLabel, onCancel }) {
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <form onSubmit={onSubmit} className="pxl-card p-5 space-y-3">
        <QuestionFields form={form} setForm={setForm} />
        <div className="flex gap-2">
          <button type="submit" className="pxl-btn">{submitLabel}</button>
          {onCancel && <button type="button" className="pxl-btn-outline" onClick={onCancel}>Hủy</button>}
        </div>
      </form>
      <div className="lg:sticky lg:top-5 self-start">
        <div className="text-xs text-mute mb-2">Xem trước — hiển thị đúng như câu hỏi sau khi lưu</div>
        <QuestionCard q={buildPayload(form)} label="Câu hỏi" />
      </div>
    </div>
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
  const [regradeMsg, setRegradeMsg] = useState("");
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

  async function toggleShowAnswers() {
    try {
      await apiFetch(`/api/questionbank/papers/${id}`, {
        method: "PUT", body: JSON.stringify({ show_answers: !paper.show_answers }),
      });
      load();
    } catch (e) { setError(e.message); }
  }

  async function regradeAll() {
    if (!confirm("Chấm lại TẤT CẢ bài làm (ca thi + luyện tập) đã dùng đề thi này theo đáp án mới nhất? Điểm chấm tay đã lưu sẽ được giữ nguyên.")) return;
    setError("");
    setRegradeMsg("");
    try {
      const d = await apiFetch(`/api/questionbank/papers/${id}/regrade`, { method: "POST" });
      setRegradeMsg(`Đã chấm lại ${d.regraded} bài làm.`);
    } catch (e) { setError(e.message); }
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
          <button
            className="pxl-btn-outline text-xs px-3 py-1.5"
            disabled={questions.length === 0}
            onClick={regradeAll}
          >
            🔄 Chấm lại tất cả bài làm
          </button>
        </div>
      </div>
      <p className="text-mute mb-3 text-sm">{paper.description}</p>
      {regradeMsg && <div className="mb-3 text-sm text-accent2">{regradeMsg}</div>}

      <label className="pxl-card p-4 mb-6 flex items-center gap-3 cursor-pointer w-fit">
        <input type="checkbox" className="w-4 h-4" checked={!!paper.show_answers} onChange={toggleShowAnswers} />
        <div>
          <div className="text-sm font-medium">Học sinh được xem đáp án sau khi nộp bài</div>
          <div className="text-xs text-mute">Áp dụng cho cả luyện tập và ca thi dùng đề này. Tắt để chỉ hiện điểm, không lộ đáp án đúng.</div>
        </div>
      </label>

      {error && <div className="mb-4 text-sm text-danger">{error}</div>}

      <div className="mb-8">
        <QuestionFormWithPreview form={form} setForm={setForm} onSubmit={addQuestion} submitLabel="+ Thêm câu hỏi" />
      </div>

      <div className="space-y-3">
        {questions.map((q, idx) => {
          if (editingId === q.id) {
            return (
              <div key={q.id}>
                <div className="text-xs text-mute mb-2">Đang sửa câu {idx + 1}</div>
                <QuestionFormWithPreview
                  form={editForm}
                  setForm={setEditForm}
                  onSubmit={(e) => { e.preventDefault(); saveEdit(q.id); }}
                  submitLabel="Lưu"
                  onCancel={cancelEdit}
                />
              </div>
            );
          }

          return (
            <QuestionCard
              key={q.id}
              q={q}
              label={`Câu ${idx + 1}.`}
              onEdit={() => startEdit(q)}
              onDelete={() => removeQuestion(q.id)}
            />
          );
        })}
        {questions.length === 0 && <div className="text-mute text-sm">Chưa có câu hỏi nào.</div>}
      </div>
    </Layout>
  );
}
