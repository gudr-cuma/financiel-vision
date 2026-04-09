/**
 * htmlToPptxRuns.js — Convertit du HTML Tiptap en tableau de runs pptxgenjs.
 *
 * Gère : <p>, <strong>, <em>, <u>, <ul><li>, <span style="font-size:Xpx">
 *
 * @param {string} html — HTML produit par Tiptap
 * @returns {Array<{ text: string, options: object }>} — runs pour pptxgenjs addText
 */
export function htmlToPptxRuns(html) {
  if (!html || typeof html !== 'string' || html.trim() === '') return [];

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const body = doc.body;

  const runs = [];

  function processNode(node, inheritedOptions = {}) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent;
      if (text) {
        runs.push({ text, options: { ...inheritedOptions } });
      }
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const tagName = node.tagName.toLowerCase();
    const opts = { ...inheritedOptions };

    if (tagName === 'strong' || tagName === 'b') {
      opts.bold = true;
    } else if (tagName === 'em' || tagName === 'i') {
      opts.italic = true;
    } else if (tagName === 'u') {
      opts.underline = true;
    } else if (tagName === 'span') {
      const style = node.getAttribute('style') || '';
      const fontSizeMatch = style.match(/font-size:\s*(\d+(?:\.\d+)?)px/);
      if (fontSizeMatch) {
        opts.fontSize = parseInt(fontSizeMatch[1], 10);
      }
    } else if (tagName === 'br') {
      runs.push({ text: '\n', options: { ...inheritedOptions } });
      return;
    }

    const children = Array.from(node.childNodes);

    if (tagName === 'li') {
      // First text run of each li gets bullet
      let firstTextDone = false;
      for (const child of children) {
        if (!firstTextDone) {
          if (child.nodeType === Node.TEXT_NODE && child.textContent.trim()) {
            runs.push({ text: child.textContent, options: { ...opts, bullet: true } });
            firstTextDone = true;
          } else if (child.nodeType === Node.ELEMENT_NODE) {
            const savedLength = runs.length;
            processNode(child, opts);
            if (runs.length > savedLength) {
              runs[savedLength].options.bullet = true;
              firstTextDone = true;
            }
          }
        } else {
          processNode(child, opts);
        }
      }
      // Add newline after li
      runs.push({ text: '\n', options: {} });
    } else if (tagName === 'p') {
      for (const child of children) {
        processNode(child, opts);
      }
      // Add paragraph break
      runs.push({ text: '\n', options: {} });
    } else if (tagName === 'ul' || tagName === 'ol') {
      for (const child of children) {
        processNode(child, opts);
      }
    } else {
      for (const child of children) {
        processNode(child, opts);
      }
    }
  }

  for (const child of Array.from(body.childNodes)) {
    processNode(child, {});
  }

  // Remove trailing newline runs
  while (runs.length > 0 && runs[runs.length - 1].text === '\n') {
    runs.pop();
  }

  return runs;
}
