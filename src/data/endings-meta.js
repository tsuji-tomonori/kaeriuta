export const endingsMeta = [
  {
    id: 'a1_arrest',
    sceneId: 'end_a1',
    code: 'A-1',
    name: '逮捕',
    route: 'A',
    bg: 'bg_hall_morning',
    summary: '推理ショーで名指しされ、栞は自らの沈黙も含めて連行される。霧原律の名を調書へ残す仕事だけを託す。',
    order: 1
  },
  {
    id: 'a2_escape',
    sceneId: 'end_a2',
    code: 'A-2',
    name: '脱出',
    route: 'A',
    bg: 'bg_old_road',
    summary: '栞は五番の唄が示した旧道から館を逃れる。逃走の先にも、読まれない頁の記憶がついてくる。',
    order: 2
  },
  {
    id: 'a3_puppet',
    sceneId: 'end_a3',
    code: 'A-3',
    name: '操り人形',
    route: 'A',
    bg: 'bg_room_fireplace',
    summary: '焦げた指示メモから、復讐さえ宗玄の口封じに利用されたと知る。操られた事実と、自ら選んだ罪だけが残る。',
    order: 3
  },
  {
    id: 'a4_reversal',
    sceneId: 'end_a4',
    code: 'A-4',
    name: '逆転',
    route: 'A',
    bg: 'bg_hidden_room',
    summary: '栞は自分の罪を認めたうえで宗玄の生存と四十年の盗作を告発する。二人の手錠が、真実と代償を別々に記録する。',
    order: 4
  },
  {
    id: 'b1_true',
    sceneId: 'end_b1',
    code: 'B-1',
    name: '真相',
    route: 'B',
    bg: 'bg_rooftop_dawn',
    summary: '「帰り唄」の題と折句が、霧原律の名を四十年ぶりに本棚へ返す。宗玄は死の幕を下ろせず、生きて読者になる。',
    order: 5
  },
  {
    id: 'b2_unfinished',
    sceneId: 'end_b2',
    code: 'B-2',
    name: '未完',
    route: 'B',
    bg: 'bg_library_day',
    summary: '宗玄は断罪を自らの結末に変え、律の原稿は出所不明の資料として保管される。真相は次の読者を待つ未完の本になる。',
    order: 6
  },
  {
    id: 'b3_silenced',
    sceneId: 'end_b3',
    code: 'B-3',
    name: '口封じ',
    route: 'B',
    bg: 'bg_corridor_night',
    summary: '告白した栞を、宇野が五番の「逃げた小鳥」として襲う。奪われた声の代わりに、「帰る」の一語だけが残る。',
    order: 7
  }
];

export function endingMeta(id) {
  return endingsMeta.find(meta => meta.id === id || meta.sceneId === id);
}
