import React from 'react';

/**
 * Lightweight, fast Markdown renderer for problem statements & specs
 * Zero external dependencies. Handles headers, code blocks, lists, bold, inline code.
 */
export default function MarkdownRenderer({ content = '', className = '' }) {
  if (!content) return null;

  const renderBlocks = () => {
    const lines = content.split('\n');
    const elements = [];
    let inCodeBlock = false;
    let codeLang = '';
    let codeBuffer = [];
    let listBuffer = [];
    let listType = null; // 'ul' | 'ol'

    const flushList = (key) => {
      if (listBuffer.length === 0) return;
      if (listType === 'ul') {
        elements.push(
          <ul key={`ul-${key}`} className="list-disc list-inside space-y-1 my-2 text-text/90 text-xs sm:text-sm pl-2">
            {listBuffer.map((item, i) => (
              <li key={i}>{formatInline(item)}</li>
            ))}
          </ul>
        );
      } else {
        elements.push(
          <ol key={`ol-${key}`} className="list-decimal list-inside space-y-1 my-2 text-text/90 text-xs sm:text-sm pl-2">
            {listBuffer.map((item, i) => (
              <li key={i}>{formatInline(item)}</li>
            ))}
          </ol>
        );
      }
      listBuffer = [];
      listType = null;
    };

    lines.forEach((rawLine, index) => {
      const line = rawLine;

      // Code Block Start/End
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          elements.push(
            <div key={`code-${index}`} className="my-2.5 rounded-md border border-border/60 bg-surface-raised overflow-hidden">
              {codeLang && (
                <div className="px-3 py-1 bg-surface-raised border-b border-border/40 text-[10px] font-mono text-text-muted select-none uppercase tracking-wider">
                  {codeLang}
                </div>
              )}
              <pre className="p-3 text-xs font-mono text-text overflow-x-auto whitespace-pre leading-relaxed select-text">
                <code className="select-text">{codeBuffer.join('\n')}</code>
              </pre>
            </div>
          );
          codeBuffer = [];
          inCodeBlock = false;
          codeLang = '';
        } else {
          flushList(index);
          inCodeBlock = true;
          codeLang = line.trim().slice(3).trim();
        }
        return;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        return;
      }

      // Headers
      if (line.startsWith('### ')) {
        flushList(index);
        elements.push(
          <h3 key={index} className="text-sm font-semibold text-text tracking-wide mt-4 mb-2 flex items-center gap-2">
            <span className="w-1 h-3.5 rounded bg-accent-build inline-block" />
            {formatInline(line.slice(4))}
          </h3>
        );
        return;
      }

      if (line.startsWith('## ')) {
        flushList(index);
        elements.push(
          <h2 key={index} className="text-base font-bold text-text tracking-tight mt-5 mb-2 pb-1 border-b border-border/40">
            {formatInline(line.slice(3))}
          </h2>
        );
        return;
      }

      if (line.startsWith('# ')) {
        flushList(index);
        elements.push(
          <h1 key={index} className="text-lg font-extrabold text-text tracking-tight mt-4 mb-3 pb-1 border-b border-border/60">
            {formatInline(line.slice(2))}
          </h1>
        );
        return;
      }

      // Unordered lists (- or *)
      const ulMatch = line.match(/^(\s*)[-*]\s+(.*)$/);
      if (ulMatch) {
        if (listType !== 'ul') flushList(index);
        listType = 'ul';
        listBuffer.push(ulMatch[2]);
        return;
      }

      // Ordered lists (1. 2.)
      const olMatch = line.match(/^(\s*)\d+\.\s+(.*)$/);
      if (olMatch) {
        if (listType !== 'ol') flushList(index);
        listType = 'ol';
        listBuffer.push(olMatch[2]);
        return;
      }

      // Blank line
      if (!line.trim()) {
        flushList(index);
        return;
      }

      // Regular paragraph
      flushList(index);
      elements.push(
        <p key={index} className="text-xs sm:text-sm text-text/90 leading-relaxed my-1.5">
          {formatInline(line)}
        </p>
      );
    });

    flushList(lines.length);
    return elements;
  };

  const formatInline = (text) => {
    // Split by inline code `...`
    const parts = text.split(/(`[^`]+`)/g);

    return parts.map((part, i) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={i} className="px-1.5 py-0.5 rounded bg-surface-raised border border-border/60 text-accent-build font-mono text-[11px] font-medium mx-0.5 select-all">
            {part.slice(1, -1)}
          </code>
        );
      }

      // Bold **text**
      const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
      return boldParts.map((bPart, j) => {
        if (bPart.startsWith('**') && bPart.endsWith('**')) {
          return <strong key={j} className="font-semibold text-text">{bPart.slice(2, -2)}</strong>;
        }
        return bPart;
      });
    });
  };

  return <div className={`prose-workbench ${className}`}>{renderBlocks()}</div>;
}
