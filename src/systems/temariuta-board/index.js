import { modal, finish, stateOf, displayText } from '../common.js';
import { boardCards, boardSolution, boardVerses } from '../../data/temariuta-board.js';

const slots = [['dead', '死者'], ['actor', '実行者'], ['meaning', '意味']];
const genericContradiction = 'この置き方を裏づける頁が、まだどこにもない。';
const readingCount = (state) => (state.flags?.past?.length || 0) >= 3 ? 3 : (state.flags?.plan?.length || 0) ? 2 : 1;
const rowFromObject = (row = {}) => slots.map(([kind]) => row[kind] ?? null);

// 旧テスト・外部利用者が期待する「配列の配列」の返り値を残す。
export function boardEvaluation(placed) {
  return placed.map((row, index) => {
    const values = Array.isArray(row) ? row : rowFromObject(row);
    const answer = boardSolution[index] || {};
    return values.map((value, slotIndex) => value && value === answer[slots[slotIndex][0]]);
  });
}
export function canPlaceBoardCard(cardId, slotKind) { return boardCards[cardId]?.kinds?.includes(slotKind) ?? false; }
export function contradictionFor(number, slotKind, cardId) { return boardVerses[number - 1]?.contradictions?.[slotKind]?.[cardId] || genericContradiction; }
// 配置そのものは仮説を置く操作であり、札と欄の種類が違っても妨げない。
// 正誤と矛盾は判定時に読ませるため、DOM を使わない終端性検査にも使える。
export function placeBoardCard(face, number, slotKind, cardId) {
  return { ...face, [number]: { ...(face[number] || {}), [slotKind]: cardId } };
}
export function selectBoardVerses(args = {}, state = {}) {
  if (Array.isArray(args.verses)) return args.verses.map((entry) => {
    const verse = boardVerses[entry.number - 1];
    return verse && { ...verse, ...entry, slots:entry.slots ?? verse.slots };
  }).filter(Boolean);
  if (Array.isArray(args.debugVerses)) return args.debugVerses.map((entry, index) => typeof entry === 'number' ? boardVerses[entry - 1] : boardVerses[entry.number - 1] || { number:index + 1, summary:String(entry), text:String(entry), unlock:'表の読み', contradictions:{} }).filter(Boolean);
  return boardVerses.slice(0, readingCount(state) * 2);
}
export function assessBoardHypothesis(truth, shown, verses) {
  const positions = verses.flatMap((verse) => slots.map(([kind]) => [verse.number, kind]));
  const count = (face, expected) => positions.filter(([number, kind]) => face[number]?.[kind] && face[number][kind] === expected(number, kind)).length;
  const truthAccuracy = count(truth, (number, kind) => boardSolution[number - 1][kind]);
  const showCredibility = count(shown, (number, kind) => boardSolution[number - 1][kind]);
  const divergence = positions.filter(([number, kind]) => truth[number]?.[kind] && shown[number]?.[kind] && truth[number][kind] !== shown[number][kind]).length;
  return { truthAccuracy, showCredibility, divergence, total:positions.length };
}
export function confirmBoardHypothesis(board, faceName, verses) {
  const incomplete = verses.some((verse) => slots.some(([kind]) => !board[verse.number][kind]));
  if (incomplete) return { ends:false, canCommit:false, notice:'まだ空白の欄がある。頁を閉じるなら、盤を伏せて席を立てる。' };
  const wrong = verses.flatMap((verse) => slots.map(([kind]) => [verse, kind])).find(([verse, kind]) => board[verse.number][kind] !== boardSolution[verse.number - 1][kind]);
  if (wrong) return { ends:false, canCommit:true, notice:contradictionFor(wrong[0].number, wrong[1], board[wrong[0].number][wrong[1]]) };
  return { ends:false, canCommit:true, notice:faceName === 'truth' ? '金の糸が頁を綴じた。私は真相へ一歩近づき、そのぶん読まれてはいけない余白を増やした。' : '悟郎さんは盤を見て、ひとまず頷いた。差し出した頁が真実かどうかは、まだ私だけが知っている。' };
}

function faceRows(face, verses) { return verses.map((verse) => face[verse.number] ||= { dead:null, actor:null, meaning:null }); }
function initialFace(verses) {
  return Object.fromEntries(verses.map((verse) => [verse.number, { dead:null, actor:null, meaning:null, ...(verse.slots || {}) }]));
}
function cardList(ids) { return ids.filter((id) => boardCards[id]); }
export function boardEffectsFor(score, threshold) {
  const effects = [{ t:'log', key:'temari_board_matches', value:score.truthAccuracy }];
  if (score.showCredibility) effects.push({ t:'param', key:'conviction', delta:-Math.min(20, score.showCredibility * 4) });
  if (score.divergence) effects.push({ t:'param', key:'awareness', delta:Math.min(18, score.divergence * 3) });
  if (score.truthAccuracy >= threshold) effects.push({ t:'param', key:'overknow', delta:1 });
  if (score.truthAccuracy >= threshold) effects.push({ t:'flag', id:'other_scriptwriter_noticed' });
  return effects;
}
export function boardCompletionEffects(score, threshold, committed) {
  return committed ? boardEffectsFor(score, threshold) : [{ t:'log', key:'temari_board_matches', value:score.truthAccuracy }];
}

export const temariBoard = { async start(ctx, args = {}) {
  const state = stateOf(ctx); const verses = selectBoardVerses(args, state);
  const availableCards = cardList(args.cards || [...(state.items || []), ...Object.values(state.flags || {}).flat()]);
  const faces = { truth:initialFace(verses), show:initialFace(verses) }; faceRows(faces.truth, verses); faceRows(faces.show, verses);
  return new Promise((resolve) => {
    const view = modal(ctx, '手毬唄ボード'); let selected = null; let warnedSlot = null; let face = 'show'; let notice = ''; let commitReady = false; let resolved = false;
    const done = (committed = false) => { if (resolved) return; resolved = true; const score = assessBoardHypothesis(faces.truth, faces.show, verses); const effects = boardCompletionEffects(score, args.awarenessThreshold ?? 6, committed); finish(view.root, resolve, { effects, placed:faceRows(faces.truth, verses).map(rowFromObject), matches:score.truthAccuracy, hypothesis:score }); };
    const render = () => {
      const current = faces[face]; const score = assessBoardHypothesis(faces.truth, faces.show, verses);
      const tabs = `<div class="board-face-tabs"><span role="button" tabindex="0" data-face="truth" aria-pressed="${face === 'truth'}" class="${face === 'truth' ? 'is-selected' : ''}">まことの盤</span><span role="button" tabindex="0" data-face="show" aria-pressed="${face === 'show'}" class="${face === 'show' ? 'is-selected' : ''}">見せる盤</span></div>`;
      const board = verses.map((verse) => `<section class="verse"><b>${verse.number}番</b><span class="board-verse-text">${displayText(verse.text)}</span><small>${displayText(verse.summary)}</small>${slots.map(([kind, label]) => { const value = current[verse.number][kind]; const correct = value && value === boardSolution[verse.number - 1][kind]; return `<button class="slot ${correct ? 'correct' : ''}" data-number="${verse.number}" data-kind="${kind}">${label}: ${value ? displayText(boardCards[value]?.name, '—') : '—'}</button>`; }).join('')}</section>`).join('');
      const status = `<p class="board-axis">見せる盤の説得力：${score.showCredibility}/${score.total}　まことの盤とのズレ：${score.divergence}　まことの盤の正確さ：${score.truthAccuracy}/${score.total}</p>`;
      view.main.innerHTML = `${tabs}<p class="board-intro">${face === 'truth' ? '栞だけが綴じる盤。正しく読むほど、知りすぎの余白が増える。' : '悟郎たちへ差し出す盤。納得されれば追及は緩むが、まこととの綴じ目は残る。'}</p><p class="board-leave-note">伏せて席を立つと、この盤は悟郎たちへ差し出されない。</p><div class="board">${board}</div>${notice ? `<p class="board-notice">${displayText(notice)}</p>` : ''}${status}<div class="cards">${availableCards.map((id) => `<button data-card="${id}" class="${selected === id ? 'selected' : ''}"><strong>${displayText(boardCards[id].name)}</strong><small>${displayText(boardCards[id].note)}</small></button>`).join('')}</div><button class="confirm-hypothesis">この仮説で確定</button>${commitReady ? '<button class="board-commit-close">盤を置いて席を立つ</button>' : ''}<button id="done">盤を伏せて席を立つ</button>`;
      view.main.querySelectorAll('[data-card]').forEach((button) => { button.onclick = () => { selected = button.dataset.card; warnedSlot = null; commitReady = false; notice = `${boardCards[selected].name}を手に取った。`; render(); }; });
      view.main.querySelectorAll('.slot').forEach((button) => { button.onclick = () => { if (!selected) return; const kind = button.dataset.kind; const number = Number(button.dataset.number); const incompatible = !canPlaceBoardCard(selected, kind); const sameWarning = warnedSlot?.cardId === selected && warnedSlot?.number === number && warnedSlot?.kind === kind && warnedSlot?.face === face; if (incompatible && !sameWarning) { warnedSlot = { cardId:selected, number, kind, face }; notice = `${boardCards[selected].name}は${slots.find(([id]) => id === kind)[1]}の欄には置けない読みだ。もう一度この欄を押せば、仮説として配置する。`; render(); return; } faces[face] = placeBoardCard(current, number, kind, selected); commitReady = false; notice = incompatible ? `${boardCards[selected].name}を${slots.find(([id]) => id === kind)[1]}の欄へ置いた。この仮説には矛盾がある。${contradictionFor(number, kind, selected)}` : ''; selected = null; warnedSlot = null; render(); }; });
      view.main.querySelectorAll('[data-face]').forEach((tab) => { const switchFace = () => { face = tab.dataset.face; selected = null; warnedSlot = null; commitReady = false; notice = ''; render(); }; tab.onclick = switchFace; tab.onkeydown = (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); switchFace(); } }; });
      view.main.querySelector('.confirm-hypothesis').onclick = () => { const confirmation = confirmBoardHypothesis(current, face, verses); commitReady = confirmation.canCommit; notice = confirmation.notice; render(); };
      const commitClose = view.main.querySelector('.board-commit-close'); if (commitClose) commitClose.onclick = () => done(true);
      view.main.querySelector('#done').onclick = () => done(false);
    };
    view.close.onclick = () => done(false); render();
  });
} };
