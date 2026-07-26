import { clearedEndingCount, isEndingCleared, isMemoirUnlocked, loadProgress } from '../engine/progress.js';

const FALLBACK_ENDINGS = [
  { id: 'a1_arrest', sceneId: 'end_a1', code: 'A-1', name: '逮捕', route: 'A', order: 1 },
  { id: 'a2_escape', sceneId: 'end_a2', code: 'A-2', name: '脱出', route: 'A', order: 2 },
  { id: 'a3_puppet', sceneId: 'end_a3', code: 'A-3', name: '操り人形', route: 'A', order: 3 },
  { id: 'a4_reversal', sceneId: 'end_a4', code: 'A-4', name: '逆転', route: 'A', order: 4 },
  { id: 'b1_true', sceneId: 'end_b1', code: 'B-1', name: '真相', route: 'B', order: 5 },
  { id: 'b2_unfinished', sceneId: 'end_b2', code: 'B-2', name: '未完', route: 'B', order: 6 },
  { id: 'b3_silenced', sceneId: 'end_b3', code: 'B-3', name: '口封じ', route: 'B', order: 7 },
];
const endingsModule = await import('../data/endings-meta.js').catch(() => ({}));
const recordsModule = await import('../data/records.js').catch(() => ({}));

function formatDate(epoch) {
  if (!epoch) return '到達日時不明';
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(epoch));
}

export function showGallery(root, { onBack, onReplay } = {}) {
  const progress = loadProgress();
  const endings = [...(endingsModule.endingsMeta ?? FALLBACK_ENDINGS)]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const total = endings.length || 7;
  const count = clearedEndingCount(progress);
  root.innerHTML = `
    <div class="letterbox kaeriuta-menu-frame">
      <section class="kaeriuta-gallery">
        <header class="kaeriuta-gallery__header">
          <div><p class="kaeriuta-menu__eyebrow">回想録</p><h1>回想モード</h1></div>
          <button type="button" data-back>タイトルへ戻る</button>
        </header>
        <p class="kaeriuta-gallery__progress">${total}つの結末のうち ${count} を読み終えた</p>
        ${count === total ? '<p class="kaeriuta-gallery__complete">すべての頁が、いま正しい順序で綴じられた。</p>' : ''}
        <div class="kaeriuta-gallery__scroll">
          <div class="kaeriuta-gallery__endings" data-endings></div>
          <section class="kaeriuta-memoir" data-memoir></section>
        </div>
      </section>
    </div>`;
  root.querySelector('[data-back]').onclick = () => onBack?.();
  const list = root.querySelector('[data-endings]');
  endings.forEach((meta) => {
    const cleared = isEndingCleared(meta.id, progress);
    const entry = progress.endings[meta.id];
    const card = document.createElement('article');
    card.className = `kaeriuta-gallery-card${cleared ? ' is-cleared' : ' is-locked'}`;
    const heading = document.createElement('h2');
    heading.textContent = `${meta.code}　${cleared ? meta.name : '???'}`;
    const summary = document.createElement('p');
    summary.textContent = cleared ? (meta.summary ?? '読み終えた結末。') : 'ロック中';
    card.append(heading, summary);
    if (cleared) {
      const details = document.createElement('p');
      details.className = 'kaeriuta-gallery-card__details';
      details.textContent = `${formatDate(entry.clearedAt)}　／　🕯 ${entry.past ?? 0}`;
      const replay = document.createElement('button');
      replay.type = 'button';
      replay.textContent = 'もう一度読む';
      replay.onclick = () => onReplay?.(meta.sceneId);
      card.append(details, replay);
    } else {
      card.setAttribute('aria-label', `${meta.code} ロック中`);
    }
    list.append(card);
  });

  const memoir = root.querySelector('[data-memoir]');
  const unlocked = isMemoirUnlocked(progress);
  const record = recordsModule.ritsuMemoir;
  if (!unlocked || !record?.pages?.length) {
    memoir.classList.add('is-locked');
    memoir.innerHTML = `
      <span class="kaeriuta-memoir__keyhole" aria-hidden="true"></span>
      <h2>律の手記</h2>
      <p>閉じた頁</p>
      <small>真相に到達し、🕯をすべて集める</small>`;
    return;
  }

  let pageIndex = 0;
  const renderPage = () => {
    const page = record.pages[pageIndex];
    memoir.innerHTML = `
      <p class="kaeriuta-menu__eyebrow">${record.title}</p>
      <h2>${page.heading}</h2>
      <p class="kaeriuta-memoir__body"></p>
      <nav aria-label="手記の頁送り">
        <button type="button" data-prev ${pageIndex === 0 ? 'disabled' : ''}>前の頁</button>
        <span>${pageIndex + 1} / ${record.pages.length}</span>
        <button type="button" data-next ${pageIndex === record.pages.length - 1 ? 'disabled' : ''}>次の頁</button>
      </nav>`;
    memoir.querySelector('.kaeriuta-memoir__body').textContent = page.body;
    memoir.querySelector('[data-prev]').onclick = () => { pageIndex -= 1; renderPage(); };
    memoir.querySelector('[data-next]').onclick = () => { pageIndex += 1; renderPage(); };
  };
  renderPage();
}
