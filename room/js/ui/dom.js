export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') {
      // Custom properties need setProperty — plain assignment is ignored.
      for (const [prop, val] of Object.entries(v)) {
        if (prop.startsWith('--')) node.style.setProperty(prop, val);
        else node.style[prop] = val;
      }
    }
    else node.setAttribute(k, v === true ? '' : v);
  }
  children.flat().forEach((c) => {
    if (c == null) return;
    node.append(c.nodeType ? c : document.createTextNode(String(c)));
  });
  return node;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

export function haptic(ms = 12) {
  if (navigator.vibrate) navigator.vibrate(ms);
}

/**
 * Renders tokens into `host`, keeping each word glued to the punctuation that
 * follows it so a stray comma never starts a line.
 */
export function renderTokens(host, tokens, makeWord) {
  for (let i = 0; i < tokens.length; i += 1) {
    const tok = tokens[i];
    if (tok.type === 'gap') {
      host.append(document.createTextNode(tok.value));
      continue;
    }
    const next = tokens[i + 1];
    const tail = next && next.type === 'gap' ? next.value.match(/^[^\s]*/)[0] : '';
    const btn = makeWord(tok.value);
    if (tail) {
      const span = document.createElement('span');
      span.className = 'nb';
      span.append(btn, document.createTextNode(tail));
      host.append(span);
      tokens[i + 1] = { type: 'gap', value: next.value.slice(tail.length) };
    } else {
      host.append(btn);
    }
  }
}
