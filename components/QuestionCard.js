import MarkdownRenderer from "./MarkdownRenderer";

export const TYPE_LABEL = {
  choice2: "2 lựa chọn (Đúng/Sai)",
  choice4: "4 lựa chọn",
  fill_blank: "Điền khuyết",
  essay: "Tự luận",
  matching: "Nối câu",
};

const LETTERS = ["A", "B", "C", "D"];

export default function QuestionCard({ q, label, onEdit, onDelete }) {
  return (
    <div className="pxl-card p-5">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="pxl-badge bg-panel2 text-gray-300">{TYPE_LABEL[q.type]}</span>
          <span className="pxl-badge bg-panel2 text-gray-300">{q.points || 0} điểm</span>
        </div>
        {(onEdit || onDelete) && (
          <div className="flex gap-3 shrink-0">
            {onEdit && <button className="text-accent text-xs" onClick={onEdit}>Sửa</button>}
            {onDelete && <button className="text-danger text-xs" onClick={onDelete}>Xóa</button>}
          </div>
        )}
      </div>

      <div className="flex gap-2 mb-3">
        <span className="text-sm font-semibold text-mute shrink-0">{label || "Câu hỏi"}</span>
        <div className="text-sm flex-1 min-w-0">
          {q.content ? <MarkdownRenderer content={q.content} /> : <span className="text-mute italic">(chưa có nội dung)</span>}
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
                  {q.type === "choice4" ? LETTERS[i] : isCorrect ? "✓" : ""}
                </span>
                <span className={`min-w-0 ${isCorrect ? "text-accent2" : "text-gray-300"}`}>
                  {o ? <MarkdownRenderer content={o} inline /> : <span className="text-mute italic">(trống)</span>}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {q.type === "fill_blank" && (
        <div className="inline-flex items-center gap-2 bg-accent2/10 border border-accent2/40 rounded-pixel px-3 py-1.5 text-sm text-accent2">
          <span className="text-xs text-mute">Đáp án đúng:</span>
          {q.correct_answer?.value ? <MarkdownRenderer content={q.correct_answer.value} inline /> : <span className="italic">(chưa nhập)</span>}
        </div>
      )}

      {(q.type === "essay" || q.type === "matching") && (
        <div className="text-xs text-mute">Chấm điểm thủ công khi có bài nộp.</div>
      )}
    </div>
  );
}
