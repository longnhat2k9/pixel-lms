import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

// Shared renderer for every place in Pixel LMS that shows user-authored
// content: lessons, questions/answers, posts. Supports:
//  - Markdown (headings, lists, tables, bold/italic, images ![alt](url), links)
//  - LaTeX math via $inline$ and $$block$$ (rendered with KaTeX)
export default function MarkdownRenderer({ content, className = "" }) {
  if (!content) return null;
  return (
    <div className={`pxl-markdown ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          img: (props) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img {...props} className="max-w-full rounded-pixel my-2" loading="lazy" alt={props.alt || ""} />
          ),
          a: (props) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-accent underline" />,
          table: (props) => <table {...props} className="border-collapse w-full text-sm my-2" />,
          th: (props) => <th {...props} className="border border-line px-2 py-1 bg-panel2 text-left" />,
          td: (props) => <td {...props} className="border border-line px-2 py-1" />,
          code: (props) => <code {...props} className="bg-panel2 px-1 py-0.5 rounded text-xs" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
