// 盤の判定役。ゲーム本体の confirmBoardHypothesis / assessBoardHypothesis をそのまま使う。
// プレイヤー役のエージェントはこのファイルにもゲーム本体にも触れない。
import { boardCards, boardVerses } from '../../src/data/temariuta-board.js';
import { assessBoardHypothesis, canPlaceBoardCard, confirmBoardHypothesis } from '../../src/systems/temariuta-board/index.js';
import { chapter2 } from '../../src/data/scenario/chapter2.js';

const call = chapter2.nodes.find((node) => node.t === 'call' && node.part === 'temariBoard');
export const verses = boardVerses.slice(0, 2);
export const deck = call.args.cards;
export const initialBoard = () => Object.fromEntries(call.args.verses.map((verse) => [
  verse.number, { dead:null, actor:null, meaning:null, ...(verse.slots || {}) },
]));
export const kinds = [['dead', '死者'], ['actor', '実行者'], ['meaning', '意味']];
export const nameOf = (id) => (id ? boardCards[id]?.name || id : '空');

export function judge(board) {
  const confirmation = confirmBoardHypothesis(board, 'truth', verses);
  const score = assessBoardHypothesis(board, {}, verses);
  return { notice:confirmation.notice, canCommit:confirmation.canCommit, truthAccuracy:score.truthAccuracy };
}

export function boardText(board) {
  return verses.map((verse) => `${verse.number}番　` + kinds.map(([kind, label]) => `${label}:${nameOf(board[verse.number][kind])}`).join('　')).join('\n');
}

export function deckText() {
  return deck.map((id) => {
    const card = boardCards[id];
    const allowed = kinds.filter(([kind]) => canPlaceBoardCard(id, kind)).map(([, label]) => label).join('・');
    return `- ${card.name}（置ける欄: ${allowed}）… ${card.note}`;
  }).join('\n');
}

export function versesText() {
  return verses.map((verse) => `【${verse.number}番】\n${verse.text}\n（卓上の要約: ${verse.summary}）`).join('\n\n');
}

// 応答の JSON を盤へ変換する。未知の札名・置けない欄は差し戻す。
export function applyHypothesis(reply) {
  const board = initialBoard();
  const errors = [];
  for (const verse of verses) {
    const row = reply[String(verse.number)] || reply[verse.number] || {};
    for (const [kind, label] of kinds) {
      const wanted = row[label] ?? row[kind];
      if (wanted === undefined || wanted === null || wanted === '') { errors.push(`${verse.number}番の${label}欄が空`); continue; }
      const id = deck.find((cardId) => boardCards[cardId].name === wanted || cardId === wanted)
        || (wanted === '表の読み' ? 'surface' : null);
      if (!id) { errors.push(`${verse.number}番の${label}欄の「${wanted}」は手札にない`); continue; }
      if (!canPlaceBoardCard(id, kind)) { errors.push(`「${wanted}」は${label}の欄には置けない読み`); continue; }
      board[verse.number][kind] = id;
    }
  }
  return { board, errors };
}
