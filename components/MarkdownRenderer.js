import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

// Shared renderer for every place in Pixel LMS that shows user-authored
// content: lessons, questions/answers, posts. Supports:
//  - Markdown (headings, lists, tables, bold/italic, images ![alt](url), links)
//  - LaTeX math via $inline$ and $$block$$ (rendered with KaTeX)
//
// Pass `inline` for short single-line content (question stems, answer
// options) so paragraphs don't force a block-level line break — the text
// flows naturally next to a number/bullet/letter marker instead of dropping
// to its own line.
export default function MarkdownRenderer({ content, className = "", inline = false }) {
  if (!content) return null;
  const Wrapper = inline ? "span" : "div";
  return (
    <Wrapper className={`pxl-markdown ${inline ? "pxl-markdown-inline" : ""} ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p: inline ? (props) => <>{props.children}</> : (props) => <p {...props} />,
          img: (props) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img {...props} className={inline ? "inline-block h-5 align-text-bottom" : "max-w-full rounded-pixel my-2"} loading="lazy" alt={props.alt || ""} />
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
    </Wrapper>
  );
}
