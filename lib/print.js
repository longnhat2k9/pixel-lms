import { renderToStaticMarkup } from "react-dom/server";

const PRINT_STYLES = `
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #111; padding: 28px; line-height: 1.5; }
  .doc-title { font-size: 20px; margin: 0 0 4px; font-weight: 700; }
  .doc-meta { color: #555; font-size: 12px; margin-bottom: 22px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
  th, td { border: 1px solid #ccc; padding: 7px 10px; text-align: left; font-size: 13px; vertical-align: top; }
  th { background: #f2f2f2; }
  .question { margin-bottom: 18px; page-break-inside: avoid; }
  .question .stem { font-weight: 600; margin-bottom: 6px; }
  .question .stem .qnum { color: #555; margin-right: 4px; }
  .question .pts { font-weight: 400; color: #888; font-size: 12px; }
  .options { margin-left: 2px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px 18px; }
  .options.single-col { grid-template-columns: 1fr; max-width: 260px; }
  .option { display: flex; gap: 7px; align-items: flex-start; font-size: 13px; margin-bottom: 2px; }
  .option .letter {
    width: 18px; height: 18px; border-radius: 50%; background: #eee; font-size: 11px; font-weight: 700;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid #bbb;
  }
  .blank-line { font-size: 13px; color: #999; margin-top: 2px; }
  .note { font-size: 12px; color: #999; }
  .pxl-markdown p { margin: 0.25em 0; display: inline; }
  .pxl-markdown-inline { display: inline; }
  img { max-width: 100%; }
  .creds-pass { font-family: "SFMono-Regular", Consolas, monospace; font-weight: 700; }
  @media print {
    .no-print { display: none; }
    body { padding: 0; }
  }
`;

// Renders a React element to static HTML and opens it in a new window ready
// to print (includes the KaTeX stylesheet from a CDN so any LaTeX in the
// content still renders correctly on paper).
export function printReact(title, node) {
  const bodyHtml = renderToStaticMarkup(node);
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) {
    alert("Trình duyệt đã chặn cửa sổ in. Vui lòng cho phép popup cho trang này rồi thử lại.");
    return;
  }
  w.document.write(`<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
<style>${PRINT_STYLES}</style>
</head>
<body>
${bodyHtml}
<script>
  window.onload = function () {
    setTimeout(function () { window.print(); }, 300);
  };
</script>
</body>
</html>`);
  w.document.close();
  w.focus();
}
