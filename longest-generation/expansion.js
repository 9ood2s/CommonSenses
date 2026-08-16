(function(){
  'use strict';
  var pack=window.CS_EXPANSION||{extras:[],bonus:[],decisionTemplates:[],endings:{}};
  var originals=window.STORY.slice();

  (pack.bonus||[]).forEach(function(entry){
    var chapter=originals[Number(entry.original)-1];
    if(!chapter||!entry.quiz)return;
    var last=-1;
    chapter.beats.forEach(function(beat,index){if(beat.type==='quiz')last=index;});
    chapter.beats.splice(last+1,0,entry.quiz);
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
    {no:1,title:'눈을 뜬 뒤 네 번의 겨울',subtitle:'2026—1592 · 죽은 줄 알았던 역덕후가 이름과 밥값, 믿어 줄 세 집을 얻다'},
    {no:2,title:'무너지는 조선',subtitle:'1592 · 수도와 신분, 가족의 자리가 함께 흔들리다'},
    {no:3,title:'전쟁이 길어지는 법',subtitle:'1593—1597 · 승전보 사이에서 기근·역병·징발을 견디다'},
    {no:4,title:'전쟁 뒤의 빈칸',subtitle:'1597—1605 · 재침과 철수 뒤 포로·신분·세금이 다시 쓰이다'},
    {no:5,title:'대동법과 새 장부',subtitle:'1608—1616 · 시장·궁궐·의서가 전후의 삶을 바꾸다'},
    {no:6,title:'북방이 움직이다',subtitle:'1616—1621 · 후금의 성장과 사르후, 폐모 논쟁이 겹치다'},
    {no:7,title:'반정은 끝이 아니다',subtitle:'1623—1624 · 왕과 공신이 바뀌고 이괄의 군대가 한양에 들다'},
    {no:8,title:'후금이 문 앞에',subtitle:'1626—1633 · 호패·정묘호란·가도 사이에서 불안이 쌓이다'},
    {no:9,title:'남한산성의 겨울',subtitle:'1636—1637 · 주화와 척화, 씨앗과 군량 사이의 선택'},
    {no:10,title:'돌아오는 사람의 값',subtitle:'1638 · 속환의 은과 귀환자의 낙인이 전쟁 뒤를 잇다'},
    {no:11,title:'명이 무너진 뒤',subtitle:'1641—1645 · 심양과 명청 교체, 세자의 죽음을 기록하다'},
    {no:12,title:'북벌보다 긴 겨울',subtitle:'1649—2026 · 재건된 마을과 노년의 이야기, 다섯 현재'}
  ];

  window.DECISION_INDEX={};
  var decisionChapters=[4,8,12,16,20,24,28,32,36,40,44,48];
  decisionChapters.forEach(function(no,index){
    if(STORY[no-1]&&pack.decisionTemplates&&pack.decisionTemplates[index]){
      STORY[no-1].decision=pack.decisionTemplates[index];window.DECISION_INDEX[no]=index+1;
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
