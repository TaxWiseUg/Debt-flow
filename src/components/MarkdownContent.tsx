import React from 'react';

interface MarkdownContentProps {
  content: string;
}

export const MarkdownContent: React.FC<MarkdownContentProps> = ({ content }) => {
  // Parse lines to detect tables, lists, headers, and paragraphs
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // 1. Detect Markdown Table (starts with | and has at least two pipes)
    if (line.trim().startsWith('|') && line.includes('|', 1)) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        // First line is header
        const headerCells = tableLines[0]
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim());

        // Skip divider line (contains ---)
        const dataStartIndex =
          tableLines[1].includes('---') || tableLines[1].includes('-')
            ? 2
            : 1;

        const bodyRows = tableLines.slice(dataStartIndex).map((r) =>
          r
            .split('|')
            .slice(1, -1)
            .map((c) => c.trim())
        );

        elements.push(
          <div
            key={`table-${i}`}
            className="my-2.5 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700/80 bg-white/70 dark:bg-slate-900/60 shadow-xs"
          >
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700/80 bg-slate-100/70 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 font-semibold">
                  {headerCells.map((h, idx) => (
                    <th key={idx} className="px-2.5 py-1.5 whitespace-nowrap">
                      {renderFormattedText(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                {bodyRows.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {row.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        className="px-2.5 py-1.5 whitespace-nowrap font-mono text-[10.5px]"
                      >
                        {renderFormattedText(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // 2. Headings (### or ## or #)
    if (line.startsWith('### ')) {
      elements.push(
        <h4
          key={`h4-${i}`}
          className="font-bold text-xs text-slate-900 dark:text-white mt-2.5 mb-1"
        >
          {renderFormattedText(line.replace('### ', ''))}
        </h4>
      );
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h3
          key={`h3-${i}`}
          className="font-bold text-sm text-slate-900 dark:text-white mt-3 mb-1"
        >
          {renderFormattedText(line.replace('## ', ''))}
        </h3>
      );
      i++;
      continue;
    }
    if (line.startsWith('# ')) {
      elements.push(
        <h2
          key={`h2-${i}`}
          className="font-bold text-base text-slate-900 dark:text-white mt-3 mb-1.5"
        >
          {renderFormattedText(line.replace('# ', ''))}
        </h2>
      );
      i++;
      continue;
    }

    // 3. Bullet list item (- or *)
    if (/^[\*\-]\s+/.test(line.trim())) {
      const itemText = line.trim().replace(/^[\*\-]\s+/, '');
      elements.push(
        <li
          key={`li-${i}`}
          className="flex items-start gap-1.5 text-xs text-slate-700 dark:text-slate-300 ml-1.5 my-0.5"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
          <span className="flex-1">{renderFormattedText(itemText)}</span>
        </li>
      );
      i++;
      continue;
    }

    // 4. Empty lines
    if (!line.trim()) {
      elements.push(<div key={`sp-${i}`} className="h-1" />);
      i++;
      continue;
    }

    // 5. Standard paragraph
    elements.push(
      <p
        key={`p-${i}`}
        className="text-xs leading-relaxed text-slate-800 dark:text-slate-200"
      >
        {renderFormattedText(line)}
      </p>
    );
    i++;
  }

  return <div className="space-y-1">{elements}</div>;
};

// Helper: formats **bold**, `code`, and plain text within a string
function renderFormattedText(text: string): React.ReactNode {
  if (!text) return null;

  // Split bold (**text**)
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong
          key={idx}
          className="font-semibold text-slate-900 dark:text-white"
        >
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={idx}
          className="px-1 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700/80 font-mono text-[10px] text-indigo-600 dark:text-indigo-400"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}
