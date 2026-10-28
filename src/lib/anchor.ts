// Anchors a highlight to the chapter text. We store the quoted text with a little context and look it up again,
// so highlights survive re-renders (translations toggled, exercise feedback) and small edits to the book.

export interface Anchor {
  start: number;
  end: number;
  quote: string;
  prefix: string;
  suffix: string;
}

export interface TextIndex {
  text: string;
  nodes: { node: Text; start: number }[];
}

const CONTEXT = 40;

export function buildIndex(root: Node): TextIndex {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: TextIndex["nodes"] = [];
  let text = "";
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    nodes.push({ node: n as Text, start: text.length });
    text += n.nodeValue ?? "";
  }
  return { text, nodes };
}

function offsetOf(root: Node, node: Node, offset: number) {
  const r = document.createRange();
  r.selectNodeContents(root);
  r.setEnd(node, offset);
  return r.toString().length;
}

/** Turns a live selection range into an anchor, or null if it is empty. */
export function describe(root: Node, idx: TextIndex, range: Range): Anchor | null {
  let start = offsetOf(root, range.startContainer, range.startOffset);
  let end = offsetOf(root, range.endContainer, range.endOffset);
  while (start < end && /\s/.test(idx.text[start])) start++;
  while (end > start && /\s/.test(idx.text[end - 1])) end--;
  // Like a highlighter pen, never stop in the middle of a word.
  const word = /[\p{L}\p{N}]/u;
  while (start > 0 && word.test(idx.text[start - 1]) && word.test(idx.text[start])) start--;
  while (end < idx.text.length && word.test(idx.text[end]) && word.test(idx.text[end - 1])) end++;
  const quote = idx.text.slice(start, end);
  if (!quote || quote.length > 2000) return null;
  return { start, end, quote, prefix: idx.text.slice(Math.max(0, start - CONTEXT), start), suffix: idx.text.slice(end, end + CONTEXT) };
}

const commonSuffix = (a: string, b: string) => {
  let n = 0;
  while (n < a.length && n < b.length && a[a.length - 1 - n] === b[b.length - 1 - n]) n++;
  return n;
};
const commonPrefix = (a: string, b: string) => {
  let n = 0;
  while (n < a.length && n < b.length && a[n] === b[n]) n++;
  return n;
};

/** Finds the anchor's text again. With repeated quotes, the best matching context wins, then the nearest offset. */
export function resolve(idx: TextIndex, a: Anchor): Range | null {
  let best = -1;
  let bestScore = -1;
  let bestDist = Infinity;
  for (let i = idx.text.indexOf(a.quote); i !== -1; i = idx.text.indexOf(a.quote, i + 1)) {
    const score =
      commonSuffix(idx.text.slice(Math.max(0, i - a.prefix.length), i), a.prefix) +
      commonPrefix(idx.text.slice(i + a.quote.length, i + a.quote.length + a.suffix.length), a.suffix);
    const dist = Math.abs(i - a.start);
    if (score > bestScore || (score === bestScore && dist < bestDist)) [best, bestScore, bestDist] = [i, score, dist];
  }
  if (best < 0) return null;
  const from = idx.nodes.find((n) => best < n.start + n.node.length && best >= n.start);
  const endAt = best + a.quote.length;
  const to = idx.nodes.find((n) => endAt <= n.start + n.node.length && endAt > n.start);
  if (!from || !to) return null;
  const r = document.createRange();
  r.setStart(from.node, best - from.start);
  r.setEnd(to.node, endAt - to.start);
  return r;
}
