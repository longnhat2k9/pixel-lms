import { useState } from "react";
import MarkdownRenderer from "./MarkdownRenderer";

// items: array of { id, text } — id is the ORIGINAL (correct-order) index.
// order: array of ids representing the CURRENT displayed/arranged sequence.
// onChange(newOrder): called with the updated order array.
// disabled: true once submitted/finished — locks dragging and buttons.
// showResult: true to color each position green/red against identity order
// (position i is correct when order[i] === i).
export default function OrderingQuestion({ items, order, onChange, disabled, showResult }) {
  const [dragPos, setDragPos] = useState(null);
  const textById = Object.fromEntries(items.map((it) => [it.id, it.text]));

  function move(from, to) {
    if (disabled || to < 0 || to >= order.length || from === to) return;
    const next = [...order];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  }

  return (
    <div className="space-y-2">
      {order.map((itemId, pos) => {
        const correct = showResult ? itemId === pos : null;
        return (
          <div
            key={itemId}
            draggable={!disabled}
            onDragStart={() => setDragPos(pos)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => { if (dragPos !== null) move(dragPos, pos); setDragPos(null); }}
            onDragEnd={() => setDragPos(null)}
            className={`flex items-center gap-2 rounded-pixel px-3 py-2 text-sm select-none ${
              disabled ? "" : "cursor-grab active:cursor-grabbing"
            } ${
              showResult
                ? correct
                  ? "bg-accent2/10 border border-accent2/40"
                  : "bg-danger/10 border border-danger/40"
                : "bg-panel2 border border-transparent"
            }`}
          >
            <span className="text-mute text-xs w-5 shrink-0">{pos + 1}.</span>
            {!disabled && <span className="text-mute shrink-0" aria-hidden>⠿</span>}
            <span className="min-w-0 flex-1">
              <MarkdownRenderer content={textById[itemId] ?? ""} inline />
            </span>
            {!disabled && (
              <div className="flex flex-col shrink-0 -my-1">
                <button
                  type="button"
                  className="text-xs text-mute hover:text-accent leading-none px-1 py-0.5"
                  disabled={pos === 0}
                  onClick={() => move(pos, pos - 1)}
                  aria-label="Di chuyển lên"
                >
                  ▲
                </button>
                <button
                  type="button"
                  className="text-xs text-mute hover:text-accent leading-none px-1 py-0.5"
                  disabled={pos === order.length - 1}
                  onClick={() => move(pos, pos + 1)}
                  aria-label="Di chuyển xuống"
                >
                  ▼
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
