import { modal, finish, stateOf, has, displayText } from '../common.js';
import { exposureCostLabels, exposureEffectsFor, evidenceUsedFor, exposureMeta } from '../exposure.js';
import { inferenceFinal } from '../../data/parts/inference-final.js';

export function canBreak(node, cards, bravado = false, uno = false) {
  const matched = node.requirements.map((group) => group.filter((id) => cards.includes(id)));
  const count = matched.reduce((total, group) => total + (group.length ? 1 : 0), 0);
  const unoRelief = uno && ['n8', 'n9', 'n10', 'n11'].includes(node.id) ? 1 : 0;
  const needed = Math.max(1, node.requirements.length + (bravado ? 1 : 0) - unoRelief);
  return count >= needed;
}

export const B1_AGITATION_THRESHOLD = 97;
export const BRAVADO_AGITATION_THRESHOLD = 50;
export const RELIC_USE_LIMIT = 2;

export function isB1Open(agitation) {
  return agitation >= B1_AGITATION_THRESHOLD;
}

export function triggersBravado(agitation, threshold = BRAVADO_AGITATION_THRESHOLD) {
  return agitation >= threshold;
}

export function isB2Locked(node, cards) {
  return node.id === 'n10' && !cards.includes('acrostic') && !cards.includes('acrostic_card');
}

export function canUseRelic(uses, limit = RELIC_USE_LIMIT) {
  return uses < limit;
}

export function missingEvidenceHint(node, cards, bravado = false, uno = false) {
  if (canBreak(node, cards, bravado, uno)) return '';
  if (node.id === 'n11') return '計画書を比べた記録がない。第一〜二章で、共犯者の部屋と暖炉の指示メモを確かめる必要がある。';
  if (node.id === 'n10') return '作者の名を示す署名がない。地下の生原稿を、行頭まで読み直す必要がある。';
  return 'この主張を崩す証拠が足りない。別の頁を先に崩すか、前章の探索を読み直そう。';
}

export function hasReasoningMethod(node, cards, {
  bravado = false,
  uno = false,
  relicUses = 0,
} = {}) {
  return canBreak(node, cards, bravado, uno)
    || Boolean(node.conanProxy)
    || Boolean(node.relicBonus && canUseRelic(relicUses));
}

export function resultTitle(endingId) {
  if (endingId === 'a4_reversal') return 'A-4 逆転への反証';
  return endingId === 'b1_true' ? 'B-1 真相END' : 'B-2 未完END';
}

export const jointReasoning = { async start(ctx, args = {}) {
  const data = args.debugData || inferenceFinal;
  const state = stateOf(ctx);
  const cards = [...(state.items || []), ...Object.values(state.flags || {}).flat()];
  const a4 = args.variant === 'a4';

  return new Promise((resolve) => {
    const view = modal(ctx, a4 ? '推理ショー乗っ取り' : '壁の内の作者');
    const nodes = data.phases.flatMap((phase) => phase.nodes).filter((node) => !a4 || node.id === 'n1');
    let broken = [];
    let effects = [];
    let agitation = state.params?.agitation || 0;
    let bravado = false;
    let uno = false;
    let relicUses = 0;

    const gateStatus = () => isB1Open(agitation)
      ? '真相の門：開いた'
      : `真相の門：まだ崩せていない（あと${B1_AGITATION_THRESHOLD - agitation}）`;

    const complete = (endingId) => {
      effects.push({ t:'log', key:'joint_reasoning', value:endingId });
      effects.push({ t:'log', key:'ending_hint', value:endingId });
      effects.push({ t:'log', key:'relic_uses', value:relicUses });
      finish(view.root, resolve, { effects, endingId, agitation, bravado, broken, relicUses });
    };

    const ending = (endingId, message) => {
      view.main.innerHTML = `<h2>${resultTitle(endingId)}</h2><p class="result-text">${displayText(message)}</p><button id="done">対峙を終える</button>`;
      view.main.querySelector('#done').onclick = () => complete(endingId);
    };

    const final = () => {
      if (a4) {
        ending('a4_reversal', '悟郎の推理の前提を崩し、栞自身の告白を卓上へ置いた。逆転は罪を消さず、脚本を書いた者を表へ引き出す。');
        return;
      }
      const incomplete = '証明は揃った。だが、崩れたのは宗玄ではなく、証明の順番だけだった。栞の言葉は、まだ彼の結末を越えられない。';
      view.main.innerHTML = `<p class="claim">【BGM消音】六番の唄</p><p>宗玄「作者にも、もう変えられん」</p><p class="parts-note">${gateStatus()}</p><div class="parts-actions">${data.final.choices.filter((choice) => !choice.requires || has(ctx, choice.requires)).map((choice) => `<button data-e="${choice.ending}" data-id="${choice.id}">${choice.label}</button>`).join('')}</div>`;
      view.main.querySelectorAll('[data-e]').forEach((button) => {
        button.onclick = () => {
          const meaningBlocked = button.dataset.id === 'meaning' && !isB1Open(agitation);
          ending(meaningBlocked ? 'b2_unfinished' : button.dataset.e, meaningBlocked ? incomplete : button.dataset.id === 'meaning' ? data.final.trueText : '');
        };
      });
    };

    const win = (node, multiplier, method) => {
      broken.push(node.id);
      const delta = node.agitation * multiplier;
      agitation = Math.min(100, agitation + delta);
      if (delta) effects.push({ t:'param', key:'agitation', delta });
      if (method === 'own') {
        for (const evidence of evidenceUsedFor(node, cards)) effects.push(...exposureEffectsFor(evidence));
      }
      if (method === 'relic') {
        relicUses += 1;
        effects.push({ t:'param', key:'conscience', delta:-1 });
      }
      if (!bravado && triggersBravado(agitation, data.bravado?.threshold)) bravado = true;
      if (node.id === 'n6') {
        uno = true;
        effects.push({ t:'log', key:'uno_present', value:true });
      }
      if (a4) {
        effects.push({ t:'item', id:'confession_record' });
        effects.push({ t:'log', key:`a4_confession_${node.id}`, value:true });
      }
      if (!nodes.some((candidate) => !broken.includes(candidate.id))) final();
      else render();
    };

    const respond = (node) => {
      if (isB2Locked(node, cards)) {
        effects.push({ t:'log', key:'joint_reasoning', value:'b2_locked' });
        ending('b2_unfinished', '折句がない。証明のない物語は、妄想と言う。地下の生原稿を行頭まで読めば、作者の署名へ届く。');
        return;
      }
      const own = canBreak(node, cards, bravado, uno);
      const relicAvailable = node.relicBonus && canUseRelic(relicUses);
      const noMethod = !hasReasoningMethod(node, cards, { bravado, uno, relicUses });
      const usedEvidence = own ? evidenceUsedFor(node, cards) : [];
      const evidenceNames = usedEvidence.map((id) => exposureMeta(id)?.name ?? id).join('／');
      const exposureCosts = usedEvidence.flatMap(exposureCostLabels);
      const ownNote = own
        ? [`提示：${evidenceNames}`, ...exposureCosts].map((note) => `<span>${displayText(note)}</span>`).join('')
        : `<span>${displayText(missingEvidenceHint(node, cards, bravado, uno))}</span>`;
      const ownHint = `<small class="option-note">${ownNote}</small>`;
      const relicHint = node.relicBonus ? `<small class="option-note"><span>良心 -1／残り ${Math.max(0, RELIC_USE_LIMIT - relicUses)} 回</span></small>` : '';
      view.main.innerHTML = `<p class="claim">宗玄「${displayText(node.claim)}」</p><div class="parts-actions"><div class="parts-option ${own ? '' : 'is-disabled'}"><button id="own" ${own ? '' : 'disabled aria-disabled="true"'}>自分が暴く（カード提示）</button>${ownHint}</div>${node.conanProxy ? '<button id="proxy">コウナンに任せる<small>宗玄は動じない</small></button>' : ''}${node.relicBonus ? `<div class="parts-option ${relicAvailable ? '' : 'is-disabled'}"><button id="relic" ${relicAvailable ? '' : 'disabled aria-disabled="true"'}>律の遺したものを突きつける 🕯</button>${relicHint}</div>` : ''}${noMethod ? '<button id="unfinished">証拠不足のまま対峙を閉じる</button>' : ''}</div><button id="back">戻る</button>`;
      view.main.querySelector('#back').onclick = render;
      if (own) view.main.querySelector('#own').onclick = () => win(node, 1, 'own');
      if (node.conanProxy) view.main.querySelector('#proxy').onclick = () => win(node, 0, 'proxy');
      if (relicAvailable) view.main.querySelector('#relic').onclick = () => win(node, 2, 'relic');
      if (noMethod) view.main.querySelector('#unfinished').onclick = () => ending('b2_unfinished', missingEvidenceHint(node, cards, bravado, uno));
    };

    function render() {
      const available = nodes.filter((node) => !broken.includes(node.id));
      view.main.innerHTML = `<div class="agitation">動揺 <b>${agitation}</b><i><em style="width:${agitation}%"></em></i><small>${gateStatus()}</small></div><p>${agitation >= 80 ? '宗玄「お前が――」' : agitation >= 60 ? '宗玄「君は、何を…」' : '宗玄「証明してみたまえ」'}</p><div class="node-grid">${available.map((node) => `<div class="parts-option"><button data-id="${node.id}"><small>${node.phase}</small>${node.id.toUpperCase()}　${displayText(node.claim)}</button>${node.note ? `<small class="option-note">${displayText(node.note)}</small>` : ''}</div>`).join('')}</div><p class="parts-note">${bravado ? '開き直りモード：要求カードが一段厳しい。' : ''}${uno ? ' 宇野が同席し、後半の要求が緩和されている。' : ''} 律の遺品：残り${Math.max(0, RELIC_USE_LIMIT - relicUses)}回</p>`;
      view.main.querySelectorAll('[data-id]').forEach((button) => {
        button.onclick = () => respond(available.find((node) => node.id === button.dataset.id));
      });
    }

    view.close.onclick = () => complete(a4 ? 'a4_reversal' : 'b2_unfinished');
    render();
  });
} };
