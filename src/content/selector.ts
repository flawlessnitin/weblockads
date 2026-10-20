function escapeIdentifier(value: string, doc: Document): string {
  const css = doc.defaultView?.CSS;
  if (css?.escape) return css.escape(value);
  return Array.from(value, (char, index) => {
    const code = char.codePointAt(0)!;
    if (code === 0) return '\uFFFD';
    if (code <= 31 || code === 127 || (/\d/.test(char) && (index === 0 || index === 1 && value[0] === '-'))) return `\\${code.toString(16)} `;
    if (char === '-' && value.length === 1) return '\\-';
    return code >= 128 || /[\w-]/.test(char) ? char : `\\${char}`;
  }).join('');
}

export function buildSelector(el: Element): string {
  const doc = el.ownerDocument;
  if (!doc.documentElement.contains(el)) throw new Error('Element must be in its document');
  const unique = (selector: string, node: Element) => {
    const matches = doc.querySelectorAll(selector);
    return matches.length === 1 && matches[0] === node;
  };
  const chain: string[] = [];
  let node: Element | null = el;
  while (node) {
    const tag = escapeIdentifier(node.localName, doc);
    const id = node.id ? `#${escapeIdentifier(node.id, doc)}` : null;
    const classes = [...node.classList].filter((name) => !/\d{4,}|[a-z0-9]{12,}/.test(name));
    const candidate = tag + classes.map((name) => `.${escapeIdentifier(name, doc)}`).join('');
    const anchor = id && unique(id, node) ? id : unique(candidate, node) ? candidate : null;
    if (anchor) return [anchor, ...chain].join(' > ');
    const siblings = [...node.parentElement!.children].filter((sibling) => sibling.localName === node!.localName && sibling.namespaceURI === node!.namespaceURI);
    chain.unshift(`${tag}:nth-of-type(${siblings.indexOf(node) + 1})`);
    node = node.parentElement;
  }
  throw new Error('Could not build a unique selector');
}
