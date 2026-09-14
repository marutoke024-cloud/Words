import { el } from './dom.js';

/**
 * A speech bubble pinned above the room-mate's head.
 *
 * The bubble follows the mascot as it walks, so the phrase reads as something
 * the dinosaur is saying rather than another panel of UI.
 */
export function createSpeech(root, { onOpen } = {}) {
  const text = el('p', { class: 'speech-text' });
  const inner = el('div', { class: 'speech-inner' }, text);
  const node = el('div', { class: 'speech', hidden: true }, inner);
  root.append(node);

  let anchor = null;
  let raf = 0;
  let hideTimer = 0;
  let phraseId = null;

  inner.onclick = () => {
    if (phraseId) onOpen?.(phraseId);
    hide();
  };

  function place() {
    raf = requestAnimationFrame(place);
    if (!anchor) return;
    const p = anchor();
    if (!p) return;
    const half = node.offsetWidth / 2;
    const x = Math.min(Math.max(p.x, half + 12), window.innerWidth - half - 12);
    const y = Math.max(p.y, 96);
    node.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
    // Keep the tail pointing at the head even when the bubble is nudged inward.
    node.style.setProperty('--tail-x', `${Math.max(-half + 18, Math.min(half - 18, p.x - x))}px`);
    node.classList.toggle('is-hidden-behind', !!p.behind);
  }

  function show(phrase, anchorFn, ms = 7000) {
    anchor = anchorFn;
    phraseId = phrase?.id ?? null;
    text.textContent = phrase ? phrase.text : '…';
    node.hidden = false;
    node.classList.remove('is-in');
    place();
    // Restart the pop each time, even if the bubble was already up.
    inner.style.animation = 'none';
    void inner.offsetWidth;
    inner.style.animation = '';
    requestAnimationFrame(() => node.classList.add('is-in'));
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hide, ms);
  }

  function hide() {
    clearTimeout(hideTimer);
    cancelAnimationFrame(raf);
    raf = 0;
    anchor = null;
    phraseId = null;
    node.classList.remove('is-in');
    setTimeout(() => {
      node.hidden = true;
    }, 260);
  }

  return { show, hide, get isOpen() {
    return !node.hidden;
  } };
}
