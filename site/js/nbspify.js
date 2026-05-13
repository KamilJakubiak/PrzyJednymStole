const SPOJNIKI = /(?<=\s|^)(a|e|i|o|u|w|z|bo|by|co|do|na|ni|po|we|ze|że|aż|ale|ani|bez|czy|jak|już|lub|nie|się|też|zaś|albo|oraz|więc|żeby) /giu;

function nbspify(text) {
  return text.replace(SPOJNIKI, (m, w) => w + ' ');
}

function applyNbspify(root) {
  const SKIP = new Set(['SCRIPT', 'STYLE', 'PRE', 'CODE', 'TEXTAREA', 'INPUT']);
  function walk(node) {
    if (node.nodeType === 3) {
      const v = nbspify(node.nodeValue);
      if (v !== node.nodeValue) node.nodeValue = v;
    } else if (node.nodeType === 1 && !SKIP.has(node.tagName)) {
      node.childNodes.forEach(walk);
    }
  }
  walk(root || document.body);
}


if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => applyNbspify());
} else {
  applyNbspify();
}
