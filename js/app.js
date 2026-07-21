import * as db from './db.js';
import * as yt from './youtube.js';
import * as srs from './srs.js';
import * as gemini from './gemini.js';

/* ============ Service Worker ============ */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

/* ============ ユーティリティ ============ */
const $ = (sel, root = document) => root.querySelector(sel);
const viewEl = $('#view');

function escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

let toastTimer = null;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2400);
}

// タグ → 淡色バッジ(名前のハッシュで安定した色を割り当てる)
const TAG_PALETTE = [
  ['#EDE4F0', '#6B5478'], // 藤
  ['#E2ECDD', '#4E6B45'], // 若葉
  ['#F0E4DC', '#8A5A3B'], // 香
  ['#DDE8EC', '#3F6470'], // 水浅葱
  ['#F2E8D5', '#7A6430'], // 黄蘗
  ['#F0DEE1', '#8A4A57'], // 桜鼠
  ['#E4E4D8', '#5C6142'], // 利休
  ['#E8E2F2', '#544E7A'], // 菫
];
function tagColor(tag) {
  let h = 0;
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) >>> 0;
  return TAG_PALETTE[h % TAG_PALETTE.length];
}
function tagBadge(tag) {
  const [bg, fg] = tagColor(tag);
  return `<span class="tag-badge" style="background:${bg};color:${fg}">${escapeHtml(tag)}</span>`;
}

function sourceLineHtml(p) {
  if (p.source_type === 'youtube') {
    const url = yt.watchUrl(p.video_url, p.timestamp_seconds);
    const time = p.timestamp_seconds != null ? ` ▸ ${yt.formatTime(p.timestamp_seconds)}` : '';
    return `<a class="p-source" href="${escapeHtml(url)}" target="_blank" rel="noopener">
      ${p.thumbnail_url ? `<img src="${escapeHtml(p.thumbnail_url)}" alt="" loading="lazy">` : ''}
      <span class="s-title">${escapeHtml(p.video_title || 'YouTube')}${time}</span>
    </a>`;
  }
  return `<span class="p-source">✎ ${escapeHtml(p.source_note || '手動メモ')}</span>`;
}

/* ============ 連続日数(ストリーク) ============ */
const ACTIVITY_KEY = 'phrase-stock:activity-days';
function todayStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function markActivity() {
  const days = new Set(JSON.parse(localStorage.getItem(ACTIVITY_KEY) || '[]'));
  days.add(todayStr());
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify([...days].sort().slice(-400)));
}
function getStreak() {
  const days = new Set(JSON.parse(localStorage.getItem(ACTIVITY_KEY) || '[]'));
  let streak = 0;
  const d = new Date();
  if (!days.has(todayStr(d))) d.setDate(d.getDate() - 1); // 今日まだ触っていなくても昨日までの連続は維持
  while (days.has(todayStr(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

/* ============ Web Share Target 受信 ============ */
// manifest.jsonのshare_target(GET)により、YouTubeアプリの共有から
// ?title=...&text=...&url=... 付きで起動される。
let pendingShare = null;
{
  const qs = new URLSearchParams(location.search);
  if (qs.has('text') || qs.has('url') || qs.has('title')) {
    pendingShare = {
      title: qs.get('title') || '',
      text: qs.get('text') || '',
      url: qs.get('url') || '',
    };
    history.replaceState(null, '', location.pathname + '#/capture');
  }
}

/* ============ ルーター ============ */
const routes = {
  home: renderHome,
  gallery: renderGallery,
  capture: renderCapture,
  review: renderReview,
  sort: renderSort,
};

async function route() {
  const name = (location.hash.replace(/^#\//, '') || 'home').split('?')[0];
  const render = routes[name] || renderHome;
  document.body.dataset.route = name;
  document.querySelectorAll('.tabbar a, .desktop-nav a').forEach((a) => {
    a.classList.toggle('active', a.dataset.route === name);
  });
  viewEl.innerHTML = '';
  await render();
  updateBadges();
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);

async function updateBadges() {
  const [due, unsorted] = await Promise.all([db.duePhrases(), db.unsortedPhrases()]);
  document.querySelectorAll('.review-badge').forEach((el) => {
    el.hidden = due.length === 0;
    el.textContent = due.length;
  });
  document.querySelectorAll('.sort-badge').forEach((el) => {
    el.hidden = unsorted.length === 0;
    el.textContent = unsorted.length;
  });
}

/* ============ ホーム ============ */
async function renderHome() {
  const all = await db.allPhrases();
  const due = await db.duePhrases();
  const used = all.filter((p) => p.used_count > 0).length;
  const streak = getStreak();
  const recent = all.slice(0, 3);

  viewEl.innerHTML = `
    <div class="summary-grid">
      <div class="card summary-card"><div class="num">${all.length}</div><div class="label">ストック中</div></div>
      <div class="card summary-card"><div class="num">${used}</div><div class="label">使えた</div></div>
      <div class="card summary-card"><div class="num">${streak}</div><div class="label">連続日数</div></div>
    </div>

    ${due.length > 0 ? `
      <div class="card review-cta">
        <p>今日の復習が <strong>${due.length}件</strong> あります<br><span class="sub">忘れた頃が、使い頃。</span></p>
        <a href="#/review"><button class="accent-btn">はじめる</button></a>
      </div>` : `
      <div class="card review-cta">
        <p>今日の復習はありません<br><span class="sub">気になった言い回しを拾っておきましょう。</span></p>
        <a href="#/capture"><button class="primary-btn">＋ 拾う</button></a>
      </div>`}

    <h2 class="section-title">最近の言の葉</h2>
    <div id="recent-list"></div>
  `;

  const list = $('#recent-list');
  if (recent.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="big">帖</div>まだ何もありません。<br>YouTubeの共有か「＋」から最初の一葉を。</div>`;
  } else {
    list.innerHTML = recent.map((p) => `
      <div class="card recent-item">
        ${escapeHtml(p.text)}
        <div class="meta">${p.source_type === 'youtube' ? escapeHtml(p.video_title || 'YouTube') : escapeHtml(p.source_note || '手動メモ')} ・ ${new Date(p.created_at).toLocaleDateString('ja-JP')}</div>
      </div>`).join('');
  }
}

/* ============ キャプチャ ============ */
async function renderCapture() {
  const fromShare = !!pendingShare;
  let ytInfo = fromShare ? yt.extractYouTubeShare(pendingShare) : null;
  let meta = null;

  viewEl.innerHTML = `
    <form class="capture-form capture-simple" id="capture-form">
      <div class="card video-preview" id="video-preview" hidden>
        <img id="vp-thumb" src="" alt="">
        <div class="v-meta">
          <div class="v-title" id="vp-title"></div>
          <div class="v-channel" id="vp-channel"></div>
          <span class="time-chip" id="vp-time" hidden></span>
        </div>
        <button type="button" class="vp-clear" id="vp-clear" aria-label="出典をはずす">×</button>
      </div>

      <textarea id="phrase-text" class="capture-main" required autofocus
        placeholder="気づいた一言を、そのまま。
YouTubeのURLを貼れば、出典が自動で付きます。"></textarea>

      <input type="text" id="source-note" class="note-inline" placeholder="出典メモ(会議・雑談…)" hidden>

      <div class="capture-bar">
        <button type="button" id="btn-add-note" class="linky">＋ 出典メモ</button>
        <button type="submit" class="primary-btn">拾う</button>
      </div>
    </form>
  `;

  // 動画プレビューの表示/非表示とoEmbed取得
  function applyYtInfo(info) {
    ytInfo = info;
    meta = null;
    const preview = $('#video-preview');
    const noteBtn = $('#btn-add-note');
    const note = $('#source-note');
    if (!info) {
      preview.hidden = true;
      if (noteBtn) noteBtn.hidden = false;
      return;
    }
    preview.hidden = false;
    if (noteBtn) noteBtn.hidden = true; // 出典は動画情報で埋まる
    if (note) note.hidden = true;
    $('#vp-thumb').src = `https://i.ytimg.com/vi/${info.videoId}/hqdefault.jpg`;
    $('#vp-title').textContent = '動画情報を取得中…';
    $('#vp-channel').textContent = '';
    const timeEl = $('#vp-time');
    timeEl.hidden = info.timestampSeconds == null;
    if (info.timestampSeconds != null) timeEl.textContent = `▸ ${yt.formatTime(info.timestampSeconds)}`;

    yt.fetchVideoMeta(info.videoId, info.url).then((m) => {
      if (ytInfo !== info) return; // 取得中にURLが変わっていたら破棄
      meta = m;
      const titleEl = $('#vp-title');
      if (titleEl) {
        titleEl.textContent = m.title || 'YouTube動画';
        $('#vp-channel').textContent = m.channel;
        if (m.thumbnail_url) $('#vp-thumb').src = m.thumbnail_url;
      }
    });
  }

  if (ytInfo) applyYtInfo(ytInfo);

  const textarea = $('#phrase-text');

  // フレーズ欄にYouTube URLを貼ったら、URLを本文から抜き出して出典化する
  textarea.addEventListener('input', () => {
    const m = textarea.value.match(/https?:\/\/[^\s]+/);
    if (!m) return;
    const info = yt.parseYouTubeUrl(m[0]);
    if (!info) return;
    textarea.value = textarea.value.replace(m[0], '').replace(/[ \t]{2,}/g, ' ').replace(/\n{2,}/g, '\n').trim();
    applyYtInfo(info);
  });

  // 出典をはずす
  $('#vp-clear').addEventListener('click', () => applyYtInfo(null));

  // 出典メモは必要な時だけ開く
  $('#btn-add-note').addEventListener('click', () => {
    const note = $('#source-note');
    note.hidden = false;
    $('#btn-add-note').hidden = true;
    note.focus();
  });

  // Enterで即保存(改行はShift+Enter、日本語変換の確定Enterは除外)
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) {
      e.preventDefault();
      $('#capture-form').requestSubmit();
    }
  });

  $('#capture-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = $('#phrase-text').value.trim();
    if (!text) return;

    const phrase = db.newPhrase(
      ytInfo
        ? {
            text,
            source_type: 'youtube',
            video_url: ytInfo.url,
            timestamp_seconds: ytInfo.timestampSeconds,
            video_title: meta?.title || '',
            channel: meta?.channel || '',
            thumbnail_url: meta?.thumbnail_url || `https://i.ytimg.com/vi/${ytInfo.videoId}/hqdefault.jpg`,
          }
        : {
            text,
            source_type: 'manual',
            source_note: ($('#source-note')?.value || '').trim(),
          }
    );
    srs.scheduleInitial(phrase);
    await db.addPhrase(phrase);
    pendingShare = null;
    markActivity();
    toast('一葉、ストックしました');
    location.hash = '#/home';
  });
}

/* ============ ギャラリー(和紙マソンリー) ============ */
let galleryFilter = 'すべて';

async function renderGallery() {
  const all = await db.allPhrases();

  // タグの先頭階層でフィルター候補を作る
  const topTags = [...new Set(all.flatMap((p) => p.tags.map((t) => t.split('/')[0])))].sort();
  const filters = ['すべて', ...topTags, ...(all.some((p) => p.status === '未整理') ? ['未整理'] : [])];
  if (!filters.includes(galleryFilter)) galleryFilter = 'すべて';

  const filtered = all.filter((p) => {
    if (galleryFilter === 'すべて') return true;
    if (galleryFilter === '未整理') return p.status === '未整理';
    return p.tags.some((t) => t === galleryFilter || t.startsWith(galleryFilter + '/'));
  });

  viewEl.innerHTML = `
    <div class="tag-filter" id="tag-filter">
      ${filters.map((f) => `<button class="pill ${f === galleryFilter ? 'active' : ''}" data-f="${escapeHtml(f)}">${escapeHtml(f)}</button>`).join('')}
    </div>
    <div class="masonry" id="masonry"></div>
    ${filtered.length === 0 ? `<div class="empty-state"><div class="big">帖</div>該当する言の葉がありません</div>` : ''}
  `;

  $('#masonry').innerHTML = filtered.map((p) => `
    <div class="card phrase-card" data-id="${p.id}">
      <p class="p-text">${p.status === '未整理' ? '<span class="unsorted-dot" title="未整理"></span>' : ''}${escapeHtml(p.text)}</p>
      ${p.tags.length ? `<div class="p-tags">${p.tags.map(tagBadge).join('')}</div>` : ''}
      ${sourceLineHtml(p)}
      ${p.used_count > 0 ? `<div class="p-used">✓ ${p.used_count}回 使えた</div>` : ''}
    </div>`).join('');

  $('#tag-filter').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-f]');
    if (!btn) return;
    galleryFilter = btn.dataset.f;
    renderGallery();
  });
}

/* ============ 復習(フラッシュカード) ============ */
let reviewKeyHandler = null;

async function renderReview() {
  const queue = await db.duePhrases();
  let index = 0;
  let usedNow = 0;

  // キーボード操作(PC): ←/1=まだ未使用, →/2=使ってみた
  if (reviewKeyHandler) document.removeEventListener('keydown', reviewKeyHandler);
  reviewKeyHandler = (e) => {
    if (e.target.matches('input, textarea')) return;
    if (!document.getElementById('btn-used')) return;
    if (e.key === 'ArrowLeft' || e.key === '1') $('#btn-not-used').click();
    else if (e.key === 'ArrowRight' || e.key === '2') $('#btn-used').click();
  };
  document.addEventListener('keydown', reviewKeyHandler);

  function show() {
    if (index >= queue.length) {
      viewEl.innerHTML = `
        <div class="empty-state">
          <div class="big">〆</div>
          ${queue.length === 0 ? '今日の復習はありません。<br>また明日、忘れた頃に。' : `本日の復習おわり。<br>${usedNow > 0 ? `「使ってみた」${usedNow}件、いい調子です。` : '次は会話で使ってみましょう。'}`}
          <p><a href="#/gallery"><button class="ghost-btn">一覧を眺める</button></a></p>
        </div>`;
      updateBadges();
      return;
    }
    const p = queue[index];
    viewEl.innerHTML = `
      <div class="flash-wrap">
        <div class="flash-progress">${index + 1} / ${queue.length}</div>
        <div class="card flash-card">
          <p class="f-text">${escapeHtml(p.text)}</p>
          <div class="f-source">${sourceLineHtml(p)}</div>
        </div>
        <div class="flash-actions">
          <button class="ghost-btn" id="btn-not-used">まだ未使用</button>
          <button class="accent-btn" id="btn-used">使ってみた</button>
        </div>
        <p class="ai-note kbd-hint">← / 1 : まだ未使用 ・ → / 2 : 使ってみた</p>
      </div>
    `;
    $('#btn-not-used').addEventListener('click', async () => {
      srs.markNotUsedYet(p);
      await db.updatePhrase(p);
      markActivity();
      index++;
      show();
    });
    $('#btn-used').addEventListener('click', async () => {
      srs.markUsed(p);
      await db.updatePhrase(p);
      markActivity();
      usedNow++;
      toast(p.next_review_at == null ? '卒業です。身につきました' : '＋1 使えた');
      index++;
      show();
    });
  }
  show();
}

/* ============ 仕分けタイム ============ */
async function renderSort() {
  const items = await db.unsortedPhrases();

  if (items.length === 0) {
    viewEl.innerHTML = `<div class="empty-state"><div class="big">✎</div>未整理の言の葉はありません。<br>キャプチャに専念できていますね。</div>`;
    return;
  }

  viewEl.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
      <h2 class="section-title" style="margin:0;">仕分けタイム(${items.length}件)</h2>
      <button class="ghost-btn" id="btn-ai-all">まとめてAI提案</button>
    </div>
    <p class="ai-note" style="margin:8px 0 14px;">AIの提案をタップで承認/解除。そのまま「整理済み」へ。</p>
    <div id="sort-list"></div>
  `;

  const listEl = $('#sort-list');
  // itemId → Set(選択中タグ), itemId → 提案タグ配列
  const selected = new Map(items.map((p) => [p.id, new Set(p.tags)]));
  const suggested = new Map(items.map((p) => [p.id, []]));

  function chipRow(p) {
    const sel = selected.get(p.id);
    const tags = [...new Set([...suggested.get(p.id), ...gemini.DEFAULT_TAGS, ...sel])];
    return tags.map((t) => `<button type="button" class="pill ${sel.has(t) ? 'on' : ''}" data-tag="${escapeHtml(t)}">${escapeHtml(t)}</button>`).join('');
  }

  function renderItem(p) {
    const el = listEl.querySelector(`[data-id="${p.id}"]`);
    if (el) el.querySelector('.sort-tags').innerHTML = chipRow(p);
  }

  listEl.innerHTML = items.map((p) => `
    <div class="card sort-item" data-id="${p.id}">
      <p class="s-text">${escapeHtml(p.text)}</p>
      <div class="s-meta">${p.source_type === 'youtube' ? `▶ ${escapeHtml(p.video_title || 'YouTube')}` : `✎ ${escapeHtml(p.source_note || '手動メモ')}`} ・ ${new Date(p.created_at).toLocaleDateString('ja-JP')}</div>
      <div class="sort-tags">${chipRow(p)}</div>
      <div class="sort-actions">
        <button type="button" class="ghost-btn" data-act="ai">AI提案</button>
        <input type="text" class="tag-input" placeholder="＋自由タグ" data-act="custom">
        <span class="grow"></span>
        <button type="button" class="danger-link" data-act="delete">削除</button>
        <button type="button" class="primary-btn" data-act="done" style="padding:9px 16px;font-size:0.85rem;">整理済み</button>
      </div>
    </div>`).join('');

  async function aiSuggest(p, silent = false) {
    try {
      const tags = await gemini.suggestTags(p.text);
      suggested.set(p.id, tags);
      const sel = selected.get(p.id);
      tags.forEach((t) => sel.add(t)); // 提案は自動で選択状態に(タップで解除)
      renderItem(p);
      return true;
    } catch (err) {
      if (err.message === 'NO_API_KEY') {
        if (!silent) {
          toast('設定でGemini APIキーを登録してください');
          openSettings();
        }
      } else if (!silent) {
        toast('AI提案に失敗しました');
        console.error(err);
      }
      return false;
    }
  }

  listEl.addEventListener('click', async (e) => {
    const itemEl = e.target.closest('.sort-item');
    if (!itemEl) return;
    const p = items.find((x) => x.id === itemEl.dataset.id);
    if (!p) return;

    const chip = e.target.closest('[data-tag]');
    if (chip) {
      const sel = selected.get(p.id);
      const t = chip.dataset.tag;
      sel.has(t) ? sel.delete(t) : sel.add(t);
      renderItem(p);
      return;
    }

    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'ai') {
      e.target.disabled = true;
      e.target.textContent = '提案中…';
      await aiSuggest(p);
      e.target.disabled = false;
      e.target.textContent = 'AI提案';
    } else if (act === 'delete') {
      if (confirm('この言の葉を削除しますか?')) {
        await db.deletePhrase(p.id);
        itemEl.remove();
        updateBadges();
      }
    } else if (act === 'done') {
      p.tags = [...selected.get(p.id)];
      p.status = '整理済み';
      await db.updatePhrase(p);
      markActivity();
      itemEl.remove();
      updateBadges();
      toast('整理しました');
      if (!listEl.querySelector('.sort-item')) renderSort();
    }
  });

  listEl.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || !e.target.matches('.tag-input')) return;
    e.preventDefault();
    const itemEl = e.target.closest('.sort-item');
    const p = items.find((x) => x.id === itemEl.dataset.id);
    const t = e.target.value.trim();
    if (p && t) {
      selected.get(p.id).add(t);
      e.target.value = '';
      renderItem(p);
    }
  });

  $('#btn-ai-all').addEventListener('click', async (e) => {
    if (!gemini.getApiKey()) {
      toast('設定でGemini APIキーを登録してください');
      openSettings();
      return;
    }
    e.target.disabled = true;
    for (let i = 0; i < items.length; i++) {
      if (!listEl.querySelector(`[data-id="${items[i].id}"]`)) continue;
      e.target.textContent = `提案中… ${i + 1}/${items.length}`;
      const ok = await aiSuggest(items[i], true);
      if (!ok) break;
    }
    e.target.disabled = false;
    e.target.textContent = 'まとめてAI提案';
  });
}

/* ============ 斜めループビュー ============ */
let flowState = null;

async function openFlow() {
  const all = await db.allPhrases();
  if (all.length === 0) {
    toast('まだ言の葉がありません');
    return;
  }
  closeFlow();

  const overlay = document.createElement('div');
  overlay.className = 'flow-overlay';
  overlay.innerHTML = `
    <button class="flow-close" aria-label="閉じる">×</button>
    <div class="flow-counter"><span class="cur">1</span> / ${all.length}</div>
    <div class="flow-stage"><div class="flow-track"></div></div>
  `;

  const cardHtml = (p) => `
    <div class="flow-card">
      <p class="p-text">${escapeHtml(p.text)}</p>
      <div class="p-meta">${p.source_type === 'youtube' ? `▶ ${escapeHtml(p.video_title || 'YouTube')}` : `✎ ${escapeHtml(p.source_note || '手動メモ')}`}${p.tags.length ? ' ・ ' + p.tags.map(escapeHtml).join(' / ') : ''}</div>
    </div>`;

  const track = overlay.querySelector('.flow-track');
  // ループ用に2周分並べる
  track.innerHTML = all.map(cardHtml).join('') + all.map(cardHtml).join('');
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  const counterCur = overlay.querySelector('.flow-counter .cur');
  const cards = [...track.children];
  const state = {
    overlay,
    offset: 0,
    velocity: 0.6, // 自動でゆっくり流れる
    baseSpeed: 0.6,
    raf: 0,
    halfHeight: 0,
    lastCounterAt: 0,
  };
  flowState = state;

  const measure = () => { state.halfHeight = track.scrollHeight / 2; };
  measure();
  window.addEventListener('resize', measure);
  state.cleanupResize = () => window.removeEventListener('resize', measure);

  // スクロール量(ホイール/ドラッグ) → オフセット。回転ステージ上の
  // translate に変換することで、参考サイトの斜め流れを再現する。
  overlay.addEventListener('wheel', (e) => {
    e.preventDefault();
    state.velocity += e.deltaY * 0.02;
  }, { passive: false });

  let lastY = null;
  overlay.addEventListener('touchstart', (e) => { lastY = e.touches[0].clientY; state.velocity = 0; }, { passive: true });
  overlay.addEventListener('touchmove', (e) => {
    const y = e.touches[0].clientY;
    if (lastY != null) {
      const dy = lastY - y;
      state.offset += dy;
      state.velocity = dy * 0.9;
    }
    lastY = y;
  }, { passive: true });
  overlay.addEventListener('touchend', () => { lastY = null; });

  function updateCounter(now) {
    if (now - state.lastCounterAt < 150) return;
    state.lastCounterAt = now;
    const centerY = window.innerHeight / 2;
    const centerX = window.innerWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < cards.length; i++) {
      const r = cards[i].getBoundingClientRect();
      if (r.bottom < -100 || r.top > window.innerHeight + 100) {
        cards[i].classList.remove('center-near');
        continue;
      }
      const d = Math.hypot((r.top + r.height / 2) - centerY, (r.left + r.width / 2) - centerX);
      if (d < bestDist) { bestDist = d; best = i; }
    }
    cards.forEach((c, i) => c.classList.toggle('center-near', i === best));
    counterCur.textContent = (best % all.length) + 1;
  }

  function frame(now) {
    // 慣性を減衰させつつ、常に基本速度で流し続ける
    state.velocity += (Math.sign(state.baseSpeed) * Math.max(0, Math.abs(state.baseSpeed) - Math.abs(state.velocity)) * 0.04);
    state.velocity *= 0.96;
    if (Math.abs(state.velocity) < 0.15) state.velocity = state.baseSpeed * 0.5;
    state.offset += state.velocity;

    const h = state.halfHeight || 1;
    state.offset = ((state.offset % h) + h) % h;
    track.style.transform = `translate3d(${-state.offset * 0.12}px, ${-state.offset}px, 0)`;
    updateCounter(now);
    state.raf = requestAnimationFrame(frame);
  }
  state.raf = requestAnimationFrame(frame);

  overlay.querySelector('.flow-close').addEventListener('click', closeFlow);

  const onKey = (e) => { if (e.key === 'Escape') closeFlow(); };
  document.addEventListener('keydown', onKey);
  state.cleanupKeys = () => document.removeEventListener('keydown', onKey);
}

function closeFlow() {
  if (!flowState) return;
  cancelAnimationFrame(flowState.raf);
  flowState.cleanupResize?.();
  flowState.cleanupKeys?.();
  flowState.overlay.remove();
  flowState = null;
  document.body.style.overflow = '';
}

$('#btn-flow').addEventListener('click', openFlow);

/* ============ 設定 ============ */
const settingsDialog = $('#settings-dialog');

function openSettings() {
  $('#gemini-key').value = gemini.getApiKey();
  settingsDialog.showModal();
}

$('#btn-settings').addEventListener('click', openSettings);

settingsDialog.addEventListener('close', () => {
  if (settingsDialog.returnValue === 'save') {
    gemini.setApiKey($('#gemini-key').value);
    toast('保存しました');
  }
});

$('#btn-export').addEventListener('click', async () => {
  const data = await db.exportAll();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `phrase-stock-${todayStr()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});

$('#btn-import').addEventListener('click', () => $('#import-file').click());
$('#import-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const count = await db.importAll(data);
    toast(`${count}件を読み込みました`);
    settingsDialog.close();
    route();
  } catch (err) {
    toast('読み込みに失敗しました');
    console.error(err);
  }
  e.target.value = '';
});

/* ============ 起動 ============ */
if (pendingShare && !location.hash) location.hash = '#/capture';
route();
