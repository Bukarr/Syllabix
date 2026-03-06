/**
 * Post-processing layer for AI-generated copy notes.
 * Strips markdown and converts to clean structured text for display and PDF export.
 */

/** Remove all markdown formatting symbols and return clean plain text */
export function stripMarkdown(text: string): string {
  if (!text) return '';
  
  let cleaned = text;

  // Remove code blocks
  cleaned = cleaned.replace(/```[\s\S]*?```/g, (match) => {
    return match.replace(/```\w*\n?/g, '').replace(/```/g, '');
  });
  
  // Remove inline code
  cleaned = cleaned.replace(/`([^`]+)`/g, '$1');
  
  // Remove markdown headings but keep the text
  cleaned = cleaned.replace(/^#{1,6}\s+(.+)$/gm, '$1');
  
  // Remove bold/italic markers
  cleaned = cleaned.replace(/\*\*\*(.+?)\*\*\*/g, '$1');
  cleaned = cleaned.replace(/\*\*(.+?)\*\*/g, '$1');
  cleaned = cleaned.replace(/\*(.+?)\*/g, '$1');
  cleaned = cleaned.replace(/___(.+?)___/g, '$1');
  cleaned = cleaned.replace(/__(.+?)__/g, '$1');
  cleaned = cleaned.replace(/_(.+?)_/g, '$1');
  
  // Remove em dashes at line start (list-like)
  cleaned = cleaned.replace(/^—\s*/gm, '');
  
  // Remove bullet symbols (-, •, *, >) at line start
  cleaned = cleaned.replace(/^\s*[-•*>]\s+/gm, '');
  
  // Remove horizontal rules
  cleaned = cleaned.replace(/^[-*_]{3,}\s*$/gm, '');
  
  // Remove link formatting [text](url) → text
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  
  // Remove image formatting
  cleaned = cleaned.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');
  
  // Clean up excessive blank lines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  return cleaned.trim();
}

/** Section types for structured note display */
export interface NoteSection {
  type: 'heading' | 'subheading' | 'paragraph' | 'numbered-list' | 'text';
  content: string;
  items?: string[];
}

/** Parse AI markdown output into structured sections for rich display */
export function parseNoteToSections(text: string): NoteSection[] {
  if (!text) return [];
  
  const lines = text.split('\n');
  const sections: NoteSection[] = [];
  let currentList: string[] = [];
  let currentParagraph: string[] = [];

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      const content = currentParagraph.join('\n').trim();
      if (content) sections.push({ type: 'paragraph', content: stripInlineMarkdown(content) });
      currentParagraph = [];
    }
  };

  const flushList = () => {
    if (currentList.length > 0) {
      sections.push({ type: 'numbered-list', content: '', items: [...currentList] });
      currentList = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    // Main heading (# or ##)
    const h1Match = line.match(/^#{1,2}\s+(.+)$/);
    if (h1Match) {
      flushParagraph();
      flushList();
      sections.push({ type: 'heading', content: stripInlineMarkdown(h1Match[1]) });
      continue;
    }

    // Subheading (### or ####)
    const h2Match = line.match(/^#{3,6}\s+(.+)$/);
    if (h2Match) {
      flushParagraph();
      flushList();
      sections.push({ type: 'subheading', content: stripInlineMarkdown(h2Match[1]) });
      continue;
    }

    // Bold-only line acting as a heading (e.g. **Topic:** or **Introduction**)
    const boldHeading = line.match(/^\*\*([^*]+)\*\*\s*:?\s*$/);
    if (boldHeading) {
      flushParagraph();
      flushList();
      sections.push({ type: 'subheading', content: stripInlineMarkdown(boldHeading[1]).replace(/:$/, '') });
      continue;
    }

    // Numbered list item
    const numberedMatch = line.match(/^\s*(\d+)[.)]\s+(.+)$/);
    if (numberedMatch) {
      flushParagraph();
      currentList.push(stripInlineMarkdown(numberedMatch[2]));
      continue;
    }

    // Bullet list item (treat as numbered)
    const bulletMatch = line.match(/^\s*[-•*>]\s+(.+)$/);
    if (bulletMatch) {
      flushParagraph();
      currentList.push(stripInlineMarkdown(bulletMatch[1]));
      continue;
    }

    // Horizontal rule - skip
    if (/^[-*_]{3,}\s*$/.test(line)) {
      flushParagraph();
      flushList();
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      flushList();
      flushParagraph();
      continue;
    }

    // Regular text
    flushList();
    currentParagraph.push(line);
  }

  flushParagraph();
  flushList();

  return sections;
}

/** Strip inline markdown only (bold, italic, code, links) */
function stripInlineMarkdown(text: string): string {
  let s = text;
  s = s.replace(/`([^`]+)`/g, '$1');
  s = s.replace(/\*\*\*(.+?)\*\*\*/g, '$1');
  s = s.replace(/\*\*(.+?)\*\*/g, '$1');
  s = s.replace(/\*(.+?)\*/g, '$1');
  s = s.replace(/___(.+?)___/g, '$1');
  s = s.replace(/__(.+?)__/g, '$1');
  s = s.replace(/_(.+?)_/g, '$1');
  s = s.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  s = s.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');
  return s;
}

/** Convert structured sections back to clean plain text for clipboard/export */
export function sectionsToPlainText(sections: NoteSection[]): string {
  return sections.map(s => {
    switch (s.type) {
      case 'heading':
        return `${s.content.toUpperCase()}\n`;
      case 'subheading':
        return `${s.content}\n`;
      case 'numbered-list':
        return (s.items || []).map((item, i) => `${i + 1}. ${item}`).join('\n') + '\n';
      case 'paragraph':
      case 'text':
      default:
        return s.content + '\n';
    }
  }).join('\n');
}
