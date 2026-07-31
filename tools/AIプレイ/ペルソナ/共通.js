// ペルソナは特定の選択肢名を探さない。画面上の語群と状況を特徴量にして、
// 表示中の候補すべてを採点する。この語群はシナリオ改稿時にも部分一致で働く。
const WORDS = {
  investigate: ['調', '探', '見', '読', '聞', '覗', '観察', '確認', '証', '記録', '書斎', '部屋', '本', '手掛', '真相'],
  conceal: ['黙', '沈黙', '知ら', '曖昧', '笑', '伏せ', '隠', 'ごまか', '逸ら', 'やり過ご', '答えを遅'],
  prepare: ['準備', '片付', '当番', '厨房', 'カップ', '白湯', 'アリバイ', '計画', '旧道', '逃', '戻', '閉じ'],
  care: ['助', '寄り添', '話', '謝', '告白', '自首', '蘭子', '母', '心', '信', '待', '守'],
  dialogue: ['話', '聞', '答', '任せ', '座', '伝', '問', '返事', '呼'],
  harmful: ['転嫁', '売', '偽', '毒', '殺', '危険', '隠', '逃', '出さない', '黙'],
  safe: ['待', '戻', '任せ', '穏', 'そのまま', '聞き流', '閉じ', '離れない'],
  disruptive: ['転嫁', '出さない', '無視', '拒', '壊', '逃', '隠', '黙', '逆ら', '問い返'],
  direct: ['自首', '告白', '示す', '話す', '答える', '向かう', '入る', '調べる'],
  own: ['自分', '提示', '反証', '暴く'],
  proxy: ['コウナン', '任せ'],
  relic: ['律', '遺した', '遺品', '突きつけ'],
  silence: ['沈黙', '黙', '聞き流', '答えない', '争わない'],
};

function hits(source, words) {
  return words.reduce((count, word) => count + (source.includes(word) ? 1 : 0), 0);
}

function labelBias(label) {
  // 語群に無い改稿後の文言でも、文の長さ・問いかけ・行動性を材料に差を作る。
  return {
    short: Math.max(0, 18 - [...label].length) / 18,
    question: /[？?]/.test(label) ? 1 : 0,
    action: /する|行く|向かう|入る|出す|示す|答える|話す|調べる|聞く/.test(label) ? 1 : 0,
  };
}

function stableFraction(label) {
  let value = 0;
  for (const char of label) value = (value * 31 + char.codePointAt(0)) % 997;
  return value / 997;
}

// 目標ENDを掲げるペルソナは、通常の語群採点を捨てずに、その目標の成立に
// 必須な分岐だけを目的関数として大きく加点する。表示文言の意味で照合し、
// 表示順や固定indexには依存しない。
function requiredRouteScore(profile, label) {
  for (const route of profile.requiredRoutes || []) {
    const matches = route.terms.every((term) => Array.isArray(term)
      ? term.some((word) => label.includes(word))
      : label.includes(term));
    if (matches) return { score: route.weight || 1000, grounds: [`目標${profile.targetEnd}に必要な分岐「${route.name}」を通す`] };
  }
  return { score: 0, grounds: [] };
}

// 特殊パートは通常文より役割が明確なので、表示文言ではなく UI が示す役割を優先する。
// phase は共同推理の P1〜P4 表記だけを利用し、個別の主張文には依存しない。
export function specialPartPolicy(strategy) {
  return ({ option, observation, index }) => {
    const label = option.label || '';
    const phase = Number(label.match(/P([1-4])/i)?.[1] || 0);
    const is = (words) => words.some((word) => label.includes(word));
    let score = 0;
    const grounds = [];
    const add = (value, reason) => { score += value; if (value) grounds.push(reason); };
    if (observation.part?.name === 'jointReasoning') {
      if (strategy === 'deduce') add(phase ? 12 - phase : 6, '共同推理は外堀から順に自分で崩す');
      if (strategy === 'hide') add(is(['コウナン', '任せ']) ? 12 : (phase ? 6 - phase : 0), is(['コウナン', '任せ']) ? '共同推理は代理に任せて関与を薄める' : '共同推理は代理可能な外堀から確認する');
      if (strategy === 'relic') add(is(['律', '遺した', '遺品']) ? 14 : (phase ? 5 - phase : 0), is(['律', '遺した', '遺品']) ? '共同推理は律の遺したものを優先する' : '共同推理は遺品を使える外堀から確かめる');
      if (strategy === 'disrupt') add(phase ? phase * 5 : index * 2, '共同推理は後半から順序を崩す');
    }
    if (observation.part?.name === 'rebuttal') {
      if (strategy === 'deduce') add(is(['反証', '示す']) ? 10 : 0, '反論では根拠を提示する');
      if (strategy === 'hide') add(is(['沈黙', '聞き流', '任せ']) ? 11 : 0, '反論では発言を抑える');
      if (strategy === 'relic') add(is(['話す', '答え', '反証']) ? 7 : 0, '反論でも自分の言葉で応じる');
      if (strategy === 'disrupt') add(is(['沈黙', '転嫁', '問い返']) ? 10 : 0, '反論では安全な反証を外す');
    }
    if (observation.part?.name === 'freeAction') {
      if (strategy === 'deduce') add(is(['手掛かり', '調べ', '探索', '記録']) ? 9 : 0, '自由行動は情報源を選ぶ');
      if (strategy === 'hide') add(is(['準備', '旧道', '戻', '片付']) ? 9 : 0, '自由行動は退路と準備を優先する');
      if (strategy === 'relic') add(is(['話', '助け', '寄り添']) ? 9 : 0, '自由行動は人との関わりを選ぶ');
      if (strategy === 'disrupt') add(is(['危険', '共犯', '無視', '旧道']) ? 8 : 0, '自由行動は不安定な扉を選ぶ');
    }
    if (observation.part?.name === 'temariBoard') {
      if (strategy === 'deduce') add(8 - index / 10, '手毬唄は順に照合する');
      if (strategy === 'hide') add(index / 10, '手毬唄は目立つ断定を避ける');
      if (strategy === 'relic') add(is(['律', '唄', '原稿']) ? 8 : 0, '手毬唄は遺された文脈を重視する');
      if (strategy === 'disrupt') add(index, '手毬唄は整合しない配置を試す');
    }
    return { score, grounds };
  };
}

// 手毬唄は正解表を使わず、画面に出る札の説明・現在の面・選択済み札の種別だけを読む。
function placementKey(face, cardId, number, kind) {
  return `${face}:${cardId}:${number}:${kind}`;
}

export function reconcileTemariAttempt(observation, memory) {
  const pending = memory.temariPending;
  const temari = observation.part?.temari;
  if (!temari) return;
  const verified = new Set(memory.temariVerifiedPlacements || []);
  const failed = new Set(memory.temariFailedPlacements || []);
  const fail = (face, cardId, number, kind) => {
    const key = placementKey(face, cardId, number, kind);
    failed.add(key);
    verified.delete(key);
  };
  if (pending && pending.face === temari.face) {
    const slot = temari.slots?.find((entry) => entry.number === pending.number && entry.kind === pending.kind);
    if (slot?.cardId === pending.cardId) {
      memory.temariPending = null;
    }
  }
  const notice = temari.notice || '';
  const confirmed = notice.includes('この仮説には矛盾がある。')
    || notice.includes('金の糸が頁を綴じた。')
    || notice.includes('悟郎さんは盤を見て、ひとまず頷いた。');
  if (confirmed) {
    const wrongSlots = new Set();
    for (const match of notice.matchAll(/第(\d+)番の(死者|実行者|意味)欄。この仮説には矛盾がある。/g)) {
      const number = Number(match[1]);
      const kind = { 死者:'dead', 実行者:'actor', 意味:'meaning' }[match[2]];
      wrongSlots.add(`${number}:${kind}`);
      const slot = temari.slots?.find((entry) => entry.number === number && entry.kind === kind);
      if (slot?.cardId) fail(temari.face, slot.cardId, number, kind);
    }
    for (const slot of temari.slots || []) {
      if (!slot.cardId || slot.empty || wrongSlots.has(`${slot.number}:${slot.kind}`)) continue;
      const key = placementKey(temari.face, slot.cardId, slot.number, slot.kind);
      verified.add(key);
      failed.delete(key);
    }
  }
  memory.temariFailedPlacements = [...failed];
  memory.temariVerifiedPlacements = [...verified];
}

export function temariPolicy(option, observation, memory, strategy = 'safe') {
  if (observation.part?.name !== 'temariBoard') return { score:0, grounds:[] };
  const meta = option.meta || {}; const temari = observation.part.temari || {};
  const selected = temari.cards?.find((card) => card.selected);
  const card = temari.cards?.find((entry) => entry.id === meta.cardId);
  const slots = temari.slots || [];
  const failed = new Set(memory.temariFailedPlacements || []);
  const verified = new Set(memory.temariVerifiedPlacements || []);
  const unresolved = slots.some((slot) => slot.cardId
    && failed.has(placementKey(temari.face, slot.cardId, slot.number, slot.kind)));
  const add = (score, reason) => ({ score, grounds:score ? [reason] : [] });
  const compatible = selected?.kinds?.includes(meta.kind);
  const clue = `${card?.name || ''} ${card?.note || ''}`;
  if (meta.action === 'face') {
    if (meta.face === temari.face) return add(-100, 'すでに開いている面は切り替えない');
    if (strategy === 'deduce') return add(meta.face === 'truth' ? 60 : -20, '真相をまことの盤に綴じる');
    if (strategy === 'hide') return add(meta.face === 'show' ? 15 : -4, '悟郎へ見せる盤を先に整える');
    if (strategy === 'relic') return add(meta.face === 'truth' ? 9 : 4, '栞の余白と皆へ示す読みを両方残す');
    if (strategy === 'disrupt') return add(meta.face === 'show' ? 7 : 5, '二つの盤を同じ読みへ固定しない');
    if (strategy === 'quick') return add(meta.face === 'show' ? 8 : -3, '初期表示の盤だけを手早く扱う');
    if (strategy === 'ordered') return add(meta.face === 'show' ? 9 : -2, '提示された見せる盤から順に従う');
    if (strategy === 'rush') return add(meta.face === 'truth' ? 7 : 3, '言い切るための盤を選ぶ');
    return add(meta.face === 'show' ? 8 : 0, 'まず説明どおりの見せる盤を読む');
  }
  if (meta.action === 'card') {
    if (strategy === 'deduce') {
      if (meta.selected) {
        const placeable = slots.some((slot) => {
          const currentFailed = slot.cardId && failed.has(placementKey(temari.face, slot.cardId, slot.number, slot.kind));
          const currentVerified = slot.cardId && verified.has(placementKey(temari.face, slot.cardId, slot.number, slot.kind));
          return !currentVerified && (slot.empty || currentFailed)
            && card?.kinds?.includes(slot.kind)
            && !failed.has(placementKey(temari.face, meta.cardId, slot.number, slot.kind));
        });
        return add(placeable ? -100 : 90, placeable ? '置ける未検証の欄があるため札を戻さない' : '置ける未検証の欄がないため札を戻す');
      }
      const untestedSlots = slots.filter((slot) => {
        const currentFailed = slot.cardId && failed.has(placementKey(temari.face, slot.cardId, slot.number, slot.kind));
        const currentVerified = slot.cardId && verified.has(placementKey(temari.face, slot.cardId, slot.number, slot.kind));
        return !currentVerified && (slot.empty || currentFailed)
          && card?.kinds?.includes(slot.kind)
          && !failed.has(placementKey(temari.face, meta.cardId, slot.number, slot.kind));
      });
      return add(untestedSlots.length ? 35 + untestedSlots.length : -60,
        untestedSlots.length ? '空欄と札の注記を照合し、未試行の組合せを試す' : 'この札で試せる未検証の欄は残っていない');
    }
    const used = memory.temariCards || [];
    const tried = new Set(memory.temariTriedPlacements || []);
    const wantsSlot = (slot) => {
      const matchesKind = card?.kinds?.includes(slot.kind);
      return !tried.has(placementKey(temari.face, meta.cardId, slot.number, slot.kind))
        && (strategy === 'disrupt' ? !matchesKind : matchesKind);
    };
    const hasWantedSlot = slots.some(wantsSlot);
    if (meta.selected) {
      return add(hasWantedSlot ? -100 : 20,
        hasWantedSlot ? 'この方針で置きたい欄が残るため札を戻さない' : 'この方針で置きたい欄が残らないため札を戻す');
    }
    if (!hasWantedSlot) {
      return add(-60, strategy === 'disrupt'
        ? '種別を外して置ける未試行欄がないため、この札は選ばない'
        : '種別に合う未試行欄がないため、この札は選ばない');
    }
    let score = used.includes(meta.cardId) ? -5 : 3;
    if (strategy === 'deduce') score += /栞|宗玄|顔|真実|地下/.test(clue) ? 7 : 1;
    if (strategy === 'hide') score += /表|珈琲|恩田|偽り/.test(clue) ? 7 : 0;
    if (strategy === 'relic') score += /栞|宗玄|歌|真実/.test(clue) ? 8 : 1;
    if (strategy === 'disrupt') score += /共犯|偽り|口封じ|すげ替え/.test(clue) ? 8 : 1;
    if (strategy === 'quick' || strategy === 'ordered') score -= option.index / 4;
    if (strategy === 'rush') score += /栞|宗玄|口封じ/.test(clue) ? 6 : 0;
    return add(score, '札の名前と注記から仮説に使う人物・意味を選ぶ');
  }
  if (meta.action === 'slot') {
    if (strategy === 'deduce') {
      const slot = slots.find((entry) => entry.number === meta.number && entry.kind === meta.kind);
      const key = placementKey(temari.face, selected?.id, meta.number, meta.kind);
      const currentFailed = slot?.cardId && failed.has(placementKey(temari.face, slot.cardId, meta.number, meta.kind));
      const currentVerified = slot?.cardId && verified.has(placementKey(temari.face, slot.cardId, meta.number, meta.kind));
      if (currentVerified) return add(-120, '確定で正しいと分かった欄は上書きしない');
      if (!slot?.empty && !currentFailed) return add(-100, '未判定の配置は確定まで上書きしない');
      if (failed.has(key)) return add(-90, '同じ札と欄の不正解配置は繰り返さない');
      if (compatible) return add(55 - (meta.number || 0) / 10, '札の種別に合う空欄へ置き、矛盾文を手掛かりに読む');
      return add(-100, '札の種別と欄が合わないため試さない');
    }
    if (strategy === 'disrupt') return add(compatible ? -5 : 14, compatible ? '整合する欄を避けて矛盾文を読む' : '種別の違う欄へ仮説を置き、矛盾文を引き出す');
    if (compatible) return add(12 - (meta.number || 0) / 10, '札の種別に合う欄へ一度で置く');
    return add(strategy === 'rush' ? 1 : -9, '札の種別と欄が合わないため保留する');
  }
  if (meta.action === 'confirm') {
    if (strategy === 'deduce') {
      const allFilled = slots.length > 0 && slots.every((slot) => !slot.empty);
      if (unresolved) return add(-120, '確定で判明した矛盾を差し替えるまで再確定しない');
      return add(allFilled ? 100 : -80, allFilled ? '全欄を埋めて矛盾を解消したため確定する' : '空欄が残るため確定を待つ');
    }
    return add(strategy === 'quick' ? -4 : strategy === 'disrupt' ? -2 : strategy === 'hide' ? 12 : 7, '盤を差し出して結果と効果を引き受ける');
  }
  if (meta.action === 'commit') {
    if (strategy === 'deduce' && unresolved) return add(-160, '確定で残った矛盾を差し替えるまでコミットしない');
    return add(160, strategy === 'deduce' ? '矛盾のない確定結果を盤へ反映して退席する' : '確定した盤の効果を受け取り、従来どおり退席する');
  }
  if (meta.action === 'done') {
    if (strategy === 'quick' || strategy === 'ordered') {
      const triedCard = (memory.temariCards || []).length > 0;
      return add(triedCard ? 30 : -6, triedCard ? '一枚だけ試したところで盤を伏せ、会話へ戻る' : 'まだ札を一枚も試していない');
    }
    return add(strategy === 'disrupt' ? 9 : strategy === 'hide' ? 1 : strategy === 'rush' ? 4 : -6, '効果を使わず盤を伏せて退く');
  }
  return { score:0, grounds:[] };
}

function temariStrategy(profile) {
  if (profile.temariStrategy) return profile.temariStrategy;
  const reason = profile.reason || '';
  if (profile.targetEnd === 'A-4 逆転' || /情報と証拠/.test(reason)) return 'deduce';
  if (/疑惑と知りすぎ|旧道と退路/.test(reason)) return 'hide';
  if (/栞と周囲/.test(reason)) return 'relic';
  if (/手間が少なく/.test(reason)) return 'quick';
  if (/安全な正解を外し|断罪して/.test(reason)) return 'disrupt';
  if (/与えられた計画/.test(reason)) return 'ordered';
  if (/物証を待たず/.test(reason)) return 'rush';
  return 'safe';
}

function optionScore(option, observation, memory, profile, index) {
  const label = option.label || '';
  const context = `${observation.text || ''} ${observation.part?.text || ''} ${observation.chapter || ''}`;
  const labels = Object.fromEntries(Object.entries(WORDS).map(([key, words]) => [key, hits(label, words)]));
  const scene = Object.fromEntries(Object.entries(WORDS).map(([key, words]) => [key, hits(context, words)]));
  const bias = labelBias(label);
  const params = observation.params || {};
  let score = 10 + stableFraction(label) / 100 + index / 1000; // 全候補を常に正の非同点にする決定性。
  const grounds = [];
  for (const [feature, weight] of Object.entries(profile.weights)) {
    const value = labels[feature] || 0;
    if (!value) continue;
    score += value * weight;
    grounds.push(`${profile.labels[feature] || feature}${weight >= 0 ? 'を含む' : 'を避ける'}`);
  }
  for (const [feature, weight] of Object.entries(profile.contextWeights || {})) {
    if (!(scene[feature] && labels[feature])) continue;
    score += weight;
    grounds.push(`本文の${profile.labels[feature] || feature}に応じる`);
  }
  if (profile.shortWeight) {
    score += bias.short * profile.shortWeight;
    if (bias.short > 0.35) grounds.push('短く読みやすい');
  }
  if (profile.detailWeight) {
    const detail = Math.min([...label].length / 20, 1);
    score += detail * profile.detailWeight;
    grounds.push(profile.detailReason || '文言の具体性を手掛かりにする');
  }
  if (profile.actionWeight) score += bias.action * profile.actionWeight;
  if (profile.questionWeight) score += bias.question * profile.questionWeight;
  if (profile.indexWeight) score += index * profile.indexWeight;
  if (profile.specificityWeight) {
    // 語群に掛からない台詞でも、固有名詞・対象語を多く含む文言を「具体的」と読む。
    // 正負は各ペルソナの、具体化を好む／避けるという明示的な補助基準である。
    const specificity = new Set([...label].filter((char) => /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(char))).size;
    score += specificity * profile.specificityWeight;
    grounds.push(profile.specificityReason || '文言の具体性を補助基準にする');
  }
  if (profile.indexReason && profile.indexWeight) grounds.push(profile.indexReason);
  const route = requiredRouteScore(profile, label);
  score += route.score;
  grounds.push(...route.grounds);
  if (profile.adjust) {
    const adjustment = profile.adjust({ option, observation, memory, labels, scene, bias });
    score += adjustment.score || 0;
    grounds.push(...(adjustment.grounds || []));
  }
  // 手毬唄ボードは面・札・欄・確定という固有の操作を temariPolicy が評価する。
  // 通常の特殊パート向けindex補正を重ねると、先頭札の反復が固有方針を上書きする。
  if (profile.partAdjust && observation.kind === 'part' && observation.part?.name !== 'temariBoard') {
    const adjustment = profile.partAdjust({ option, observation, memory, labels, scene, bias, index }) || {};
    score += adjustment.score || 0;
    grounds.push(...(adjustment.grounds || []));
  }
  if (observation.kind === 'part') {
    const adjustment = temariPolicy(option, observation, memory, temariStrategy(profile));
    score += adjustment.score || 0;
    grounds.push(...(adjustment.grounds || []));
  }
  // 同じ語群の候補にも、既に選んだ行動の繰り返しを抑えることで方針の一貫性を作る。
  if (memory.lastLabel === label) score -= 1.5;
  return { option, score, grounds: [...new Set(grounds)] };
}

export function decideByScore(observation, memory, profile) {
  reconcileTemariAttempt(observation, memory);
  const isPart = observation.kind === 'part';
  const options = isPart ? (observation.part?.options || []) : (observation.choices || []);
  if (!options.length) return { advance: true, reason: profile.advanceReason };
  const ranked = options.map((option, index) => optionScore(option, observation, memory, profile, index))
    .sort((a, b) => b.score - a.score);
  const selected = ranked[0];
  const runnerUp = ranked[1];
  const margin = runnerUp ? selected.score - runnerUp.score : selected.score;
  // 特殊パートはボタンの役割（反証、代理、遺品、沈黙など）も明示的な方針根拠。
  const grounded = selected.grounds.length > 0 && (!runnerUp || margin >= 0.05);
  memory.lastLabel = selected.option.label;
  if (selected.option.meta?.action === 'card') memory.temariCards = [...new Set([...(memory.temariCards || []), selected.option.meta.cardId])];
  if (selected.option.meta?.action === 'slot' && observation.part?.name === 'temariBoard') {
    const selectedCard = observation.part.temari?.cards?.find((card) => card.selected);
    if (selectedCard) {
      const triedKey = placementKey(
        observation.part.temari.face,
        selectedCard.id,
        selected.option.meta.number,
        selected.option.meta.kind,
      );
      memory.temariTriedPlacements = [...new Set([...(memory.temariTriedPlacements || []), triedKey])];
      memory.temariPending = {
        face: observation.part.temari.face,
        cardId: selectedCard.id,
        number: selected.option.meta.number,
        kind: selected.option.meta.kind,
      };
    }
  }
  memory.decisions = (memory.decisions || 0) + 1;
  const scoreText = ranked.map(({ option, score }) => `${option.label}:${score.toFixed(3)}`).join(' / ');
  const orderedGrounds = [...selected.grounds].sort((a, b) => Number(b.startsWith('目標')) - Number(a.startsWith('目標')));
  const basis = orderedGrounds.length ? orderedGrounds.slice(0, 2).join('、') : '文言の行動性・長さから方針差が出なかった';
  const reason = `${profile.reason}。${basis}（採点 ${scoreText}）`;
  const diagnostic = {
    grounded,
    margin: Number(margin.toFixed(3)),
    selected: selected.option.label,
    options: options.map(({ label }) => label),
    note: grounded ? '方針に結び付く手掛かりで差が付いた' : '本文・文言の手掛かりが乏しく、一般的な読みやすさの差だけになった',
  };
  return isPart
    ? { part: selected.option.index, reason, diagnostic }
    : { choice: selected.option.index, reason, diagnostic };
}
