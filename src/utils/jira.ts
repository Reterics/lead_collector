type ADFText = {
  type: 'text';
  text: string;
  marks?: Array<
    { type: 'strong' } | { type: 'link'; attrs: { href: string } }
  >;
};
type ADFNode =
  | { type: 'paragraph'; content: (ADFText | { type: 'hardBreak' })[] }
  | { type: 'hardBreak' };
type ADFDoc = { version: 1; type: 'doc'; content: ADFNode[] };

/**
 * Convert plain string (lines separated by \n) into Jira ADF.
 * - Groups each question (Q, A, Recording) into a single paragraph
 * - Uses `hardBreak` for line breaks inside the paragraph
 * - Bolds Q/A/Recording labels
 * - Converts Recording URL to clickable link
 */
export function convertStringToADF(input: string): ADFDoc {
  const doc: ADFDoc = { version: 1, type: 'doc', content: [] };
  const lines = input.split('\n');

  // Regexes
  const qaRe = /^(\d+\.)\s*(Q|A):\s*(.*)$/i;
  const recRe = /^(\d+\.)?\s*Recording:\s*(\S+)\s*$/i;

  let currentPara: (ADFText | { type: 'hardBreak' })[] = [];

  const flush = () => {
    if (currentPara.length > 0) {
      doc.content.push({ type: 'paragraph', content: currentPara });
      currentPara = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r/g, '');
    if (!line.trim()) {
      // Empty line -> finish current paragraph
      flush();
      continue;
    }

    // Handle "X.Q:" / "X.A:"
    const qa = line.match(qaRe);
    if (qa) {
      const [, prefix, qaType, rest] = qa;
      if (currentPara.length > 0) currentPara.push({ type: 'hardBreak' });
      currentPara.push(
        { type: 'text', text: `${prefix} ${qaType}: `, marks: [{ type: 'strong' }] },
        { type: 'text', text: rest || '—' },
      );
      continue;
    }

    // Handle "X.Recording: <url>"
    const rec = line.match(recRe);
    if (rec) {
      const [, prefixMaybe, url] = rec;
      const href = url && /^https?:\/\//i.test(url) ? url : '';
      if (currentPara.length > 0) currentPara.push({ type: 'hardBreak' });
      if (href) {
        currentPara.push(
          { type: 'text', text: `${(prefixMaybe || '').trim()}${prefixMaybe ? ' ' : ''}Recording: `, marks: [{ type: 'strong' }] },
          { type: 'text', text: '▶ Play Recording', marks: [{ type: 'link', attrs: { href } }] },
        );
      } else {
        currentPara.push(
          { type: 'text', text: 'Recording: ', marks: [{ type: 'strong' }] },
          { type: 'text', text: 'N/A' },
        );
      }
      continue;
    }

    // Fallback plain line
    if (currentPara.length > 0) currentPara.push({ type: 'hardBreak' });
    currentPara.push({ type: 'text', text: line });
  }

  flush(); // flush last

  return doc;
}
