import { useState } from "react";
import MarkdownRenderer from "./MarkdownRenderer";

// columns: array of column name strings (always visible — the names aren't secret).
// items: array of { id, text } — id is the ORIGINAL item index.
// assignment: { [itemId]: columnIndex | null } — null/absent = still in the pool.
// onChange(nextAssignment): called with the updated assignment object.
// disabled: locks dragging/selecting once submitted/finished.
// showResult: true to color each item green/red against `correctByItem`.
// correctByItem: { [itemId]: correctColumnIndex } — only needed when showResult.
export default function GroupingQuestion({ columns, items, assignment, onChange, disabled, showResult, correctByItem }) {
  const [draggedId, setDraggedId] = useState(null);

  function setColumn(itemId, columnIndex) {
    if (disabled) return;
    onChange({ ...assignment, [itemId]: columnIndex });
  }

  function handleDrop(columnIndex) {
    if (disabled || draggedId === null) return;
    setColumn(draggedId, columnIndex);
    setDraggedId(null);
  }

  function Chip({ item }) {
    const current = assignment[item.id];
    const isCorrect = showResult ? Number(current) === Number(correctByItem[item.id]) : null;
    return (
      <div
        draggable={!disabled}
        onDragStart={() => setDraggedId(item.id)}
        onDragEnd={() => setDraggedId(null)}
        className={`flex items-center gap-2 rounded-pixel px-3 py-2 text-sm select-none ${
          disabled ? "" : "cursor-grab active:cursor-grabbing"
        } ${
          showResult
            ? isCorrect
              ? "bg-accent2/10 border border-accent2/40"
              : "bg-danger/10 border border-danger/40"
            : "bg-panel2 border border-transparent"
        }`}
      >
        {!disabled && <span className="text-mute shrink-0" aria-hidden>⠿</span>}
        <span className="min-w-0 flex-1">
          <MarkdownRenderer content={item.text} inline />
        </span>
        {!disabled && (
          <select
            className="pxl-input py-1 text-xs w-auto shrink-0"
            value={current ?? ""}
            onChange={(e) => setColumn(item.id, e.target.value === "" ? null : Number(e.target.value))}
          >
            <option value="">— Chưa xếp —</option>
            {columns.map((c, i) => (
              <option key={i} value={i}>{c}</option>
            ))}
          </select>
        )}
      </div>
    );
  }

  const pool = items.filter((it) => assignment[it.id] === undefined || assignment[it.id] === null);

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => handleDrop(null)}
        className="border-2 border-dashed border-line rounded-pixel p-3 space-y-2 min-h-[52px]"
      >
        <div className="text-[11px] text-mute uppercase tracking-wide">Chưa xếp</div>
        {pool.length === 0 && <div className="text-xs text-mute italic">— hết —</div>}
        {pool.map((it) => <Chip key={it.id} item={it} />)}
      </div>

      <div className={`grid gap-3 ${columns.length > 1 ? "md:grid-cols-2" : ""}`}>
        {columns.map((colName, colIdx) => {
          const colItems = items.filter((it) => assignment[it.id] === colIdx);
          return (
            <div
              key={colIdx}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(colIdx)}
              className="border border-line rounded-pixel p-3 space-y-2 min-h-[70px] bg-panel"
            >
              <div className="text-xs font-semibold text-accent">
                <MarkdownRenderer content={colName} inline />
              </div>
              {colItems.map((it) => <Chip key={it.id} item={it} />)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
