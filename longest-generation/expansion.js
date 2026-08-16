(function(){
  'use strict';
  var pack=window.CS_EXPANSION||{extras:[],bonus:[],decisionTemplates:[],endings:{}};
  var originals=window.STORY.slice();

  function uniqueAnchorIndex(chapter,anchor,kind){
    var matches=[];
    chapter.beats.forEach(function(beat,index){if(beat.id===anchor||beat.label===anchor)matches.push(index);});
    if(matches.length!==1)throw new Error(kind+' anchor must match exactly once: '+anchor+' (chapter '+chapter.title+', matches '+matches.length+')');
    return matches[0];
  }

  (pack.bonus||[]).forEach(function(entry){
    var chapter=originals[Number(entry.original)-1];
    if(!chapter||!entry.quiz)return;
    if(!entry.afterBeat)throw new Error('Bonus question is missing an explicit story anchor: '+entry.quiz.id);
    var anchor=uniqueAnchorIndex(chapter,entry.afterBeat,'Bonus question '+entry.quiz.id);
    chapter.beats.splice(anchor+1,0,entry.quiz);
  });

  var expanded=[];
  originals.forEach(function(chapter,index){
    expanded.push(chapter);
    (pack.extras||[]).filter(function(extra){return Number(extra.after)===index+1;}).sort(function(a,b){return Number(a.order||0)-Number(b.order||0);}).forEach(function(extra){
      var copy={};Object.keys(extra).forEach(function(key){if(key!=='after'&&key!=='order')copy[key]=extra[key];});expanded.push(copy);
    });
  });

  var actEnds=[3,8,16,25,28,31,34,38,42,43,46,48];
  expanded.forEach(function(chapter,index){
    chapter.no=index+1;
    for(var actIndex=0;actIndex<actEnds.length;actIndex++){
      if(chapter.no<=actEnds[actIndex]){chapter.act=actIndex+1;break;}
    }
  });
  window.STORY=expanded;

  window.ACT_INFO=[
    {no:1,title:'이름을 얻기까지',subtitle:'2026—1592 · 외톨이 이준이 서준으로 불리고, 혼자 아는 아이에서 함께 준비하는 아이가 되다'},
    {no:2,title:'불길 속에서 함께 걷다',subtitle:'1592 · 전쟁 날짜보다 아이와 수레, 흩어진 가족을 먼저 붙들다'},
    {no:3,title:'승전 뒤에도 굶주리다',subtitle:'1593—1597 · 승전보 사이에서 기근·역병·징발을 견디고 두 번째 침공을 맞다'},
    {no:4,title:'전쟁이 끝난 뒤 집을 만들다',subtitle:'1597—1605 · 귀환자와 새 이웃을 받아들이고 서준과 연화가 한 가족이 되다'},
    {no:5,title:'다시 일군 땅과 약방',subtitle:'1608—1616 · 세금과 부역의 부담 속에서 장터와 약방을 삶의 기반으로 키우다'},
    {no:6,title:'북방에서 온 압박',subtitle:'1616—1621 · 후금의 성장과 사르후 패전이 광주의 곡식과 가족을 흔들다'},
    {no:7,title:'바뀐 왕, 무너진 류씨',subtitle:'1623—1624 · 반정과 이괄의 난이 류태석의 장남과 남은 재산을 앗아 가다'},
    {no:8,title:'첫 화약과 다음 전쟁',subtitle:'1626—1633 · 호패와 가도 군량을 겪으며 끝나지 않은 전쟁을 준비하다'},
    {no:9,title:'남한산성 마흔다섯 날',subtitle:'1636—1637 · 추위와 굶주림 속에서 씨앗 일부를 쓰고 다음 봄의 몫을 지키다'},
    {no:10,title:'돌아온 사람을 집에 들이다',subtitle:'1638 · 은과 베를 내놓고, 돌아온 옥분이 다시 가족이 되도록 문을 열다'},
    {no:11,title:'심양에서 진실을 가르다',subtitle:'1641—1645 · 직접 본 일과 전해 들은 말, 확인할 수 없는 죽음을 구분하다'},
    {no:12,title:'남은 삶을 넘겨주다',subtitle:'1649—2026 · 군역의 대가를 다음 세대에 알리고, 돌아온 이준이 현재의 첫 행동을 고르다'}
  ];

  window.DECISION_INDEX={};
  var decisionChapters=[4,8,12,16,20,24,28,32,36,40,44,48];
  decisionChapters.forEach(function(no,index){
    if(STORY[no-1]&&pack.decisionTemplates&&pack.decisionTemplates[index]){
      var chapter=STORY[no-1],decision=pack.decisionTemplates[index];
      chapter.decision=decision;window.DECISION_INDEX[no]=index+1;
      if(decision.afterBeat){
        var anchor=uniqueAnchorIndex(chapter,decision.afterBeat,'Decision '+no);
        chapter.beats.splice(anchor+1,0,{type:'decision',id:'decision-'+no});
      }
    }
  });
  window.ENDINGS=pack.endings||{};

  var ids=[],duplicates=[];
  STORY.forEach(function(chapter){
    chapter.beats.filter(function(beat){return beat.type==='quiz';}).forEach(function(quiz){if(ids.indexOf(quiz.id)>=0)duplicates.push(quiz.id);ids.push(quiz.id);});
  });
  if(STORY.length!==48||ids.length!==144||duplicates.length){
    console.error('CommonSenses expansion integrity check failed',{chapters:STORY.length,questions:ids.length,duplicates:duplicates});
  }
})();
