export const rebuttalCh2 = { id:'day2_inquiry', title:'二日目昼の尋問', initialConviction:52, nodes:[
 {id:'n1', kind:'前提', type:'前提', designIntent:'正しい知識を使うと死ぬ。「知らないフリ」の基本文法を教える。', claim:'毒は夜食の珈琲に混入された', responses:[
  {kind:'rebut',label:'厨房の献立表',card:'kitchen_menu',result:{effects:[{t:'param',key:'conviction',delta:5}],note:'無関係。「何が言いたいんだ？」'}},
  {kind:'rebut',label:'毒は寝酒の方では？',note:'詳細を知りすぎる危険な切り返し',result:{effects:[{t:'param',key:'overknow',delta:1},{t:'param',key:'suspicion',delta:15}],overknow:true,note:'コウナン「…お姉さん、なんでそう思うの？」'}},
  {kind:'silence',label:'沈黙する',result:{effects:[],note:'事実なので争わない。'}},
  {kind:'redirect',label:'珈琲なら誰でも触れたはず',result:{effects:[{t:'param',key:'conviction',delta:-5}],note:'部分成功。N2で切り返される。'}}]},
 {id:'n2', kind:'論理', type:'論理', designIntent:'日常の選択で拾った弾と、人間関係に残る代償を示す。', claim:'珈琲を淹れて運べたのは、厨房にいた栞さんだけ', responses:[
  {kind:'rebut',label:'配膳の当番メモ',card:'serving_roster',result:{effects:[{t:'param',key:'conviction',delta:-15}],break:true,note:'夜食は家政婦が運んだ。鎖が砕ける。'}},
  {kind:'rebut',label:'自室の読書記録',card:'reading_record',result:{effects:[{t:'param',key:'conviction',delta:5}],note:'裏付けが弱い。'}},
  {kind:'silence',label:'沈黙する',result:{effects:[{t:'param',key:'conviction',delta:10}],note:'追い詰められる。'}},
  {kind:'redirect',label:'剛蔵兄さんが後からポットに近づいた',note:'兄へ疑いを向けて追及をそらす',cond:{flag:'other_plan'},result:{effects:[{t:'param',key:'conviction',delta:-20},{t:'param',key:'trust',delta:-1}],break:true,note:'成功。ただし共犯者を売った。'}},
  {kind:'redirect',label:'藤乃姉さんも起きていたはず',result:{effects:[{t:'param',key:'conviction',delta:-10},{t:'param',key:'conscience',delta:-1}],break:true,note:'無実の者への転嫁。'}}]},
 {id:'n3', kind:'物証', type:'物証', designIntent:'N2の成否が沈黙の意味を変える連鎖を見せる。', claim:'カップに残った、あんたの指紋', responses:[
  {kind:'rebut',label:'食後の後片付け',card:'cleanup_card',result:{effects:[{t:'param',key:'conviction',delta:-15}],break:true,note:'全員分を下げた。鎖は完全に砕ける。'}},
  {kind:'rebut',label:'手袋をしていれば指紋など…',result:{effects:[{t:'param',key:'conviction',delta:20},{t:'param',key:'overknow',delta:1},{t:'param',key:'suspicion',delta:10}],overknow:true,note:'犯人の手口に詳しい。'}},
  {kind:'silence',label:'沈黙する',result:{effects:[{t:'param',key:'conviction',delta:15}],conditional:{ifBroken:'n2',effects:[]},note:'N2撃破済みなら悟郎が自壊する。'}}]}
 ], testimony:{question:'おとといの夜って、何時ごろお部屋に戻ったのー？', key:'night_return', options:[['before_23','11時前には'],['unknown','覚えていないわ'],['counter','どうしてそんなことを聞くの？']]}};
