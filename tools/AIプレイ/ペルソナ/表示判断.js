// IDや表示順ではなく、プレイヤーに出る報酬・危険・主張から判断する。
export function evidenceFocus({option, observation, memory}) {
  if(observation.part?.name !== 'freeAction') return {};
  const names = [...option.label.matchAll(/手掛かり「([^」]+)」/g)].map(m=>m[1]);
  const fresh = names.filter(name=>!(memory.acquiredClues || []).includes(name));
  return { score: fresh.length * 120, grounds: fresh.length ? ['未取得の手掛かりを持ち帰れる注目先を選ぶ'] : [] };
}
export function escapeReading({option, observation}) {
  const label=option.label;
  if(observation.part?.name==='freeAction') {
    const cost=[...label.matchAll(/疑惑が(\d+)(増す|下がる)/g)].reduce((n,m)=>n+Number(m[1])*(m[2]==='増す'?1:-1),0);
    return {score: -cost*15 + (/旧道|退路/.test(label)?80:0) + (/信頼が\d+増す/.test(label)?10:0),grounds:['道筋と表示された疑惑の増減で、目立たない支度を選ぶ']};
  }
  if(observation.part?.name==='rebuttal')return {score:/露見時|知りすぎを疑われる|疑いが濃くなる/.test(label)?-150:0,grounds:['逃走前に疑いを招く反証を避ける']};
  return {};
}
export function empatheticReading({option,observation}) {
  const label=option.label;
  if(observation.kind==='choice'&&/帰り唄.*意味/.test(label))return {score:100,grounds:['断罪より、律が帰りたかった意味を本人へ返す']};
  if(observation.part?.name!=='jointReasoning')return {};
  // 遺品を使い切る前に、実地記憶が必要な地下室の主張を、遺品も使えるうちに扱う。
  // 開き直り後は管理人の証言を得る。どちらも画面の説明から読める順序。
  if(/地下室.*物置/.test(label))return {score:100,grounds:['閉じ込められた人の暮らしを、自分が見た地下室から伝える']};
  if(/管理人に聞けば/.test(label))return {score:80,grounds:['管理人にも語ってもらい、残された証言を支える']};
  if(label.startsWith('自分が暴く'))return {score:45,grounds:['人任せにせず、自分の言葉で被害者の証拠を返す']};
  if(label.startsWith('律の遺した'))return {score:55,grounds:['自分で届かない言葉を律の遺したものに託す']};
  return {};
}
export function inquisitiveReading(input) {
  const evidence = evidenceFocus(input);
  if(input.observation.kind === 'choice' && /扉を叩く|直接.*聞/.test(input.option.label)) {
    return {score:25,grounds:['伝言だけで済ませず、相手へ直接確かめて情報を増やす']};
  }
  return evidence;
}
