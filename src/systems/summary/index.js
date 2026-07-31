import { modal, finish, stateOf } from '../common.js';
import { flags } from '../../data/flags.js';
import { items } from '../../data/items.js';
import { enrichFreeActions } from '../freeaction/index.js';

const powerWord = { strong: '強い反証になる', medium: '反証の支えになる', weak: '読み替えの糸口になる' };

export function unchosenActions(logValue, actions = []) {
  const chosen = new Set(String(logValue ?? '').split(',').filter(Boolean));
  return actions.filter((action) => !chosen.has(action.id)).map((action) => action.label).filter(Boolean);
}

const watchNames = { suspicion:'疑い', overknow:'知りすぎ', conscience:'良心', trust:'信頼' };

function actionEffects(state, args) {
  const chosen = new Set(String(state.logs?.[args.actionsLogKey] ?? '').split(',').filter(Boolean));
  return enrichFreeActions(args.actions || []).filter((action) => chosen.has(action.id)).flatMap((action) => {
    const focus = action.scenes?.focus?.options?.find((option) => (option.effects || []).some((effect) => effect.t === 'log' && state.logs?.[effect.key] === effect.value));
    return [...(action.risk || []), ...(focus?.effects || [])]
      .filter((effect) => effect.t === 'param')
      .map((effect) => ({ ...effect, cause: action.label }));
  });
}

function routeSummary(state) {
  if (state.logs?.route === 'confession') {
    const trust = (state.flags?.plan || []).includes('other_plan') ? 45 : 8;
    const song = state.logs?.chapter3_final === 'song' ? 10 : 0;
    return {
      route: '告白',
      movement: [`信頼 +${trust + song}（コウ君へ真意を伝えた）`, '良心 ±0（この選択そのものでは動かなかった）'],
      consequence: '第四章ではコウ君との共同推理を開いた。',
    };
  }
  return {
    route: '実行',
    movement: ['信頼 ±0（凶器を取る選択では動かなかった）', '良心 ±0（この選択そのものでは動かなかった）'],
    consequence: '第四章では、自分の反論で推理を崩す道を開いた。',
  };
}

export function watchText(watch = []) {
  return watch.map(({ key, delta, causes }) => `${watchNames[key] ?? key} ${delta >= 0 ? '+' : ''}${delta}（${causes.join('、')}）`).join(' ／ ');
}

export function renderChapterSummary(data) {
  if (data.kind === 'route') return `<section class="chapter-summary"><h2>第三章で選んだ頁</h2><p>${data.route}を選んだ。</p><h2>動いた綴じ目</h2><p>${data.movement.join(' ／ ')}</p><p>${data.consequence}</p><p class="chapter-summary__mono">${data.monologue}</p><button id="done">次の章へ</button></section>`;
  const cards = data.cards.length ? data.cards.map((card) => `<li><b>${card.name}</b> — ${card.use}</li>`).join('') : '<li>この章では新しい札は綴じなかった。</li>';
  const watch = watchText(data.watch);
  const overknow = data.watch.find(({ key }) => key === 'overknow');
  const overknowNote = overknow ? ' 知りすぎた行は、第四章の尋問でコウナンの注視を強める。' : '';
  const unchosen = data.unchosen.length ? `<h2>選ばなかった頁</h2><p>${data.unchosen.join('、')}は、まだ開かなかった頁として残った。</p>` : '';
  return `<section class="chapter-summary"><h2>この章で綴じた札</h2><ul>${cards}</ul><h2>この章で動いた綴じ目</h2><p>${watch || '自由行動では、数えられる綴じ目は動かなかった'}。${overknowNote}</p>${unchosen}<p class="chapter-summary__mono">${data.monologue}</p><button id="done">次の章へ</button></section>`;
}

export function buildChapterSummary(rawState = {}, args = {}) {
  const state = stateOf(rawState); const chapter = args.chapter ?? '';
  if (args.kind === 'route') return { kind:'route', ...routeSummary(state), monologue: args.monologue ?? '' };
  const chapterName = ({ 1:'第一章', 2:'第二章', 3:'第三章', 4:'第四章' })[chapter] ?? `第${chapter}章`;
  const gainedFlags = Object.values(flags).filter((entry) => entry.source?.startsWith(chapterName) && (state.flags?.[entry.line] || []).includes(entry.id));
  const gainedItems = Object.values(items).filter((entry) => entry.source?.startsWith(chapterName) && (state.items || []).includes(entry.id));
  const cards = [...gainedFlags.map((entry) => ({ name: entry.name, use: '後の推理を支える' })), ...gainedItems.map((entry) => ({ name: entry.name, use: powerWord[entry.power] ?? '後で読み返せる' }))];
  const effects = actionEffects(state, args);
  const watch = (args.watch || []).map((key) => {
    const matching = effects.filter((effect) => effect.key === key);
    return { key, delta: matching.reduce((total, effect) => total + Number(effect.delta || 0), 0), causes:[...new Set(matching.map((effect) => effect.cause))] };
  }).filter(({ delta }) => delta !== 0);
  const actions = unchosenActions(state.logs?.[args.actionsLogKey], args.actions);
  return {
    cards,
    watch,
    unchosen: actions,
    watchLine: args.watchLine ?? '読んだ頁は手元に残り、そのぶん視線も濃くなった。',
    monologue: args.monologue ?? '得た頁と失った余白を、私は同じ栞で挟んだ。',
  };
}

export const chapterSummary = {
  start(ctx, args = {}) {
    return new Promise((resolve) => {
      const data = buildChapterSummary(ctx?.state, args); const view = modal(ctx, '章末の帳簿');
      view.main.innerHTML = renderChapterSummary(data);
      const done = () => finish(view.root, resolve, completeChapterSummary());
      view.main.querySelector('#done').onclick = done;
      view.close.onclick = done;
    });
  },
};

// #done と閉じる操作が共有する、章末サマリの唯一の終端遷移。
export function completeChapterSummary() { return { done:true }; }
