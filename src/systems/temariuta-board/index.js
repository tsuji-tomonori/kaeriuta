import { screenRoot, finish, stateOf, displayText } from '../common.js';
import { boardCards, boardCover, boardSolution, boardVerses } from '../../data/temariuta-board.js';

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
export function contradictionFor(number, faceOrKind, kindOrCard, possibleCardId) {
  const face = possibleCardId ? faceOrKind : 'truth';
  const slotKind = possibleCardId ? kindOrCard : faceOrKind;
  const cardId = possibleCardId || kindOrCard;
  return boardVerses[number - 1]?.contradictions?.[face]?.[slotKind]?.[cardId] || genericContradiction;
}
// 配置そのものは仮説を置く操作であり、札と欄の種類が違っても妨げない。
// 正誤と矛盾は判定時に読ませるため、DOM を使わない終端性検査にも使える。
export function placeBoardCard(face, number, slotKind, cardId) {
  return { ...face, [number]: { ...(face[number] || {}), [slotKind]: cardId } };
}
export function boardPlacementNotice(cardId, slotKind) {
  return `${boardCards[cardId].name}を${slots.find(([kind]) => kind === slotKind)[1]}の欄へ置いた。`;
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
  const showCredibility = count(shown, (number, kind) => boardCover[number - 1][kind]);
  const divergence = positions.filter(([number, kind]) => truth[number]?.[kind] && shown[number]?.[kind] && truth[number][kind] !== shown[number][kind]).length;
  const showShiori = positions.filter(([number, kind]) => shown[number]?.[kind] === 'shiori').length;
  return { truthAccuracy, showCredibility, divergence, showShiori, total:positions.length };
}
export function confirmBoardHypothesis(board, faceName, verses) {
  const incomplete = verses.some((verse) => slots.some(([kind]) => !board[verse.number][kind]));
  if (incomplete) return { ends:false, canCommit:false, notice:'まだ空白の欄がある。頁を閉じるなら、盤を伏せて席を立てる。' };
  const answer = faceName === 'truth' ? boardSolution : boardCover;
  const wrong = verses.flatMap((verse) => slots
    .filter(([kind]) => board[verse.number][kind] !== answer[verse.number - 1][kind])
    .map(([kind, label]) => `第${verse.number}番の${label}欄。この仮説には矛盾がある。${contradictionFor(verse.number, faceName, kind, board[verse.number][kind])}`));
  if (wrong.length) return { ends:false, canCommit:true, notice:wrong.join('\n') };
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
  if (score.showShiori) effects.push({ t:'param', key:'awareness', delta:Math.min(24, score.showShiori * 8) });
  if (score.showShiori) effects.push({ t:'param', key:'suspicion', delta:Math.min(18, score.showShiori * 6) });
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
    const { root, stage } = screenRoot(ctx); root.classList.add('ku-board-screen'); let selected = null; let warnedSlot = null; let face = 'show'; let notice = ''; let commitReady = false; let revealedFace = null; let resolved = false; let wrongCount = null;
    const done = (committed = false) => { if (resolved) return; resolved = true; const score = assessBoardHypothesis(faces.truth, faces.show, verses); const effects = boardCompletionEffects(score, args.awarenessThreshold ?? 6, committed); finish(root, resolve, { effects, placed:faceRows(faces.truth, verses).map(rowFromObject), matches:score.truthAccuracy, hypothesis:score }); };
    const render = () => {
      const current = faces[face]; const score = assessBoardHypothesis(faces.truth, faces.show, verses);
      const filledCount = verses.reduce((total, verse) => total + slots.filter(([kind]) => current[verse.number][kind]).length, 0);
      const totalSlots = verses.length * slots.length;
      const tabs = `<div class="board-face-tabs"><button type="button" role="button" data-face="truth" aria-pressed="${face === 'truth'}" class="${face === 'truth' ? 'is-selected' : ''}">まことの盤</button><button type="button" role="button" data-face="show" aria-pressed="${face === 'show'}" class="${face === 'show' ? 'is-selected' : ''}">見せる盤</button></div>`;
      const answer = face === 'truth' ? boardSolution : boardCover;
      const versesMarkup = verses.map((verse) => `<section class="board-verse"><div class="board-verse-head"><b>${verse.number}番</b><span class="board-verse-text">${displayText(verse.text)}</span><small>${displayText(verse.summary)}</small></div><div class="board-verse-slots">${slots.map(([kind, label]) => {
        const value = current[verse.number][kind];
        const correct = revealedFace === face && value && value === answer[verse.number - 1][kind];
        const warned = warnedSlot && warnedSlot.number === verse.number && warnedSlot.kind === kind && warnedSlot.face === face;
        return `<button class="board-slot ${correct ? 'is-correct' : ''} ${warned ? 'is-warned' : ''} ${value ? 'is-filled' : ''}" data-number="${verse.number}" data-kind="${kind}"><span class="board-slot-kind">${label}</span><span class="board-slot-value">${value ? displayText(boardCards[value]?.name, '—') : 'つなぐ'}</span></button>`;
      }).join('')}</div></section>`).join('');
      const convictionDrop = Math.min(20, score.showCredibility * 4);
      const awarenessRise = Math.min(24, score.showShiori * 8);
      const suspicionRise = Math.min(18, score.showShiori * 6);
      stage.innerHTML = `<div class="ku-topbar"><span class="ku-chip">手毬唄ボード</span><span class="ku-title">${face === 'truth' ? '栞だけが綴じる盤。正しく読むほど、知りすぎの余白が増える。' : '悟郎たちへ差し出す盤。表の読みに寄せるほど確信は下がる。栞の名を置けば、その場で疑いを呼ぶ。'}</span><span class="ku-spacer ku-meta">結んだ数 ${filledCount}／${totalSlots} ／ 誤り ${wrongCount ?? '—'}</span><button class="ku-close" aria-label="盤を伏せて席を立つ">×</button></div>
        <div class="board-main ku-scroll">
          ${tabs}
          <p class="board-leave-note">「死者」欄には、事件で死者として扱われた名を置きます。身元の偽装も含めた解釈は「意味」欄で示します。配置中に正解は示されません。「この仮説で確定」で矛盾文を確認し、「盤を置いて席を立つ」で効果が適用されます。</p>
          <div class="board-verses">${versesMarkup}</div>
          ${notice ? `<p class="board-notice">${displayText(notice)}</p>` : ''}
          <p class="board-axis">${commitReady ? `表の読みへの一致：${score.showCredibility}/${score.total}（確信 ${convictionDrop ? `-${convictionDrop}` : '±0'}）　まことの盤の正確さ：${score.truthAccuracy}/${score.total}` : '正確さと確信への効果は「この仮説で確定」の後に表示します。'}　見せる盤の栞の名指し：${score.showShiori}（警戒 +${awarenessRise}／疑惑 +${suspicionRise}）</p>
        </div>
        <div class="ku-thumbzone">
          <div class="ku-hand-label"><span>手札（タップで持ち、欄をタップしてつなぐ）</span></div>
          <div class="ku-hand">${availableCards.map((id) => `<button class="ku-card ${selected === id ? 'is-selected' : ''}" data-card="${id}"><span class="ku-card-name">${displayText(boardCards[id].name)}</span><span class="ku-card-note">${displayText(boardCards[id].note)}</span></button>`).join('')}</div>
          <div class="board-confirm"><button class="ku-secondary" id="done">盤を伏せて席を立つ</button><button class="ku-secondary confirm-hypothesis">この仮説で確定</button>${commitReady ? '<button class="ku-primary board-commit-close">盤を置いて席を立つ</button>' : ''}</div>
        </div>`;
      stage.querySelectorAll('[data-card]').forEach((button) => { button.onclick = () => {
        const cardId = button.dataset.card;
        const deselecting = selected === cardId;
        selected = deselecting ? null : cardId;
        warnedSlot = null; commitReady = false; revealedFace = null; wrongCount = null;
        notice = deselecting ? `${boardCards[cardId].name}を戻した。` : `${boardCards[cardId].name}を手に取った。`;
        render();
      }; });
      stage.querySelectorAll('.board-slot').forEach((button) => { button.onclick = () => { if (!selected) return; const kind = button.dataset.kind; const number = Number(button.dataset.number); const incompatible = !canPlaceBoardCard(selected, kind); const sameWarning = warnedSlot?.cardId === selected && warnedSlot?.number === number && warnedSlot?.kind === kind && warnedSlot?.face === face; if (incompatible && !sameWarning) { warnedSlot = { cardId:selected, number, kind, face }; notice = `${boardCards[selected].name}は${slots.find(([id]) => id === kind)[1]}の欄には置けない読みだ。もう一度この欄を押せば、仮説として配置する。`; render(); return; } faces[face] = placeBoardCard(current, number, kind, selected); commitReady = false; revealedFace = null; wrongCount = null; notice = boardPlacementNotice(selected, kind); selected = null; warnedSlot = null; render(); }; });
      stage.querySelectorAll('[data-face]').forEach((tab) => { const switchFace = () => { face = tab.dataset.face; selected = null; warnedSlot = null; commitReady = false; revealedFace = null; notice = ''; wrongCount = null; render(); }; tab.onclick = switchFace; tab.onkeydown = (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); switchFace(); } }; });
      stage.querySelector('.confirm-hypothesis').onclick = () => { const confirmation = confirmBoardHypothesis(current, face, verses); commitReady = confirmation.canCommit; revealedFace = confirmation.canCommit ? face : null; notice = confirmation.notice; wrongCount = confirmation.canCommit ? (confirmation.notice.match(/^第\d+番の/gm) || []).length : null; render(); };
      const commitClose = stage.querySelector('.board-commit-close'); if (commitClose) commitClose.onclick = () => done(true);
      stage.querySelector('.ku-close').onclick = () => done(false);
      stage.querySelector('#done').onclick = () => done(false);
    };
    render();
  });
} };
