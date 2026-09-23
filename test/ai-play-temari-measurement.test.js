import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, copyFile, symlink, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { boardCards, boardCover, boardSolution } from '../src/data/temariuta-board.js';
import { assessBoardHypothesis } from '../src/systems/temariuta-board/index.js';
import { temariMeasurement } from '../tools/AIプレイ/lib/観測.js';

const kinds = { dead:'死者', actor:'実行者', meaning:'意味' };
const labels = { confirm:'この仮説で確定', commit:'盤を置いて席を立つ', done:'盤を伏せて席を立つ' };
const rows = (answers, numbers = [1, 2]) => Object.fromEntries(numbers.map(number => [number, { ...answers[number - 1] }]));
const empty = () => ({ 1:{ dead:null, actor:null, meaning:null }, 2:{ dead:null, actor:null, meaning:null } });
const initial = () => ({ 1:{ dead:'onda', actor:null, meaning:'surface' }, 2:{ dead:'sogen', actor:null, meaning:'surface' } });
const decision = (step, selected) => ({ step, action:'part:temariBoard', selected, reason:'テスト用の選択', diagnostic:null });
const outside = step => ({ step, kind:'advance', text:'盤を離れた後の会話', part:null });
const scores = ['showCredibility', 'total', 'truthAccuracy', 'shioriExposure', 'divergence'];
const scoreOf = value => Object.fromEntries(scores.map(key => [key, value[key]]));
function expected(truth, shown, numbers = [1, 2]) {
  const { showShiori, ...score } = assessBoardHypothesis(truth, shown, numbers.map(number => ({ number })));
  return { ...score, shioriExposure:showShiori };
}
function displayed(show, truth, shiori = 0, total = 6) {
  return `表の読みへの一致：${show}/${total}（確信 ±0） まことの盤の正確さ：${truth}/${total} 見せる盤の栞の名指し：${shiori}（警戒 +0／疑惑 +0）`;
}
function observation(step, face, board, axis = '', withMeta = true) {
  const slots = Object.entries(board).flatMap(([number, row]) => Object.entries(kinds).map(([kind, label]) => ({
    number:Number(number), kind, cardId:row[kind] ?? null,
    label:`${label}${boardCards[row[kind]]?.name || 'つなぐ'}`, empty:!row[kind], correct:false,
  })));
  const cards = Object.values(boardCards).map(card => ({ ...card, selected:false }));
  const option = (label, action, extra = {}) => ({ label, meta:{
    cardId:null, face:null, number:null, kind:null, correct:false, selected:false, action, ...extra,
  } });
  const options = [
    option('まことの盤', 'face', { face:'truth' }), option('見せる盤', 'face', { face:'show' }),
    ...slots.map(slot => option(slot.label, 'slot', { number:slot.number, kind:slot.kind })),
    ...cards.map(card => option(card.name + card.note, 'card', { cardId:card.id })),
    option(labels.done, 'done'), option(labels.confirm, 'confirm'),
    ...(axis ? [option(labels.commit, 'commit')] : []),
  ].map((value, index) => ({ index, label:value.label, enabled:true, ...(withMeta ? { meta:value.meta } : {}) }));
  const text = `「この仮説で確定」で確認し、「盤を置いて席を立つ」で効果が適用されます。 ${axis}`;
  return { step, chapter:'第二章', sceneId:'chapter2', kind:'part', text, choices:[],
    part:{ name:'temariBoard', title:'手毬唄ボード', text, options, temari:{ face, slots, cards, notice:null } },
  };
}

test('確定せず done で退席しても3指標は整数で、未観測のまこと面は第二章の初期配置で測る', () => {
  // rememberScreen が保存する options は meta なし。decisions は実ログ同様にラベルを持つ。
  const transcript = [observation(421, 'show', initial(), '', false), outside(422)];
  const decisions = [decision(421, labels.done)];
  const before = JSON.stringify({ transcript, decisions });
  const result = temariMeasurement(transcript, decisions);
  for (const key of ['showCredibility', 'truthAccuracy', 'shioriExposure']) assert.ok(Number.isInteger(result[key]));
  assert.deepEqual(scoreOf(result), expected(initial(), initial()));
  assert.equal(result.truthAccuracy, 2);
  assert.equal(result.committed, false);
  assert.equal(result.confirmed, false);
  assert.equal(result.exit, 'done');
  assert.equal(result.displayed, null);
  assert.equal(result.displayedComparable, false);
  assert.equal(JSON.stringify({ transcript, decisions }), before, '入力を変更しない');
});

test('見せる盤だけを変更して退席しても未観測面には最初の配置を使う', () => {
  const initialTruth = initial();
  const observedShow = rows(boardCover);
  observedShow[1].dead = 'shiori';
  const result = temariMeasurement([
    observation(1, 'show', initialTruth), observation(2, 'show', observedShow), outside(3),
  ], [decision(2, labels.done)]);
  const direct = assessBoardHypothesis(initialTruth, observedShow, [{ number:1 }, { number:2 }]);
  assert.equal(result.truthAccuracy, 2);
  assert.equal(result.truthAccuracy, direct.truthAccuracy);
  assert.deepEqual(scoreOf(result), expected(initialTruth, observedShow));
});

test('まことの盤だけを観測した場合も未観測の見せる盤には最初の配置を使う', () => {
  const result = temariMeasurement([
    observation(1, 'truth', initial()), observation(2, 'truth', rows(boardSolution)), outside(3),
  ], [decision(2, labels.done)]);
  assert.deepEqual(scoreOf(result), expected(rows(boardSolution), initial()));
});

test('両面を往復した場合は各面の最後の配置で本体の採点関数と一致する', () => {
  const truth = rows(boardSolution);
  const shown = rows(boardCover);
  shown[2].actor = 'shiori';
  const transcript = [
    observation(1, 'show', initial()), observation(2, 'truth', empty()),
    observation(3, 'show', shown), observation(4, 'truth', truth), outside(5),
  ];
  const result = temariMeasurement(transcript, [decision(4, labels.done)]);
  assert.deepEqual(scoreOf(result), expected(truth, shown));
  assert.equal(result.shioriExposure, 1);
  assert.equal(result.truthAccuracy, 6);
  assert.equal(result.boards.length, 1);
});

test('最後の面で空になった欄も以前の札を残さず復元する', () => {
  const result = temariMeasurement([
    observation(1, 'truth', rows(boardSolution)), observation(2, 'show', rows(boardCover)),
    observation(3, 'truth', empty()), outside(4),
  ]);
  assert.equal(result.truthAccuracy, 0);
});

test('二度開いた盤は区間ごとに保存し、最後の盤だけが final 相当になる', () => {
  const transcript = [
    observation(1, 'truth', rows(boardSolution)),
    observation(2, 'show', rows(boardCover), displayed(6, 6)),
    { step:3, kind:'part', part:{ name:'freeAction', text:'自由行動', options:[] } },
    observation(4, 'show', initial()), observation(5, 'show', empty()), outside(6),
  ];
  const result = temariMeasurement(transcript, [decision(1, labels.confirm), decision(2, labels.commit), decision(5, labels.done)]);
  assert.equal(result.boards.length, 2);
  assert.equal(result.boards[0].truthAccuracy, 6);
  assert.equal(result.boards[0].committed, true);
  assert.equal(result.boards[0].confirmed, true);
  assert.equal(result.boards[0].exit, 'commit');
  assert.deepEqual(scoreOf(result), expected(initial(), empty()));
  assert.equal(result.truthAccuracy, 2);
  assert.equal(result.displayed, null);
  assert.equal(result.confirmed, false);
  assert.equal(result.committed, false);
  assert.equal(result.exit, 'done');
  const { boards, ...last } = result;
  assert.deepEqual(last, boards.at(-1));
});

test('飛び番と両面に現れる同じ number は重複なしで本体に渡す', () => {
  const truth = rows(boardSolution, [2, 4]);
  const shown = rows(boardCover, [2, 4]);
  const result = temariMeasurement([observation(1, 'truth', truth), observation(2, 'show', shown)]);
  assert.deepEqual(scoreOf(result), expected(truth, shown, [2, 4]));
  assert.equal(result.total, 6);
});

test('確定後に配置を変えず commit した盤は表示値を比較できる', () => {
  const transcript = [
    observation(1, 'truth', rows(boardSolution)), observation(2, 'show', rows(boardCover)),
    observation(3, 'show', rows(boardCover), displayed(6, 6)), outside(4),
  ];
  const result = temariMeasurement(transcript, [decision(2, labels.confirm), decision(3, labels.commit)]);
  assert.deepEqual(result.displayed, { showCredibility:6, truthAccuracy:6, shioriExposure:0 });
  assert.equal(result.displayedComparable, true);
  assert.equal(result.displayedStep, 3);
  assert.equal(result.committed, true);
  assert.equal(result.exit, 'commit');
});

test('表示値が誤っていても計算値を上書きせず、比較対象として保持する', () => {
  const result = temariMeasurement([observation(1, 'show', rows(boardCover), displayed(0, 0))], [decision(1, labels.commit)]);
  assert.equal(result.showCredibility, 6);
  assert.equal(result.displayed.showCredibility, 0);
  assert.equal(result.displayedComparable, true);
});

test('選択ラベルより options の meta.action を優先し、空欄での確定も押下として記録する', () => {
  const entry = observation(1, 'show', empty());
  entry.part.options.find(option => option.meta.action === 'confirm').label = '確認する';
  const result = temariMeasurement([entry, outside(2)], [decision(1, '確認する'), decision(1, labels.done)]);
  assert.equal(result.confirmed, true);
  assert.equal(result.committed, false);
  assert.equal(result.displayed, null);
});

test('最後の表示と同じ step での配置選択も比較不可にする（meta あり・なし）', () => {
  for (const withMeta of [true, false]) {
    const entry = observation(1, 'show', rows(boardCover), displayed(6, 0), withMeta);
    const result = temariMeasurement([entry], [decision(1, entry.part.temari.slots[0].label)]);
    assert.equal(result.displayedComparable, false);
    assert.ok(result.displayed);
  }
});

test('判断ログに残らない自動再試行の配置変更も観測差分で検出する', () => {
  const changed = rows(boardCover);
  changed[1].actor = 'shiori';
  const result = temariMeasurement([
    observation(1, 'show', rows(boardCover), displayed(6, 0)),
    observation(2, 'show', changed), outside(3),
  ], [decision(2, labels.done)]);
  assert.equal(result.displayedComparable, false);
  assert.equal(result.displayed.shioriExposure, 0);
  assert.equal(result.shioriExposure, 1);
});

test('表示後に変更し元へ戻しても、再確定がなければ比較しない', () => {
  const changed = rows(boardCover);
  changed[1].actor = 'shiori';
  const transcript = [
    observation(1, 'show', rows(boardCover), displayed(6, 0)),
    observation(2, 'show', changed), observation(3, 'show', rows(boardCover)), outside(4),
  ];
  assert.equal(temariMeasurement(transcript).displayedComparable, false);
});

test('配置変更後に再確定した最新表示は比較できる', () => {
  const changed = rows(boardCover);
  changed[1].actor = 'shiori';
  const result = temariMeasurement([
    observation(1, 'show', rows(boardCover), displayed(6, 0)), observation(2, 'show', changed),
    observation(3, 'show', changed, displayed(5, 0, 1)), outside(4),
  ], [decision(2, labels.confirm), decision(3, labels.done)]);
  assert.equal(result.displayedComparable, true);
  assert.equal(result.displayedStep, 3);
  assert.equal(result.displayed.shioriExposure, result.shioriExposure);
  assert.equal(result.committed, false);
});

test('面の往復だけなら配置が変わらない限り表示値を比較できる', () => {
  const result = temariMeasurement([
    observation(1, 'truth', rows(boardSolution)), observation(2, 'show', rows(boardCover), displayed(6, 6)),
    observation(3, 'truth', rows(boardSolution)), observation(4, 'show', rows(boardCover)), outside(5),
  ], [decision(2, 'まことの盤'), decision(3, '見せる盤'), decision(4, labels.done)]);
  assert.equal(result.displayedComparable, true);
});

test('盤がない場合は null、退席の記録なしなら消失と観測中を区別する', () => {
  assert.equal(temariMeasurement([outside(1)]), null);
  const entry = observation(1, 'show', empty());
  assert.equal(temariMeasurement([entry]).exit, 'open');
  assert.equal(temariMeasurement([entry, outside(2)]).exit, 'unknown');
  // 他パートの同ラベル・別 step の判断は、この盤の確定や退席の証拠にしない。
  const result = temariMeasurement([entry, outside(2)], [
    { ...decision(1, labels.commit), action:'part:freeAction' }, decision(2, labels.confirm),
  ]);
  assert.equal(result.committed, false);
  assert.equal(result.confirmed, false);
});

test('測定死角検査は全ペルソナのゲーム記録を照合し、欠落・不一致を数え、open だけ理由付きで除外する', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'kaeriuta-temari-check-'));
  try {
    await mkdir(join(dir, 'ログ'));
    await copyFile(new URL('../tools/AIプレイ/測定死角検査.mjs', import.meta.url), join(dir, '測定死角検査.mjs'));
    await symlink(fileURLToPath(new URL('../tools/AIプレイ/総当たり耐性.mjs', import.meta.url)), join(dir, '総当たり耐性.mjs'));
    const endings = { suiri:'b3', bannin:'a3', kanjou:'b1', sokkyou:'a1', ura:'a3', toubou:'a2',
      ayatsuri:'a1', gyakuten:'a4', mikiri:'b3', shoshinsha:'b2', danzai:'b2' };
    const summary = Object.fromEntries(Object.entries(endings).map(([persona, endingId], index) => [persona, {
      status:'ended', errors:[], warnings:[], final:{ endingId,
        flags:{ plan:['other_scriptwriter_noticed'] }, logs:{ temari_board_matches:index ? 2 : 6 },
        temari:{ truthAccuracy:index ? 2 : 6, showCredibility:index ? 2 : 6, shioriExposure:index ? 0 : 1,
          exit:index ? 'done' : 'commit' },
      },
    }]));
    // 固定リスト外も対象。0点は有効で、退席方法不明でも閉じた盤の記録と照合する。
    summary.extra_zero = { final:{ temari:{ truthAccuracy:0, exit:'unknown' }, logs:{ temari_board_matches:0 } } };
    summary.extra_open = { final:{ temari:{ truthAccuracy:2, exit:'open' } } };
    const run = async () => {
      await writeFile(join(dir, 'ログ/サマリ.json'), JSON.stringify(summary));
      return spawnSync(process.execPath, [join(dir, '測定死角検査.mjs')], { encoding:'utf8' });
    };
    const valid = await run();
    assert.ifError(valid.error);
    assert.equal(valid.status, 0, valid.stderr);
    assert.match(valid.stdout, /extra_open: 盤を開いたままでゲームの log が未記録.*照合を省略/);

    summary.missing_logs = { final:{ temari:{ truthAccuracy:2, exit:'done' } } };
    summary.missing_key = { final:{ temari:{ truthAccuracy:2, exit:'commit' }, logs:{} } };
    summary.mismatch = { final:{ temari:{ truthAccuracy:0, exit:'unknown' }, logs:{ temari_board_matches:2 } } };
    summary.wrong_type = { final:{ temari:{ truthAccuracy:2, exit:'done' }, logs:{ temari_board_matches:'2' } } };
    summary.both_missing = { final:{ temari:{ exit:'done' }, logs:{} } };
    const invalid = await run();
    assert.ifError(invalid.error);
    assert.equal(invalid.status, 1, invalid.stderr);
    assert.match(invalid.stderr, /測定死角検査: 不整合 5件/);
    for (const persona of ['missing_logs', 'missing_key', 'mismatch', 'wrong_type', 'both_missing']) {
      assert.ok(invalid.stderr.includes(`${persona}:`), `${persona} を不整合として報告する`);
    }
  } finally {
    await rm(dir, { recursive:true, force:true });
  }
});
