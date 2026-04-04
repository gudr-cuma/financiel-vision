/**
 * htmlToPdfmake.js
 * Convertit le HTML produit par TipTap en contenu pdfmake.
 *
 * Tags supportés : <p>, <strong>, <b>, <em>, <i>, <u>, <s>,
 *                  <span style="font-size:Xpx">, noeuds texte.
 * Retourne null si le HTML est vide / ne contient que des paragraphes vides.
 */

/** Collecte les styles inline d'un noeud DOM vers un objet pdfmake. */
function collectStyle(node, inherited = {}) {
  const s = { ...inherited };
  switch (node.nodeName) {
    case 'STRONG': case 'B': s.bold = true; break;
    case 'EM':     case 'I': s.italics = true; break;
    case 'U': s.decoration = 'underline'; break;
    case 'S': s.decoration = 'lineThrough'; break;
    case 'SPAN': {
      const fs = node.style?.fontSize;
      if (fs) s.fontSize = parseFloat(fs);
      break;
    }
  }
  return s;
}

/** Convertit un noeud inline (texte ou balise inline) en run pdfmake. */
function inlineNode(node, inherited = {}) {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent;
    if (!text) return null;
    return Object.keys(inherited).length ? { text, ...inherited } : text;
  }

  const style = collectStyle(node, inherited);
  const children = [...node.childNodes]
    .map(n => inlineNode(n, style))
    .filter(Boolean);

  if (!children.length) return null;
  // Remonte les enfants en run unique si un seul enfant texte
  if (children.length === 1 && typeof children[0] === 'string' && Object.keys(style).length) {
    return { text: children[0], ...style };
  }
  if (children.length === 1) return children[0];
  return { text: children, ...style };
}

/** Convertit un noeud bloc <p> en entrée pdfmake. */
function blockNode(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    const t = node.textContent?.trim();
    return t ? { text: t, margin: [0, 0, 0, 3] } : null;
  }

  if (node.nodeName !== 'P') return null;

  const children = [...node.childNodes]
    .map(n => inlineNode(n))
    .filter(Boolean);

  if (!children.length) return { text: ' ', margin: [0, 0, 0, 3] };

  return {
    text: children.length === 1 ? children[0] : children,
    margin: [0, 0, 0, 3],
  };
}

/**
 * @param {string} html   - HTML produit par TipTap
 * @param {object} style  - Style pdfmake de base appliqué à chaque paragraphe
 * @returns {object|null} - { stack: [...] } ou null si vide
 */
export function htmlToPdfmake(html, style = { fontSize: 9, color: '#4A5568' }) {
  if (!html) return null;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const blocks = [...doc.body.childNodes]
    .map(blockNode)
    .filter(Boolean)
    .map(block => ({ ...style, ...block }));

  // Contenu vide = seulement des paragraphes blancs
  const hasContent = blocks.some(b => b.text && b.text !== ' ');
  if (!hasContent) return null;

  return blocks.length === 1 ? blocks[0] : { stack: blocks };
}
