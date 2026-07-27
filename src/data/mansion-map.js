// Mansion geometry and exploration state helpers.  This module deliberately
// has no UI dependencies so maps can also be checked from scenario tests.
export const mansionRooms = [
  { id:'guest_parlor', name:'客間', floor:'1f', col:0, row:0, w:2, h:2, desc:'客人を迎えるための静かな部屋。今は事件の気配が残っている。', revealedBy:null },
  { id:'study', name:'書斎', floor:'1f', col:2, row:0, w:3, h:2, desc:'壁一面の書架と、宗玄の机。初版本はここのガラス戸の内側にもある。', revealedBy:null },
  { id:'hall', name:'大広間', floor:'1f', col:5, row:0, w:3, h:2, desc:'祝宴にも使われた広間。高い窓が雨音を遠くしている。', revealedBy:null },
  { id:'dining', name:'食堂', floor:'1f', col:8, row:0, w:4, h:2, desc:'長い食卓のある部屋。いまは証言を集める仮の取調室だ。', revealedBy:null },
  { id:'corridor1', name:'一階廊下', floor:'1f', col:0, row:2, w:12, h:1, desc:'各室をつなぐ長い廊下。濡れた靴跡も、声もここを通る。', revealedBy:null },
  { id:'salon', name:'談話室', floor:'1f', col:0, row:3, w:3, h:2, desc:'暖炉とソファのある談話室。人の視線が集まりやすい。', revealedBy:null },
  { id:'entrance', name:'玄関ホール', floor:'1f', col:3, row:3, w:3, h:2, desc:'外界へ通じるはずの玄関。嵐の日には館の内側だけが近い。', revealedBy:null },
  { id:'kitchen', name:'厨房', floor:'1f', col:6, row:3, w:3, h:2, desc:'夜食と湯気の匂いが残る厨房。帳面や鍵の所在もここにある。', revealedBy:null },
  { id:'laundry', name:'洗濯室', floor:'1f', col:9, row:3, w:2, h:2, desc:'濡れたリネンと洗剤の匂いが籠もる、小さな作業室。', revealedBy:null },
  { id:'back_door', name:'裏口', floor:'1f', col:11, row:3, w:1, h:2, desc:'使用人用の裏口。外の笹藪へ続く。', revealedBy:null },
  { id:'room_shiori', name:'栞の部屋', floor:'2f', col:0, row:0, w:3, h:2, desc:'栞が眠るために与えられた部屋。手帳と沈黙をしまっている。', revealedBy:null },
  { id:'room_goko', name:'剛蔵の部屋', floor:'2f', col:3, row:0, w:3, h:2, desc:'酒の匂いと荒い足音が残る剛蔵の私室。', revealedBy:null },
  { id:'room_saeki', name:'佐伯の部屋', floor:'2f', col:6, row:0, w:3, h:2, desc:'佐伯が持ち込んだ鞄と書類のある客室。', revealedBy:null },
  { id:'room_fujino', name:'藤乃の部屋', floor:'2f', col:9, row:0, w:3, h:2, desc:'藤乃の私室。整った調度がかえって人の不在を際立たせる。', revealedBy:null },
  { id:'corridor2', name:'二階廊下', floor:'2f', col:0, row:2, w:12, h:1, desc:'客室と書庫を結ぶ二階廊下。歩数と窓の数が、どこかで合わない。', revealedBy:null },
  { id:'stacks', name:'書庫', floor:'2f', col:0, row:3, w:4, h:2, desc:'古い版や資料が眠る書庫。棚の背後には深い影がある。', revealedBy:null },
  { id:'room_makabe', name:'真壁の部屋', floor:'2f', col:4, row:3, w:4, h:2, desc:'真壁の客室。仕事道具と整いすぎた説明が置かれている。', revealedBy:null },
  { id:'stairs', name:'らせん階段', floor:'2f', col:8, row:3, w:4, h:2, desc:'階下へ巻き降りるらせん階段。冷たい空気が下から上がる。', revealedBy:null },
  { id:'basement', name:'地下前室', floor:'under', col:0, row:0, w:4, h:2, desc:'地下へ続く前室。古い音の正体を知る者だけが近づく。', revealedBy:'basement_sound' },
  { id:'storehouse', name:'旧貯蔵庫', floor:'under', col:4, row:0, w:4, h:2, desc:'使われなくなった旧貯蔵庫。湿った土の匂いが抜けない。', revealedBy:'basement_sound' },
  { id:'void_space', name:'寸法の合わない空隙', floor:'under', col:8, row:0, w:4, h:2, desc:'壁の内側にあるはずのない空隙。館の地図からこぼれた場所。', revealedBy:'hidden_dimension' },
  { id:'old_road', name:'旧道', floor:'under', col:0, row:3, w:6, h:3, desc:'谷を迂回し、三里先へ抜ける古い山道。', revealedBy:'old_road' },
  { id:'bridge', name:'落ちた吊り橋', floor:'under', col:6, row:3, w:6, h:3, desc:'谷に落ちた吊り橋。正面の道はもう使えない。', revealedBy:null },
];

export function roomsByFloor(floor) { return mansionRooms.filter((room) => room.floor === floor); }
export function roomRect(room) { return { x: room.col * 10, y: room.row * 10, width: room.w * 10, height: room.h * 10 }; }
export function isRoomRevealed(room, state = {}) {
  return room.revealedBy === null || Object.values(state.flags || {}).some((ids) => ids?.includes?.(room.revealedBy));
}
export function roomActionIndex(actions = []) {
  const known = new Set(mansionRooms.map((room) => room.id));
  return actions.reduce((index, action) => {
    const roomId = known.has(action.room) ? action.room : '__unassigned';
    (index[roomId] ||= []).push(action);
    return index;
  }, {});
}
export function roomStatus(room, actions = [], usedIds = [], state = {}) {
  const inRoom = roomActionIndex(actions)[room.id] || [];
  const total = inRoom.length;
  const remaining = inRoom.filter((action) => !usedIds.includes(action.id)).length;
  return { revealed: isRoomRevealed(room, state), total, remaining, done: total > 0 && remaining === 0 };
}
