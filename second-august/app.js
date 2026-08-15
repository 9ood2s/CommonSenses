(function(){
  'use strict';

  var KEY='commonsenses.second-august.v2';
  var LEGACY_KEY='commonsenses.second-august.v1';
  var screens={
    title:document.getElementById('titleScreen'),
    map:document.getElementById('mapScreen'),
    knowledge:document.getElementById('knowledgeScreen'),
    story:document.getElementById('storyScreen'),
    end:document.getElementById('chapterEndScreen'),
    final:document.getElementById('finalScreen')
  };
  var topbar=document.getElementById('topbar');
  var portrait=document.getElementById('portrait');
  var portraitShell=document.getElementById('portraitShell');
  var dialogueCard=document.getElementById('dialogueCard');
  var duelIntro=document.getElementById('duelIntro');
  var briefingCard=document.getElementById('briefingCard');
  var quizCard=document.getElementById('quizCard');
  var dialogueText=document.getElementById('dialogueText');
  var nextButton=document.getElementById('nextButton');
  var feedbackButton=document.getElementById('feedbackButton');
  var timerId=null;
  var run=null;
  var endMode='next';
  var feedbackMode='next';
  var knowledgeReturn='map';
  var knowledgeLiveQuestion=false;

  function blankState(){
    return{started:false,current:0,unlocked:0,completed:[],answered:[],attempted:[],status:50,wins:0,losses:0};
  }
  function normalizeState(data){
    if(!data||!Array.isArray(data.completed)||!Array.isArray(data.answered))return blankState();
    data.current=Math.max(0,Math.min(STORY.length-1,Number(data.current)||0));
    data.unlocked=Math.max(0,Math.min(STORY.length-1,Number(data.unlocked)||0));
    data.attempted=Array.isArray(data.attempted)?data.attempted.slice():data.answered.slice();
    data.status=Number.isFinite(Number(data.status))?Math.max(0,Math.min(100,Number(data.status))):50;
    data.wins=Number(data.wins)||data.completed.length;
    data.losses=Number(data.losses)||0;
    return data;
  }
  function loadState(){
    try{
      var raw=localStorage.getItem(KEY);
      if(raw)return normalizeState(JSON.parse(raw));
      var legacy=localStorage.getItem(LEGACY_KEY);
      if(legacy)return blankState();
    }catch(e){}
    return blankState();
  }
  var state=loadState();
  function saveState(){
    try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){}
    updateHud();
  }
  function rank(){
    if(state.status>=80)return'기억하는 스타';
    if(state.status>=60)return'역사 개념돌';
    if(state.status>=40)return'다시 배우는 아이돌';
    if(state.status>=20)return'논란의 신인';
    return'나락 직전';
  }
  function updateHud(){
    document.getElementById('memoryCount').textContent=state.answered.length;
    document.getElementById('knowledgeCount').textContent=state.answered.length;
    document.getElementById('reputationCount').textContent=state.status;
    document.getElementById('finalScore').textContent=state.answered.length+' / 40';
    document.getElementById('finalReputation').textContent=state.status+' · '+rank();
  }
  function clearTimer(){
    if(timerId){clearInterval(timerId);timerId=null;}
  }
  function show(name){
    clearTimer();
    Object.keys(screens).forEach(function(k){screens[k].hidden=k!==name;});
    topbar.hidden=name!=='story';
    window.scrollTo(0,0);
  }
  function hideStoryCards(){
    dialogueCard.hidden=true;
    duelIntro.hidden=true;
    briefingCard.hidden=true;
    quizCard.hidden=true;
  }
  function nextPlayable(){
    for(var i=0;i<STORY.length;i++){
      if(state.completed.indexOf(i)<0&&i<=state.unlocked)return i;
    }
    return STORY.length-1;
  }
  function makeRun(chapter){
    var firstQuiz=chapter.beats.findIndex(function(b){return b.type==='quiz';});
    return{
      intro:chapter.beats.slice(0,firstQuiz).filter(function(b){return b.type==='line';}),
      outro:chapter.beats.slice(firstQuiz).filter(function(b){return b.type==='line';}),
      questions:chapter.beats.filter(function(b){return b.type==='quiz';}),
      phase:'intro',lineIndex:0,qCursor:0,currentQuestion:null,
      foeHp:100,trust:100,trustMax:100,right:0,wrong:0,timeouts:0,
      tactic:null,timeBonus:0,statusStart:state.status
    };
  }
  function startFresh(){
    if(state.started&&!window.confirm('저장된 진행 기록을 지우고 처음부터 시작할까요?'))return;
    state=blankState();
    state.started=true;
    saveState();
    openChapter(0);
  }
  function continueStory(){
    if(state.completed.length===STORY.length){showFinal();return;}
    openChapter(nextPlayable());
  }

  function preloadPortraits(){
    var unique=[];
    Object.keys(CHARACTERS).forEach(function(k){if(unique.indexOf(CHARACTERS[k].src)<0)unique.push(CHARACTERS[k].src);});
    var loaded=0;
    var loadState=document.getElementById('loadState');
    return Promise.allSettled(unique.map(function(src){
      return new Promise(function(resolve){
        var img=new Image();
        img.onload=function(){
          var done=function(){loaded++;loadState.textContent='초상화 준비 '+loaded+' / '+unique.length;resolve();};
          if(img.decode)img.decode().then(done).catch(done);else done();
        };
        img.onerror=function(){loaded++;resolve();};
        img.src=src;
      });
    })).then(function(){
      loadState.textContent='준비 완료 · 5막 20장 · 제한시간 설전 40문항';
      document.getElementById('startButton').disabled=false;
      if(state.started){
        document.getElementById('continueButton').hidden=false;
        document.getElementById('continueButton').textContent=state.completed.length===STORY.length?'마지막 장면 보기':'이어하기 · '+(nextPlayable()+1).toString().padStart(2,'0')+'장';
      }
    });
  }

  function setPortrait(key,name,role){
    var c=CHARACTERS[key]||CHARACTERS['haewon-neutral'];
    portraitShell.dataset.person=c.person;
    if(portrait.getAttribute('src')!==c.src)portrait.setAttribute('src',c.src);
    portrait.alt=c.alt;
    document.getElementById('speaker').textContent=name||c.name;
    document.getElementById('speakerRole').textContent=role||c.role;
  }
  function setChapterHeader(chapter){
    document.getElementById('actLabel').textContent=chapter.act+'막';
    document.getElementById('chapterLabel').textContent=String(chapter.no).padStart(2,'0');
    document.getElementById('sceneDate').textContent=chapter.date;
    document.getElementById('sceneTitle').textContent=chapter.title;
    document.getElementById('scenePlace').textContent=chapter.place;
  }
  function openChapter(index){
    if(index>state.unlocked)return;
    state.started=true;
    state.current=index;
    run=makeRun(STORY[index]);
    saveState();
    setChapterHeader(STORY[index]);
    show('story');
    renderFlow();
  }
  function renderFlow(){
    clearTimer();
    if(run.phase==='intro'){
      if(run.lineIndex<run.intro.length){renderLine(run.intro[run.lineIndex]);updateTrack();return;}
      renderDuelIntro();return;
    }
    if(run.phase==='duel'){renderQuestion();return;}
    if(run.phase==='outro'){
      if(run.lineIndex<run.outro.length){renderLine(run.outro[run.lineIndex]);updateTrack();return;}
      completeChapter();
    }
  }
  function renderLine(beat){
    var chapter=STORY[state.current];
    hideStoryCards();
    dialogueCard.hidden=false;
    setPortrait(beat.char);
    document.getElementById('sceneDate').textContent=beat.date||chapter.date;
    document.getElementById('scenePlace').textContent=beat.place||chapter.place;
    document.getElementById('beatLabel').textContent=beat.label||'SCENE';
    dialogueText.innerHTML=beat.text;
    nextButton.textContent='계속';
    nextButton.focus({preventScroll:true});
  }
  function renderDuelIntro(){
    var chapter=STORY[state.current],duel=chapter.duel;
    hideStoryCards();
    duelIntro.hidden=false;
    setPortrait(duel.char,duel.name,duel.role);
    document.getElementById('duelRole').textContent=duel.role;
    document.getElementById('duelName').textContent=duel.name;
    document.getElementById('duelQuote').textContent='“'+duel.quote+'”';
    document.getElementById('chapterTrack').style.width='34%';
    var first=duelIntro.querySelector('button');
    if(first)first.focus({preventScroll:true});
  }
  function chooseTactic(tactic){
    run.tactic=tactic;
    if(tactic==='trust'){run.trust=120;run.trustMax=120;}
    else run.timeBonus=6;
    renderBriefing();
  }
  function renderBriefing(){
    var chapter=STORY[state.current];
    hideStoryCards();
    briefingCard.hidden=false;
    setPortrait('haewon-determined');
    document.getElementById('briefingTitle').textContent=chapter.evidenceTitle;
    document.getElementById('briefingSub').textContent=chapter.title+' · 설전에서 확인할 근거';
    var body=document.getElementById('briefingBody');
    body.innerHTML='';
    var items=[{title:'핵심 흐름',text:chapter.evidenceText}];
    run.questions.forEach(function(q){items.push({title:q.fact,text:q.explanation});});
    items.forEach(function(item,index){
      var div=document.createElement('div');
      div.className='briefing-item';
      div.innerHTML='<span>'+String(index+1).padStart(2,'0')+'</span><div><b></b><p></p></div>';
      div.querySelector('b').textContent=item.title;
      div.querySelector('p').textContent=item.text;
      body.appendChild(div);
    });
    var seconds=baseTime()+run.timeBonus;
    document.getElementById('briefingRule').textContent='상대 논리 100 · 내 신뢰 '+run.trust+' · 문제당 '+seconds+'초'+(run.timeBonus?'(첫 문제만)':'')+' · 오답 시 신뢰와 평판 하락';
    document.getElementById('chapterTrack').style.width='42%';
    document.getElementById('briefingStartButton').focus({preventScroll:true});
  }
  function baseTime(){return Math.max(16,26-STORY[state.current].act*2);}
  function shuffledQuestion(){
    return run.questions[run.qCursor++%run.questions.length];
  }
  function renderQuestion(reuseCurrent){
    clearTimer();
    var chapter=STORY[state.current],duel=chapter.duel;
    var beat=reuseCurrent&&run.currentQuestion?run.currentQuestion:shuffledQuestion();
    run.currentQuestion=beat;
    hideStoryCards();
    quizCard.hidden=false;
    setPortrait(duel.char,duel.name,duel.role);
    document.getElementById('quizLabel').textContent='설전 · '+(run.right+run.wrong+1)+'번째 공방 · '+beat.label;
    document.getElementById('quizPrompt').textContent=beat.prompt;
    document.getElementById('quizContext').textContent=beat.context;
    document.getElementById('feedback').hidden=true;
    document.getElementById('foeStatusName').textContent=duel.name+' 논리';
    updateDuelHud();
    var order=beat.choices.map(function(_,i){return i;});
    order.sort(function(){return Math.random()-.5;});
    var choices=document.getElementById('choices');
    choices.innerHTML='';
    order.forEach(function(originalIndex,displayIndex){
      var button=document.createElement('button');
      button.type='button';
      button.className='choice';
      button.dataset.answer=originalIndex;
      button.innerHTML='<span class="key">'+String.fromCharCode(65+displayIndex)+'</span><span></span>';
      button.lastChild.textContent=beat.choices[originalIndex];
      button.addEventListener('click',function(){answerQuestion(originalIndex,button,false);});
      choices.appendChild(button);
    });
    var limit=baseTime();
    if(run.timeBonus){limit+=run.timeBonus;run.timeBonus=0;}
    startTimer(limit);
    var first=choices.querySelector('button');
    if(first)first.focus({preventScroll:true});
  }
  function startTimer(limit){
    var remaining=limit;
    var number=document.getElementById('timerNumber');
    var bar=document.getElementById('timerBar');
    var numberWrap=number.parentNode;
    function paint(){
      number.textContent=remaining;
      bar.style.width=Math.max(0,remaining/limit*100)+'%';
      bar.classList.toggle('danger',remaining<=6);
      numberWrap.classList.toggle('danger',remaining<=6);
    }
    paint();
    timerId=setInterval(function(){
      remaining--;
      paint();
      if(remaining<=0){clearTimer();answerQuestion(-1,null,true);}
    },1000);
  }
  function changeStatus(delta){
    state.status=Math.max(0,Math.min(100,state.status+delta));
    saveState();
  }
  function answerQuestion(choice,button,timedOut){
    clearTimer();
    var beat=run.currentQuestion;
    var buttons=[].slice.call(document.querySelectorAll('.choice'));
    buttons.forEach(function(b){b.disabled=true;});
    var correct=choice===beat.answer;
    var correctButton=buttons.find(function(b){return Number(b.dataset.answer)===beat.answer;});
    if(correct){
      button.classList.add('correct');
      run.foeHp=Math.max(0,run.foeHp-50);
      run.right++;
      changeStatus(2);
      if(state.answered.indexOf(beat.id)<0)state.answered.push(beat.id);
    }else{
      if(button)button.classList.add('wrong');
      if(correctButton)correctButton.classList.add('correct');
      run.trust=Math.max(0,run.trust-40);
      run.wrong++;
      if(timedOut)run.timeouts++;
      changeStatus(timedOut?-8:-6);
    }
    if(state.attempted.indexOf(beat.id)<0)state.attempted.push(beat.id);
    saveState();
    updateDuelHud();
    document.getElementById('feedback').hidden=false;
    document.getElementById('feedbackTitle').textContent=correct?'정곡 · 논리 방어선 −50':timedOut?'시간 초과 · 신뢰 −40':'반박당했다 · 신뢰 −40';
    document.getElementById('feedbackText').textContent=(correct?'평판 +2. ':'평판 '+(timedOut?'−8. ':'−6. '))+beat.explanation;
    document.getElementById('feedbackFact').textContent=beat.fact;
    if(run.foeHp<=0)feedbackMode='win';
    else if(run.trust<=0)feedbackMode='lose';
    else feedbackMode='next';
    feedbackButton.textContent=feedbackMode==='win'?'설전 마무리':feedbackMode==='lose'?'패배 확인':'다음 공방';
    feedbackButton.focus({preventScroll:true});
  }
  function updateDuelHud(){
    document.getElementById('foeBar').style.width=run.foeHp+'%';
    document.getElementById('foeHp').textContent=run.foeHp+' / 100';
    document.getElementById('trustBar').style.width=Math.max(0,run.trust/run.trustMax*100)+'%';
    document.getElementById('trustHp').textContent=run.trust+' / '+run.trustMax;
  }
  function finishDuel(win){
    clearTimer();
    if(win){
      state.wins++;
      run.phase='outro';
      run.lineIndex=0;
      saveState();
      renderFlow();
    }else{
      state.losses++;
      saveState();
      failChapter();
    }
  }
  function updateTrack(){
    var p=run.phase==='intro'?(run.intro.length?run.lineIndex/run.intro.length*32:32):75+(run.outro.length?run.lineIndex/run.outro.length*24:24);
    document.getElementById('chapterTrack').style.width=Math.min(99,Math.round(p))+'%';
  }
  function resultStats(){
    var delta=state.status-run.statusStart;
    return'<span>정답 '+run.right+'</span><span>오답 '+run.wrong+'</span><span>시간 초과 '+run.timeouts+'</span><span>평판 '+(delta>=0?'+':'')+delta+' · '+state.status+'</span><span>'+rank()+'</span>';
  }
  function completeChapter(){
    var i=state.current,chapter=STORY[i];
    if(state.completed.indexOf(i)<0)state.completed.push(i);
    if(i<STORY.length-1)state.unlocked=Math.max(state.unlocked,i+1);
    saveState();
    screens.end.classList.remove('failed');
    document.querySelector('.end-mark').textContent='勝';
    document.getElementById('completeAct').textContent=chapter.act+'막 · '+String(chapter.no).padStart(2,'0')+'장 · 설전 승리';
    document.getElementById('completeTitle').textContent=chapter.title;
    document.getElementById('completeSummary').textContent=chapter.summary;
    document.getElementById('endStats').innerHTML=resultStats();
    document.getElementById('evidenceTitle').textContent=chapter.evidenceTitle;
    document.getElementById('evidenceText').textContent=chapter.evidenceText;
    endMode=i===STORY.length-1?'final':'next';
    document.getElementById('nextChapterButton').textContent=endMode==='final'?'마지막 장면으로':'다음 장 · '+String(i+2).padStart(2,'0');
    show('end');
  }
  function failChapter(){
    var chapter=STORY[state.current];
    screens.end.classList.add('failed');
    document.querySelector('.end-mark').textContent='敗';
    document.getElementById('completeAct').textContent=chapter.act+'막 · '+String(chapter.no).padStart(2,'0')+'장 · 설전 패배';
    document.getElementById('completeTitle').textContent='신뢰가 먼저 무너졌다';
    document.getElementById('completeSummary').textContent='상대의 논리 방어선을 넘지 못했다. 이 장은 해금되지 않는다. 미래 기억 브리핑을 다시 읽고 재도전해야 한다.';
    document.getElementById('endStats').innerHTML=resultStats();
    document.getElementById('evidenceTitle').textContent=chapter.evidenceTitle;
    document.getElementById('evidenceText').textContent=chapter.evidenceText;
    endMode='retry';
    document.getElementById('nextChapterButton').textContent='브리핑부터 재도전';
    show('end');
  }
  function retryFromBriefing(){
    var tactic=run&&run.tactic?run.tactic:'trust';
    run=makeRun(STORY[state.current]);
    run.tactic=tactic;
    if(tactic==='trust'){run.trust=120;run.trustMax=120;}else run.timeBonus=6;
    setChapterHeader(STORY[state.current]);
    show('story');
    renderBriefing();
  }
  function renderMap(){
    var wrap=document.getElementById('actList');
    wrap.innerHTML='';
    ACT_INFO.forEach(function(act){
      var block=document.createElement('section');
      block.className='act-block';
      var head=document.createElement('div');
      head.className='act-heading';
      head.innerHTML='<b>'+act.no+'막</b><div><h3></h3><p></p></div>';
      head.querySelector('h3').textContent=act.title;
      head.querySelector('p').textContent=act.subtitle;
      var grid=document.createElement('div');
      grid.className='episode-grid';
      STORY.forEach(function(chapter,index){
        if(chapter.act!==act.no)return;
        var btn=document.createElement('button');
        btn.type='button';
        btn.className='episode-button';
        if(state.completed.indexOf(index)>=0)btn.classList.add('done');
        if(index===nextPlayable()&&state.completed.length<STORY.length)btn.classList.add('current');
        btn.disabled=index>state.unlocked;
        btn.innerHTML='<span>'+String(chapter.no).padStart(2,'0')+'</span><div><b></b><small></small></div>';
        btn.querySelector('b').textContent=chapter.title;
        btn.querySelector('small').textContent=index>state.unlocked?'잠김':state.completed.indexOf(index)>=0?'승리 · 다시 보기':chapter.duel.name+'과의 설전';
        btn.addEventListener('click',function(){openChapter(index);});
        grid.appendChild(btn);
      });
      block.appendChild(head);block.appendChild(grid);wrap.appendChild(block);
    });
    document.getElementById('mapContinueButton').textContent=state.completed.length===STORY.length?'마지막 장면':'계속 · '+String(nextPlayable()+1).padStart(2,'0')+'장';
    show('map');
  }

  function renderKnowledge(returnTo){
    if(returnTo)knowledgeReturn=returnTo;
    var list=document.getElementById('knowledgeList');
    var empty=document.getElementById('knowledgeEmpty');
    list.innerHTML='';
    var cardCount=0;
    STORY.forEach(function(chapter,index){
      var questions=chapter.beats.filter(function(beat){return beat.type==='quiz';});
      var learned=questions.filter(function(question){return state.answered.indexOf(question.id)>=0;});
      var cleared=state.completed.indexOf(index)>=0;
      if(!cleared&&!learned.length)return;
      cardCount++;

      var card=document.createElement('details');
      card.className='knowledge-card';
      var summary=document.createElement('summary');
      summary.innerHTML='<span class="knowledge-no"></span><span><b></b><small></small></span><em class="knowledge-state"></em>';
      summary.querySelector('.knowledge-no').textContent=chapter.act+'막 · '+String(chapter.no).padStart(2,'0')+'장';
      summary.querySelector('b').textContent=chapter.title;
      summary.querySelector('small').textContent=learned.length+' / '+questions.length+'개 기억 · '+chapter.evidenceTitle;
      var stateMark=summary.querySelector('.knowledge-state');
      stateMark.textContent=cleared?'CLEAR':'LEARNING';
      if(!cleared)stateMark.classList.add('learning');
      card.appendChild(summary);

      var body=document.createElement('div');
      body.className='knowledge-body';
      if(cleared){
        var core=document.createElement('div');
        core.className='knowledge-core';
        core.innerHTML='<span>클리어 핵심 근거</span><b></b><p></p>';
        core.querySelector('b').textContent=chapter.evidenceTitle;
        core.querySelector('p').textContent=chapter.evidenceText;
        body.appendChild(core);
      }
      var facts=document.createElement('div');
      facts.className='knowledge-facts';
      learned.forEach(function(question){
        var fact=document.createElement('article');
        fact.className='knowledge-fact';
        fact.innerHTML='<small></small><b></b><p></p>';
        fact.querySelector('small').textContent=question.prompt;
        fact.querySelector('b').textContent=question.fact;
        fact.querySelector('p').textContent=question.explanation;
        facts.appendChild(fact);
      });
      body.appendChild(facts);

      var replay=document.createElement('button');
      replay.type='button';
      replay.className='knowledge-replay';
      replay.textContent=cleared?'장면과 설전 다시 보기':'이 장 설전 계속하기';
      replay.addEventListener('click',function(){openChapter(index);});
      body.appendChild(replay);
      card.appendChild(body);
      list.appendChild(card);
    });
    empty.hidden=cardCount>0;
    var cards=list.querySelectorAll('.knowledge-card');
    if(cards.length)cards[cards.length-1].open=true;
    document.getElementById('knowledgeCount').textContent=state.answered.length;
    document.getElementById('knowledgeContinueButton').textContent=state.completed.length===STORY.length?'마지막 장면':'계속 학습하기';
    show('knowledge');
  }
  function openKnowledge(returnTo){
    knowledgeReturn=returnTo||'map';
    knowledgeLiveQuestion=knowledgeReturn==='story'&&!quizCard.hidden&&document.getElementById('feedback').hidden;
    renderKnowledge();
  }
  function closeKnowledge(){
    var target=knowledgeReturn==='knowledge'?'map':knowledgeReturn;
    show(target);
    if(target==='story'&&knowledgeLiveQuestion)renderQuestion(true);
    knowledgeLiveQuestion=false;
  }
  function showFinal(){updateHud();show('final');}

  nextButton.addEventListener('click',function(){
    if(run.phase==='intro')run.lineIndex++;else if(run.phase==='outro')run.lineIndex++;
    renderFlow();
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-tactic]'),function(button){
    button.addEventListener('click',function(){chooseTactic(button.dataset.tactic);});
  });
  document.getElementById('briefingStartButton').addEventListener('click',function(){run.phase='duel';renderFlow();});
  feedbackButton.addEventListener('click',function(){
    if(feedbackMode==='win')finishDuel(true);
    else if(feedbackMode==='lose')finishDuel(false);
    else renderQuestion();
  });
  document.getElementById('startButton').addEventListener('click',startFresh);
  document.getElementById('continueButton').addEventListener('click',continueStory);
  document.getElementById('mapButton').addEventListener('click',renderMap);
  document.getElementById('memoryButton').addEventListener('click',function(){openKnowledge('story');});
  document.getElementById('mapKnowledgeButton').addEventListener('click',function(){openKnowledge('map');});
  document.getElementById('mapHomeButton').addEventListener('click',function(){show('title');});
  document.getElementById('mapContinueButton').addEventListener('click',continueStory);
  document.getElementById('endMapButton').addEventListener('click',renderMap);
  document.getElementById('endKnowledgeButton').addEventListener('click',function(){openKnowledge('end');});
  document.getElementById('finalKnowledgeButton').addEventListener('click',function(){openKnowledge('final');});
  document.getElementById('knowledgeBackButton').addEventListener('click',closeKnowledge);
  document.getElementById('knowledgeContinueButton').addEventListener('click',continueStory);
  document.getElementById('nextChapterButton').addEventListener('click',function(){
    if(endMode==='retry')retryFromBriefing();
    else if(endMode==='final')showFinal();
    else openChapter(state.current+1);
  });
  document.getElementById('reviewButton').addEventListener('click',renderMap);
  document.getElementById('restartButton').addEventListener('click',function(){
    if(!window.confirm('모든 학습 기록과 평판을 지우고 처음부터 시작할까요?'))return;
    state=blankState();
    try{localStorage.removeItem(KEY);localStorage.removeItem(LEGACY_KEY);}catch(e){}
    document.getElementById('continueButton').hidden=true;
    updateHud();
    show('title');
  });
  var dialog=document.getElementById('infoDialog');
  document.getElementById('sourcesButton').addEventListener('click',function(){dialog.showModal();});
  document.addEventListener('keydown',function(event){
    if(screens.story.hidden)return;
    if(!quizCard.hidden&&['1','2','3','4'].indexOf(event.key)>=0){
      var choices=quizCard.querySelectorAll('.choice:not(:disabled)');
      var index=Number(event.key)-1;
      if(choices[index])choices[index].click();
    }else if((event.key==='Enter'||event.key===' ')&&!dialogueCard.hidden){event.preventDefault();nextButton.click();}
  });

  updateHud();
  preloadPortraits();
})();
