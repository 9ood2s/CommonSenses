(function(){
  'use strict';

  var KEY='commonsenses.longest-generation.v2',SCHEMA=2;
  var screens={
    title:document.getElementById('titleScreen'),map:document.getElementById('mapScreen'),
    knowledge:document.getElementById('knowledgeScreen'),story:document.getElementById('storyScreen'),
    end:document.getElementById('chapterEndScreen'),final:document.getElementById('finalScreen')
  };
  var topbar=document.getElementById('topbar');
  var portrait=document.getElementById('portrait');
  var portraitShell=document.getElementById('portraitShell');
  var sceneBackdrop=document.getElementById('sceneBackdrop');
  var sceneBackdropImage=document.getElementById('sceneBackdropImage');
  var sceneBackdropCaption=document.getElementById('sceneBackdropCaption');
  var dialogueCard=document.getElementById('dialogueCard');
  var decisionCard=document.getElementById('decisionCard');
  var duelIntro=document.getElementById('duelIntro');
  var briefingCard=document.getElementById('briefingCard');
  var quizCard=document.getElementById('quizCard');
  var dialogueText=document.getElementById('dialogueText');
  var nextButton=document.getElementById('nextButton');
  var feedbackButton=document.getElementById('feedbackButton');
  var timerId=null,run=null,endMode='next',feedbackMode='next',knowledgeReturn='map',knowledgeLiveQuestion=false;
  var scenePreloads={},sceneCurrentAct=1,sceneSwapToken=0;

  function blankState(){return{schema:SCHEMA,storyLength:STORY.length,started:false,current:0,unlocked:0,completed:[],answered:[],attempted:[],status:30,wins:0,losses:0,decisions:{},routes:{record:0,love:0,status:0,honor:0,survival:0}};}
  function normalizeState(data){
    if(!data||data.schema!==SCHEMA||Number(data.storyLength)!==STORY.length||!Array.isArray(data.completed)||!Array.isArray(data.answered))return blankState();
    data.current=Math.max(0,Math.min(STORY.length-1,Number(data.current)||0));
    data.unlocked=Math.max(0,Math.min(STORY.length-1,Number(data.unlocked)||0));
    data.attempted=Array.isArray(data.attempted)?data.attempted.slice():data.answered.slice();
    data.status=Number.isFinite(Number(data.status))?Math.max(0,Math.min(100,Number(data.status))):30;
    data.wins=Number(data.wins)||data.completed.length;data.losses=Number(data.losses)||0;
    data.decisions=data.decisions&&typeof data.decisions==='object'?data.decisions:{};
    data.routes=data.routes&&typeof data.routes==='object'?data.routes:{};
    ['record','love','status','honor','survival'].forEach(function(key){data.routes[key]=Number(data.routes[key])||0;});
    return data;
  }
  function loadState(){try{var raw=localStorage.getItem(KEY);if(raw)return normalizeState(JSON.parse(raw));}catch(e){}return blankState();}
  var state=loadState();
  function saveState(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){}updateHud();}
  function rank(){
    if(state.status>=85)return'대대로 남은 명문';
    if(state.status>=65)return'고을이 믿는 장부';
    if(state.status>=45)return'살아남은 기록자';
    if(state.status>=25)return'무시당하는 연표쟁이';
    return'다음 겨울이 위태롭다';
  }
  function updateHud(){
    var total=totalQuestions();
    document.getElementById('memoryCount').textContent=state.answered.length;
    document.getElementById('knowledgeCount').textContent=state.answered.length;
    document.getElementById('reputationCount').textContent=state.status;
    document.getElementById('finalScore').textContent=state.answered.length+' / '+total;
    document.getElementById('finalReputation').textContent=state.status+' · '+rank();
    var memoryTotal=document.querySelector('.memory i'),knowledgeTotal=document.querySelector('.knowledge-score i');
    if(memoryTotal)memoryTotal.textContent='/ '+total;if(knowledgeTotal)knowledgeTotal.textContent='/ '+total;
  }
  function clearTimer(){if(timerId){clearInterval(timerId);timerId=null;}}
  function show(name){
    clearTimer();Object.keys(screens).forEach(function(k){screens[k].hidden=k!==name;});
    topbar.hidden=name!=='story';window.scrollTo(0,0);
  }
  function totalQuestions(){return STORY.reduce(function(sum,chapter){return sum+chapter.beats.filter(function(beat){return beat.type==='quiz';}).length;},0);}
  function hideStoryCards(){dialogueCard.hidden=true;decisionCard.hidden=true;duelIntro.hidden=true;briefingCard.hidden=true;quizCard.hidden=true;}
  function nextPlayable(){for(var i=0;i<STORY.length;i++){if(state.completed.indexOf(i)<0&&i<=state.unlocked)return i;}return STORY.length-1;}
  function makeRun(chapter){
    var firstQuiz=chapter.beats.findIndex(function(b){return b.type==='quiz';});
    var lastQuiz=-1;chapter.beats.forEach(function(b,i){if(b.type==='quiz')lastQuiz=i;});
    return{
      intro:chapter.beats.slice(0,firstQuiz).filter(function(b){return b.type==='line';}),
      outro:chapter.beats.slice(lastQuiz+1).filter(function(b){return b.type==='line';}),
      questions:chapter.beats.filter(function(b){return b.type==='quiz';}),
      phase:'intro',lineIndex:0,qCursor:0,currentQuestion:null,foeHp:100,trust:100,trustMax:100,
      right:0,wrong:0,timeouts:0,tactic:null,timeBonus:0,statusShield:false,statusStart:state.status,decisionDone:!!state.decisions[chapter.no],pendingDecision:null,
      currentRemaining:0,choiceOrder:null,sceneDate:chapter.date,scenePlace:chapter.place
    };
  }
  function startFresh(){
    if(state.started&&!window.confirm('저장된 생존 기록을 지우고 처음부터 시작할까요?'))return;
    state=blankState();state.started=true;saveState();openChapter(0);
  }
  function continueStory(){if(state.completed.length===STORY.length){showFinal();return;}openChapter(nextPlayable());}

  function sceneEntries(){
    var catalog=window.ACT_SCENES||{};
    return Object.keys(catalog).sort(function(a,b){return Number(a)-Number(b);}).map(function(key){return catalog[key];}).filter(function(scene){return scene&&scene.src;});
  }
  function preloadSceneAsset(scene,priority){
    if(!scene||!scene.src)return Promise.resolve(false);
    if(scenePreloads[scene.src]){
      if(priority&&scenePreloads[scene.src].image&&'fetchPriority' in scenePreloads[scene.src].image)scenePreloads[scene.src].image.fetchPriority='high';
      return scenePreloads[scene.src].promise;
    }
    var img=new Image(),settled=false;
    img.decoding='async';if('fetchPriority' in img)img.fetchPriority=priority?'high':'low';
    var promise=new Promise(function(resolve){
      function finish(ok){
        if(settled)return;settled=true;
        if(ok&&img.decode)img.decode().then(function(){resolve(true);}).catch(function(){resolve(true);});else resolve(ok);
      }
      img.onload=function(){finish(true);};img.onerror=function(){finish(false);};img.src=scene.src;
      if(img.complete)finish(img.naturalWidth>0);
    });
    scenePreloads[scene.src]={image:img,promise:promise};return promise;
  }
  function preloadNextScene(act){
    var next=(window.ACT_SCENES||{})[Number(act)+1];if(next)preloadSceneAsset(next,false);
  }
  function setSceneBackdrop(chapter){
    if(!sceneBackdrop||!sceneBackdropImage||!sceneBackdropCaption)return;
    var presentScene=/^2026(?:\D|$)/.test(String(chapter&&chapter.date||''));
    sceneBackdrop.hidden=presentScene;
    if(sceneBackdrop.parentNode)sceneBackdrop.parentNode.classList.toggle('present-stage',presentScene);
    if(presentScene){sceneCurrentAct=null;return;}
    var act=Number(chapter&&chapter.act)||1,scene=(window.CHAPTER_SCENES||{})[Number(chapter&&chapter.no)]||(window.ACT_SCENES||{})[act];
    if(!scene)return;
    if(sceneCurrentAct===act&&sceneBackdropImage.getAttribute('src')===scene.src){
      sceneBackdrop.dataset.act=String(act);sceneBackdropImage.alt=scene.alt||'';sceneBackdropCaption.textContent=scene.caption||'';preloadNextScene(act);return;
    }
    var token=++sceneSwapToken;sceneBackdrop.classList.add('is-changing');
    preloadSceneAsset(scene,true).then(function(loaded){
      if(token!==sceneSwapToken)return;
      if(!loaded){sceneBackdrop.classList.remove('is-changing');return;}
      sceneBackdropImage.src=scene.src;sceneBackdropImage.alt=scene.alt||'';sceneBackdropCaption.textContent=scene.caption||'';
      sceneBackdrop.dataset.act=String(act);sceneCurrentAct=act;
      preloadNextScene(act);
      requestAnimationFrame(function(){if(token===sceneSwapToken)sceneBackdrop.classList.remove('is-changing');});
    });
  }
  function preloadPortraits(){
    var criticalKeys=['jun-present'];
    var critical=[];criticalKeys.forEach(function(key){
      var item=CHARACTERS[key];if(item&&critical.indexOf(item.src)<0)critical.push(item.src);
    });
    var scenes=sceneEntries(),loaded=0,criticalTotal=critical.length,loadState=document.getElementById('loadState');
    function markLoaded(){loaded++;loadState.textContent='필수 이미지 '+loaded+' / '+criticalTotal;}
    function preloadPortraitAsset(src,priority){return new Promise(function(resolve){
      var img=new Image();
      img.onload=function(){var done=function(){markLoaded();resolve();};if(img.decode)img.decode().then(done).catch(done);else done();};
      img.onerror=function(){markLoaded();resolve();};img.decoding='async';
      if('fetchPriority' in img)img.fetchPriority=priority?'high':'low';img.src=src;
    });}
    var jobs=critical.map(function(src){return preloadPortraitAsset(src,true);});
    return Promise.allSettled(jobs).then(function(){
      loadState.textContent='준비 완료 · '+ACT_INFO.length+'막 '+STORY.length+'장 · 인생 선택 '+Object.keys(window.DECISION_INDEX||{}).length+'회 · 고유 '+totalQuestions()+'문항';
      document.getElementById('startButton').disabled=false;
      if(state.started){
        document.getElementById('continueButton').hidden=false;
        document.getElementById('continueButton').textContent=state.completed.length===STORY.length?'바뀐 현재 보기':'이어하기 · '+String(nextPlayable()+1).padStart(2,'0')+'장';
      }
      var connection=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
      if(connection&&(connection.saveData||/^(?:slow-)?2g$|^3g$/.test(connection.effectiveType||'')))return;
      var warm=function(){
        ['taeseong-present','jun-child-stubborn'].forEach(function(key){
          var item=CHARACTERS[key];if(!item)return;var img=new Image();img.decoding='async';if('fetchPriority' in img)img.fetchPriority='low';img.src=item.src;
        });
        if(scenes[0])preloadSceneAsset(scenes[0],false);
      };
      if('requestIdleCallback' in window)window.requestIdleCallback(warm,{timeout:2500});else window.setTimeout(warm,500);
    });
  }
  function setPortrait(key,name,role){
    var c=CHARACTERS[key]||CHARACTERS['jun-young'];portraitShell.dataset.person=c.person;
    portraitShell.classList.toggle('is-wide',!!c.wide);
    if(portrait.getAttribute('src')!==c.src)portrait.setAttribute('src',c.src);
    portrait.alt=c.alt;document.getElementById('speaker').textContent=name||c.name;document.getElementById('speakerRole').textContent=role||c.role;
  }
  var explicitLinePortraits={
    'jun-present':true,
    'jun-child-confused':true,'jun-child-stubborn':true,
    'jun-teen-worried':true,'jun-teen-determined':true,
    'jun-young-awkward':true,'jun-young-protect':true,
    'jun-clerk-young':true,
    'jun-middle-tired':true,'jun-middle-ledger':true,
    'jun-clerk-middle':true,
    'jun-mature-weary':true,'jun-mature-angry':true,
    'jun-steward-mature':true,
    'jun-old-soft':true,
    'yeonhwa-child':true,'yeonhwa-teen':true,'yeonhwa-young-tease':true,'yeonhwa-middle':true,'yeonhwa-old':true,'yeonsu-young':true,
    'taeseong-present':true,'taeseok-child':true,'taeseok-teen':true,'taeseok-mature':true,'taeseok-shaken':true,
    'extra-merchant':true,'extra-soldier':true,'extra-crowd':true,'extra-scholar':true
  };
  function lineSceneYear(beat,chapter){
    var source=String((beat&&beat.date)||(chapter&&chapter.date)||'');
    var matcher=/(?:^|\D)((?:15|16|20)\d{2})(?=\D|$)/g,match,years=[];
    while((match=matcher.exec(source)))years.push(Number(match[1]));
    return years.length?years[years.length-1]:null;
  }
  function lineCues(beat,chapter){
    return (
      String(beat&&beat.name||'')+' '+String(beat&&beat.role||'')+' '+
      String(beat&&beat.label||'')+' '+String(beat&&beat.text||'')+' '+
      String(chapter&&chapter.title||'')+' '+String(chapter&&chapter.summary||'')+' '+String(chapter&&chapter.place||'')
    ).replace(/<[^>]*>/g,' ');
  }
  function junAgeBand(year,key){
    if(year!==null&&year<1900){
      if(year<=1591)return'child';
      if(year<=1596)return'teen';
      if(year<=1615)return'young';
      if(year<=1623)return'middle';
      if(year<=1639)return'mature';
      return'old';
    }
    if(key==='jun-child')return'child';
    if(key==='jun-teen')return'teen';
    if(key==='jun-middle')return'middle';
    if(key==='jun-mature')return'mature';
    if(key==='jun-old')return'old';
    return'young';
  }
  function resolveJunLinePortrait(key,year,cues){
    var age=junAgeBand(year,key);
    if(age==='child'){
      return /고집|버티|결심|지키|살아|안\s*돼|거부|외치|반드시|끝까지|맞서|놓지|기록/.test(cues)?'jun-child-stubborn':'jun-child-confused';
    }
    if(age==='teen'){
      return /결심|지키|살리|준비|명부|장부|기록|적기|적었|베끼|나누|외치|맞서|끝까지|반드시/.test(cues)?'jun-teen-determined':'jun-teen-worried';
    }
    if(age==='young'){
      if(/연화|얼굴|손보다|고백|혼례|부끄|어색|썸|맞았|싫으면|편한 사람|잘생|말을 더듬|농담/.test(cues))return'jun-young-awkward';
      return /지키|살리|명부|장부|곡식|구휼|피란|가족|증거|기록|준비|공동|씨앗|베끼|계산|도장|수량/.test(cues)?'jun-young-protect':'jun-young-awkward';
    }
    if(age==='middle'){
      return /장부|명부|기록|베끼|도장|수량|곡식|셈|계산|문서|토지|세금|선혜|공물|색인|연표/.test(cues)?'jun-middle-ledger':'jun-middle-tired';
    }
    if(age==='mature'){
      return /분노|화를|화가|맞서|따졌|거부|외치|요구|안\s*된다|지켜|밀고|원수|죄증|목소리|침공|청군|봉화|부당|물러서|반드시/.test(cues)?'jun-mature-angry':'jun-mature-weary';
    }
    if(/웃|허풍|무용담|검성|백\s*명|닭|농담|놀리|재미|하하/.test(cues))return'jun-old';
    return /연화|아이|손주|자식|사람|이름|기억|미소|조용|눈물|미안|사랑|함께|살아|봄|약속|마지막|다정/.test(cues)?'jun-old-soft':'jun-old';
  }
  var junCrisisCues=/전쟁|전란|왜란|호란|피란|포위|기근|흉년|징발|침공|전투|청군|왜군|일본군|후금군|정유|정묘|병자|사르후|명량|노량|산성|봉화|항복|포로|군량|출정|군역|반란|반정|쿠데타|약탈|전사|부상|불탄|화약|군졸|병졸|죽|굶/;
  var junPeaceOfficeCues=/관아|서리|향리|호적|양안|양전|대동|선혜|문서|장부|세금|조세|공인|공물|방납|도장|수결|계산|기록|토지|납속|공명첩/;
  var junStableCues=/재건|곡식\s*창고|서당|향촌|속환|교육|가문|장부|구휼계|공동\s*창고|후손|학교|약방|마을|기록/;
  function junCrisisYear(year){return year!==null&&((year>=1592&&year<=1598)||year===1619||year===1624||year===1627||year===1636||year===1637);}
  function resolveJunCrisisPortrait(key,year,cues){
    var age=junAgeBand(year,key);
    if(age==='child')return /고집|버티|결심|지키|살아|거부|외치|반드시|끝까지|맞서/.test(cues)?'jun-child-stubborn':'jun-child-confused';
    if(age==='teen')return /결심|지키|살리|준비|명부|기록|베끼|외치|맞서|끝까지|반드시/.test(cues)?'jun-teen-determined':'jun-teen-worried';
    if(age==='young')return'jun-young-protect';
    if(age==='middle')return'jun-middle-tired';
    if(age==='mature')return /분노|화를|화가|맞서|따졌|거부|외치|요구|안\s*된다|지켜|밀고|원수|죄증|목소리|봉화|부당|물러서|반드시/.test(cues)?'jun-mature-angry':'jun-mature-weary';
    return'jun-old-soft';
  }
  function resolveLinePortrait(beat,chapter){
    var key=beat.char;
    if(explicitLinePortraits[key])return key;
    var year=lineSceneYear(beat,chapter),cues=lineCues(beat,chapter);
    if(key==='jun-young'||key==='jun-child'||key==='jun-teen'||key==='jun-middle'||key==='jun-mature'||key==='jun-old'){
      if(junCrisisYear(year)&&junCrisisCues.test(cues))return resolveJunCrisisPortrait(key,year,cues);
      if(year!==null&&year>=1598&&year<=1615&&junPeaceOfficeCues.test(cues))return'jun-clerk-young';
      if(year!==null&&year>=1616&&year<=1623&&junPeaceOfficeCues.test(cues))return'jun-clerk-middle';
      if(year!==null&&year>=1640&&junStableCues.test(cues))return'jun-steward-mature';
      return resolveJunLinePortrait(key,year,cues);
    }
    if(key==='yeonhwa'){
      var yeonhwaSpeaker=(String(beat&&beat.name||'')+' '+String(beat&&beat.role||'')).replace(/<[^>]*>/g,' ');
      if(/서연수|손녀|약방 후계자|속환계 서기/.test(yeonhwaSpeaker))return'yeonsu-young';
      if(year!==null&&year<=1591)return'yeonhwa-child';
      if(year!==null&&year<=1596)return'yeonhwa-teen';
      if(year!==null&&year>=1640)return'yeonhwa-old';
      if(year!==null&&year>=1616)return'yeonhwa-middle';
      return /놀리|웃|못생|얼굴|맞았|농담|허풍|닭|썸|짓궂|한\s*대|잘생|싫으면|말고/.test(cues)?'yeonhwa-young-tease':'yeonhwa';
    }
    if(key==='taeseok-past'){
      var taeseokSpeaker=(String(beat&&beat.name||'')+' '+String(beat&&beat.role||'')).replace(/<[^>]*>/g,' ');
      if(/류진명|손자|후손|사행 서기/.test(taeseokSpeaker))return'taeseok-shaken';
      if(year!==null&&year<=1591)return'taeseok-child';
      if(year!==null&&year<=1596)return'taeseok-teen';
      if(year!==null&&year>=1636)return'taeseok-mature';
      if(/몰락|부상|죽|잃|빚|부탁|패/.test(cues))return'taeseok-shaken';
    }
    if(key==='clerk'){
      var speakerCues=(String(beat&&beat.name||'')+' '+String(beat&&beat.role||'')).replace(/<[^>]*>/g,' ');
      if(/유생|선비|상소|척화|성리학자/.test(speakerCues))return'extra-scholar';
      if(/군졸|병졸|포수|군관|속오군|관군|의병|수비군/.test(speakerCues))return'extra-soldier';
      if(/상인|객주|장사꾼|사공|시전|상선|장돌뱅이/.test(speakerCues))return'extra-merchant';
      if(/피란민|군중|백성|귀환자|농민|짐꾼|장터 사람/.test(speakerCues))return'extra-crowd';
      if(/아전|서리|관리|담당|역관|나장|이방|관원|수령|별감|군량관|호패청|관아/.test(speakerCues))return'clerk';
      if(/유생|선비|상소|척화|성리학|명분|의리/.test(cues))return'extra-scholar';
      if(/군졸|병졸|포수|군관|속오군|관군|의병|수비군|장정/.test(cues))return'extra-soldier';
      if(/상인|객주|장사꾼|사공|방납|시전|상선|포구|장돌뱅이|저울|흥정/.test(cues))return'extra-merchant';
      if(/피란민|군중|백성|귀환자|농민|짐꾼|아이를 업|장터 사람/.test(cues))return'extra-crowd';
    }
    return key;
  }
  function setChapterHeader(chapter){
    document.getElementById('actLabel').textContent=chapter.act+'막';
    document.getElementById('chapterLabel').textContent=String(chapter.no).padStart(2,'0');
    document.getElementById('sceneNo').textContent=String(chapter.no).padStart(2,'0');
    document.getElementById('sceneDate').textContent=chapter.date;document.getElementById('scenePlace').textContent=chapter.place;document.getElementById('sceneTitle').textContent=chapter.title;setSceneBackdrop(chapter);
  }
  function openChapter(index){
    if(index>state.unlocked)return;state.started=true;state.current=index;run=makeRun(STORY[index]);saveState();setChapterHeader(STORY[index]);show('story');renderFlow();
  }
  function renderFlow(){
    clearTimer();
    if(run.phase==='intro'){
      if(run.lineIndex<run.intro.length){renderLine(run.intro[run.lineIndex]);updateTrack();return;}
      if(STORY[state.current].decision&&!run.decisionDone){renderDecision();return;}
      renderDuelIntro();return;
    }
    if(run.phase==='duel'){renderQuestion();return;}
    if(run.phase==='outro'){
      if(run.lineIndex<run.outro.length){renderLine(run.outro[run.lineIndex]);updateTrack();return;}completeChapter();
    }
  }
  function renderLine(beat){
    var chapter=STORY[state.current];hideStoryCards();dialogueCard.hidden=false;setPortrait(resolveLinePortrait(beat,chapter),beat.name,beat.role);
    if(beat.date)run.sceneDate=beat.date;if(beat.place)run.scenePlace=beat.place;
    document.getElementById('sceneDate').textContent=run.sceneDate||chapter.date;document.getElementById('scenePlace').textContent=run.scenePlace||chapter.place;
    document.getElementById('beatLabel').textContent=beat.label||'SCENE';dialogueText.innerHTML=beat.text;nextButton.textContent='계속';nextButton.focus({preventScroll:true});
  }
  function renderDuelIntro(){
    var chapter=STORY[state.current],duel=chapter.duel;hideStoryCards();duelIntro.hidden=false;
    setPortrait(resolveLinePortrait({char:duel.char,name:duel.name,role:duel.role,text:duel.quote},chapter),duel.name,duel.role);
    document.getElementById('duelRole').textContent=duel.role;document.getElementById('duelName').textContent=duel.name;
    document.getElementById('duelQuote').textContent='“'+duel.quote+'”';document.getElementById('chapterTrack').style.width='34%';
    var first=duelIntro.querySelector('button');if(first)first.focus({preventScroll:true});
  }
  function renderDecision(){
    var chapter=STORY[state.current],decision=chapter.decision;hideStoryCards();decisionCard.hidden=false;
    run.pendingDecision=null;
    setPortrait(resolveLinePortrait({char:decision.char||'jun-young',name:decision.name,role:decision.role,text:decision.context},chapter),decision.name,decision.role);
    var decisionNo=(window.DECISION_INDEX||{})[chapter.no]||chapter.act;
    document.getElementById('decisionLabel').textContent='LIFE CHOICE · '+decisionNo+'번째 인생 갈림길';
    document.getElementById('decisionTitle').textContent=decision.title;
    document.getElementById('decisionContext').textContent=decision.context;
    document.getElementById('decisionResult').hidden=true;document.getElementById('decisionContinueButton').disabled=true;
    var host=document.getElementById('decisionOptions');host.innerHTML='';
    decision.options.forEach(function(option){
      var button=document.createElement('button');button.type='button';button.className='decision-option';button.setAttribute('aria-pressed','false');
      button.innerHTML='<b></b><span></span>';button.querySelector('b').textContent=option.label;button.querySelector('span').textContent=option.description;
      button.addEventListener('click',function(){chooseDecision(option,button);});host.appendChild(button);
    });
    document.getElementById('chapterTrack').style.width='33%';var first=host.querySelector('button');if(first)first.focus({preventScroll:true});
  }
  function chooseDecision(option,button){
    if(state.decisions[STORY[state.current].no])return;
    run.pendingDecision=option;
    [].slice.call(document.querySelectorAll('.decision-option')).forEach(function(item){item.classList.remove('chosen');item.setAttribute('aria-pressed','false');});
    button.classList.add('chosen');button.setAttribute('aria-pressed','true');
    document.getElementById('decisionResultTitle').textContent=option.resultTitle;
    document.getElementById('decisionResultText').textContent=option.result;
    document.getElementById('decisionResult').hidden=false;document.getElementById('decisionContinueButton').disabled=false;
  }
  function confirmDecision(){
    var chapter=STORY[state.current],option=run&&run.pendingDecision;
    if(!option||state.decisions[chapter.no])return;
    state.decisions[chapter.no]=option.id;
    Object.keys(option.effects||{}).forEach(function(key){state.routes[key]=(Number(state.routes[key])||0)+Number(option.effects[key]||0);});
    saveState();run.pendingDecision=null;run.decisionDone=true;renderDuelIntro();
  }
  function chooseTactic(tactic){
    run.tactic=tactic;if(tactic==='trust')run.statusShield=true;else run.timeBonus=6;renderBriefing();
  }
  function renderBriefing(){
    var chapter=STORY[state.current];hideStoryCards();briefingCard.hidden=false;
    var briefingKey=chapter.no===1?'jun-present':'jun-young';
    setPortrait(resolveLinePortrait({char:briefingKey,text:chapter.summary||'',label:'문제 범위 브리핑'},chapter));
    document.getElementById('briefingTitle').textContent=chapter.evidenceTitle;
    document.getElementById('briefingSub').textContent=chapter.title+' · 설전 전에 확인할 근거';
    var body=document.getElementById('briefingBody');body.innerHTML='';
    var items=[{title:'큰 흐름',text:chapter.evidenceText}];
    run.questions.forEach(function(q){items.push({title:q.fact,text:q.explanation});});
    items.forEach(function(item,index){
      var div=document.createElement('div');div.className='briefing-item';div.innerHTML='<span>'+String(index+1).padStart(2,'0')+'</span><div><b></b><p></p></div>';
      div.querySelector('b').textContent=item.title;div.querySelector('p').textContent=item.text;body.appendChild(div);
    });
    var seconds=baseTime()+run.timeBonus;
    document.getElementById('briefingRule').textContent='상대 고집 100 · 내 생존력 '+run.trust+' · 문제당 '+seconds+'초'+(run.timeBonus?'(첫 문제만)':'')+(run.statusShield?' · 첫 실수 명망 벌점 4 감소':'')+' · 오답·시간 초과 시 생존력과 가문 명망 하락';
    document.getElementById('chapterTrack').style.width='42%';document.getElementById('briefingStartButton').focus({preventScroll:true});
  }
  function baseTime(){return Math.max(18,26-STORY[state.current].act*2);}
  function renderQuestion(reuseCurrent){
    clearTimer();var chapter=STORY[state.current],duel=chapter.duel;
    var beat=reuseCurrent&&run.currentQuestion?run.currentQuestion:run.questions[run.qCursor++];run.currentQuestion=beat;
    hideStoryCards();quizCard.hidden=false;
    setPortrait(resolveLinePortrait({char:duel.char,name:duel.name,role:duel.role,text:duel.quote},chapter),duel.name,duel.role);
    document.getElementById('quizLabel').textContent='설전 · '+(run.right+run.wrong+1)+'번째 근거 · '+beat.label;
    document.getElementById('quizPrompt').textContent=beat.prompt;document.getElementById('quizContext').textContent=beat.context;
    document.getElementById('feedback').hidden=true;document.getElementById('foeStatusName').textContent=duel.name+'의 고집';updateDuelHud();
    var order=reuseCurrent&&Array.isArray(run.choiceOrder)?run.choiceOrder.slice():beat.choices.map(function(_,i){return i;});
    if(!reuseCurrent){order.sort(function(){return Math.random()-.5;});run.choiceOrder=order.slice();}
    var choices=document.getElementById('choices');choices.innerHTML='';
    order.forEach(function(originalIndex,displayIndex){
      var button=document.createElement('button');button.type='button';button.className='choice';button.dataset.answer=originalIndex;
      button.innerHTML='<span class="key">'+String.fromCharCode(65+displayIndex)+'</span><span></span>';button.lastChild.textContent=beat.choices[originalIndex];
      button.addEventListener('click',function(){answerQuestion(originalIndex,button,false);});choices.appendChild(button);
    });
    var limit=reuseCurrent&&run.currentRemaining>0?run.currentRemaining:baseTime();if(!reuseCurrent&&run.timeBonus){limit+=run.timeBonus;run.timeBonus=0;}startTimer(limit);
    var first=choices.querySelector('button');if(first)first.focus({preventScroll:true});
  }
  function startTimer(limit){
    var remaining=limit,number=document.getElementById('timerNumber'),bar=document.getElementById('timerBar'),numberWrap=number.parentNode;run.currentRemaining=remaining;
    function paint(){number.textContent=remaining;bar.style.width=Math.max(0,remaining/limit*100)+'%';bar.classList.toggle('danger',remaining<=6);numberWrap.classList.toggle('danger',remaining<=6);}
    paint();timerId=setInterval(function(){remaining--;run.currentRemaining=remaining;paint();if(remaining<=0){clearTimer();answerQuestion(-1,null,true);}},1000);
  }
  function changeStatus(delta){state.status=Math.max(0,Math.min(100,state.status+delta));saveState();}
  function answerQuestion(choice,button,timedOut){
    clearTimer();run.currentRemaining=0;var beat=run.currentQuestion,buttons=[].slice.call(document.querySelectorAll('.choice'));buttons.forEach(function(b){b.disabled=true;});
    var correct=choice===beat.answer,correctButton=buttons.find(function(b){return Number(b.dataset.answer)===beat.answer;});
    if(correct){
      var damage=Math.ceil(100/run.questions.length);button.classList.add('correct');run.foeHp=Math.max(0,run.foeHp-damage);run.right++;changeStatus(3);
      if(state.answered.indexOf(beat.id)<0)state.answered.push(beat.id);
    }else{
      if(button)button.classList.add('wrong');if(correctButton)correctButton.classList.add('correct');run.trust=Math.max(0,run.trust-45);run.wrong++;if(timedOut)run.timeouts++;
      var penalty=timedOut?-7:-5;if(run.statusShield){penalty+=4;run.statusShield=false;}changeStatus(penalty);
    }
    if(state.attempted.indexOf(beat.id)<0)state.attempted.push(beat.id);saveState();updateDuelHud();
    document.getElementById('feedback').hidden=false;
    document.getElementById('feedbackTitle').textContent=correct?'근거가 남았다 · 상대 고집 −'+Math.ceil(100/run.questions.length):timedOut?'시간 초과 · 생존력 −45':'반박당했다 · 생존력 −45';
    document.getElementById('feedbackText').textContent=(correct?'가문 명망 +3. ':'가문 명망 −'+Math.abs(penalty)+'. ')+beat.explanation;
    document.getElementById('feedbackFact').textContent=beat.fact;
    if(run.foeHp<=0)feedbackMode='win';else if(run.trust<=0||run.qCursor>=run.questions.length)feedbackMode='lose';else feedbackMode='next';
    feedbackButton.textContent=feedbackMode==='win'?'오늘을 넘긴다':feedbackMode==='lose'?'패배 확인':'다음 근거';feedbackButton.focus({preventScroll:true});
  }
  function updateDuelHud(){
    document.getElementById('foeBar').style.width=run.foeHp+'%';document.getElementById('foeHp').textContent=run.foeHp+' / 100';
    document.getElementById('trustBar').style.width=Math.max(0,run.trust/run.trustMax*100)+'%';document.getElementById('trustHp').textContent=run.trust+' / '+run.trustMax;
  }
  function finishDuel(win){
    clearTimer();if(win){state.wins++;run.phase='outro';run.lineIndex=0;saveState();renderFlow();}else{state.losses++;saveState();failChapter();}
  }
  function updateTrack(){
    var p=run.phase==='intro'?(run.intro.length?run.lineIndex/run.intro.length*32:32):75+(run.outro.length?run.lineIndex/run.outro.length*24:24);
    document.getElementById('chapterTrack').style.width=Math.min(99,Math.round(p))+'%';
  }
  function resultStats(){
    var delta=state.status-run.statusStart;return'<span>정답 '+run.right+'</span><span>오답 '+run.wrong+'</span><span>시간 초과 '+run.timeouts+'</span><span>명망 '+(delta>=0?'+':'')+delta+' · '+state.status+'</span><span>'+rank()+'</span>';
  }
  function completeChapter(){
    var i=state.current,chapter=STORY[i];if(state.completed.indexOf(i)<0)state.completed.push(i);if(i<STORY.length-1)state.unlocked=Math.max(state.unlocked,i+1);saveState();
    screens.end.classList.remove('failed');document.querySelector('.end-mark').textContent='生';
    document.getElementById('completeAct').textContent=chapter.act+'막 · '+String(chapter.no).padStart(2,'0')+'장 · 오늘 생존';
    document.getElementById('completeTitle').textContent=chapter.title;document.getElementById('completeSummary').textContent=chapter.summary;document.getElementById('endStats').innerHTML=resultStats();
    document.getElementById('evidenceTitle').textContent=chapter.evidenceTitle;document.getElementById('evidenceText').textContent=chapter.evidenceText;
    var preview=document.getElementById('nextChapterPreview'),next=STORY[i+1];
    if(next){preview.hidden=false;document.getElementById('nextChapterMeta').textContent='다음 장면 · '+next.date+' · '+next.place;document.getElementById('nextChapterTitle').textContent=String(next.no).padStart(2,'0')+'장 · '+next.title;document.getElementById('nextChapterSummary').textContent=next.summary;}
    else preview.hidden=true;
    endMode=i===STORY.length-1?'final':'next';document.getElementById('nextChapterButton').textContent=endMode==='final'?'바뀐 현재로':'다음 장면으로';show('end');
  }
  function failChapter(){
    var chapter=STORY[state.current];screens.end.classList.add('failed');document.querySelector('.end-mark').textContent='死';
    document.getElementById('nextChapterPreview').hidden=true;
    document.getElementById('completeAct').textContent=chapter.act+'막 · '+String(chapter.no).padStart(2,'0')+'장 · 생존 실패';
    document.getElementById('completeTitle').textContent='연표만으로는 부족했다';
    document.getElementById('completeSummary').textContent='서로 다른 세 근거를 모두 지키지 못했다. 다음 장은 해금되지 않는다. 사료 브리핑부터 다시 읽고 재도전해야 한다.';
    document.getElementById('endStats').innerHTML=resultStats();document.getElementById('evidenceTitle').textContent=chapter.evidenceTitle;document.getElementById('evidenceText').textContent=chapter.evidenceText;
    endMode='retry';document.getElementById('nextChapterButton').textContent='브리핑부터 재도전';show('end');
  }
  function retryFromBriefing(){
    var tactic=run&&run.tactic?run.tactic:'trust';run=makeRun(STORY[state.current]);run.tactic=tactic;
    if(tactic==='trust')run.statusShield=true;else run.timeBonus=6;setChapterHeader(STORY[state.current]);show('story');renderBriefing();
  }
  function renderMap(){
    var wrap=document.getElementById('actList');wrap.innerHTML='';
    ACT_INFO.forEach(function(act){
      var block=document.createElement('section');block.className='act-block';var head=document.createElement('div');head.className='act-heading';head.innerHTML='<b>'+act.no+'막</b><div><h3></h3><p></p></div>';head.querySelector('h3').textContent=act.title;head.querySelector('p').textContent=act.subtitle;
      var grid=document.createElement('div');grid.className='episode-grid';
      STORY.forEach(function(chapter,index){if(chapter.act!==act.no)return;var btn=document.createElement('button');btn.type='button';btn.className='episode-button';
        if(state.completed.indexOf(index)>=0)btn.classList.add('done');if(index===nextPlayable()&&state.completed.length<STORY.length)btn.classList.add('current');btn.disabled=index>state.unlocked;
        btn.innerHTML='<span>'+String(chapter.no).padStart(2,'0')+'</span><div><b></b><small></small></div>';btn.querySelector('b').textContent=chapter.title;
        btn.querySelector('small').textContent=index>state.unlocked?'잠김':state.completed.indexOf(index)>=0?'생존 · 다시 보기':chapter.duel.name+'과의 설전';btn.addEventListener('click',function(){openChapter(index);});grid.appendChild(btn);
      });
      block.appendChild(head);block.appendChild(grid);wrap.appendChild(block);
    });
    document.getElementById('mapContinueButton').textContent=state.completed.length===STORY.length?'바뀐 현재':'계속 · '+String(nextPlayable()+1).padStart(2,'0')+'장';show('map');
  }
  function renderKnowledge(returnTo){
    if(returnTo)knowledgeReturn=returnTo;var list=document.getElementById('knowledgeList'),empty=document.getElementById('knowledgeEmpty');list.innerHTML='';var cardCount=0;
    STORY.forEach(function(chapter,index){
      var questions=chapter.beats.filter(function(b){return b.type==='quiz';}),learned=questions.filter(function(q){return state.answered.indexOf(q.id)>=0;}),cleared=state.completed.indexOf(index)>=0;if(!cleared&&!learned.length)return;cardCount++;
      var card=document.createElement('details');card.className='knowledge-card';var summary=document.createElement('summary');summary.innerHTML='<span class="knowledge-no"></span><span><b></b><small></small></span><em class="knowledge-state"></em>';
      summary.querySelector('.knowledge-no').textContent=chapter.act+'막 · '+String(chapter.no).padStart(2,'0')+'장';summary.querySelector('b').textContent=chapter.title;summary.querySelector('small').textContent=learned.length+' / '+questions.length+'개 근거 · '+chapter.evidenceTitle;
      var mark=summary.querySelector('.knowledge-state');mark.textContent=cleared?'CLEAR':'LEARNING';if(!cleared)mark.classList.add('learning');card.appendChild(summary);
      var body=document.createElement('div');body.className='knowledge-body';
      if(cleared){var core=document.createElement('div');core.className='knowledge-core';core.innerHTML='<span>클리어 핵심 근거</span><b></b><p></p>';core.querySelector('b').textContent=chapter.evidenceTitle;core.querySelector('p').textContent=chapter.evidenceText;body.appendChild(core);}
      var facts=document.createElement('div');facts.className='knowledge-facts';learned.forEach(function(q){var fact=document.createElement('article');fact.className='knowledge-fact';fact.innerHTML='<small></small><b></b><p></p>';fact.querySelector('small').textContent=q.prompt;fact.querySelector('b').textContent=q.fact;fact.querySelector('p').textContent=q.explanation;facts.appendChild(fact);});body.appendChild(facts);
      var replay=document.createElement('button');replay.type='button';replay.className='knowledge-replay';replay.textContent=cleared?'장면과 설전 다시 보기':'이 장 설전 계속하기';replay.addEventListener('click',function(){openChapter(index);});body.appendChild(replay);card.appendChild(body);list.appendChild(card);
    });
    empty.hidden=cardCount>0;var cards=list.querySelectorAll('.knowledge-card');if(cards.length)cards[cards.length-1].open=true;document.getElementById('knowledgeCount').textContent=state.answered.length;document.getElementById('knowledgeContinueButton').textContent=state.completed.length===STORY.length?'바뀐 현재':'계속 살아남기';show('knowledge');
  }
  function openKnowledge(returnTo){knowledgeReturn=returnTo||'map';knowledgeLiveQuestion=knowledgeReturn==='story'&&!quizCard.hidden&&document.getElementById('feedback').hidden;renderKnowledge();}
  function closeKnowledge(){var target=knowledgeReturn==='knowledge'?'map':knowledgeReturn;show(target);if(target==='story'&&knowledgeLiveQuestion)renderQuestion(true);knowledgeLiveQuestion=false;}
  function endingKey(){
    var order=['record','love','status','honor','survival'],caps={record:0,love:0,status:0,honor:0,survival:0};
    STORY.forEach(function(chapter){if(!chapter.decision)return;order.forEach(function(key){caps[key]+=Math.max.apply(null,chapter.decision.options.map(function(option){return Number(option.effects&&option.effects[key])||0;}));});});
    var normalized={};order.forEach(function(key){normalized[key]=(Number(state.routes[key])||0)/caps[key];});
    var score=Math.max.apply(null,order.map(function(key){return normalized[key];}));
    var leaders=order.filter(function(key){return Math.abs(normalized[key]-score)<0.000001;});
    if(leaders.length===1)return leaders[0];
    var chapters=Object.keys(state.decisions||{}).map(Number).sort(function(a,b){return b-a;});
    for(var i=0;i<chapters.length;i++){
      var selected=String(state.decisions[chapters[i]]||''),route=selected.split('-').pop();
      if(leaders.indexOf(route)>=0)return route;
    }
    return leaders[0]||'survival';
  }
  function showFinal(){
    updateHud();var ending=window.ENDINGS&&window.ENDINGS[endingKey()];
    if(ending){
      var endingPortrait=CHARACTERS[ending.portrait]||CHARACTERS['jun-present'];
      var finalPortrait=document.querySelector('.final-visual img');
      var finalVisual=document.querySelector('.final-visual');
      if(finalVisual)finalVisual.classList.toggle('is-wide',!!endingPortrait.wide);
      if(finalPortrait&&endingPortrait){finalPortrait.src=endingPortrait.src;finalPortrait.alt=endingPortrait.alt;}
      document.getElementById('finalEyebrow').textContent='ENDING · '+ending.label+' · 2026.09.21';
      document.getElementById('finalTitle').innerHTML=ending.title;
      document.getElementById('finalText').textContent=ending.text;
      document.getElementById('finalQuote').textContent='“'+ending.quote+'”';
      document.querySelector('.final-visual span').textContent=ending.visual;
    }
    show('final');
  }

  nextButton.addEventListener('click',function(){if(run.phase==='intro')run.lineIndex++;else if(run.phase==='outro')run.lineIndex++;renderFlow();});
  Array.prototype.forEach.call(document.querySelectorAll('[data-tactic]'),function(button){button.addEventListener('click',function(){chooseTactic(button.dataset.tactic);});});
  document.getElementById('briefingStartButton').addEventListener('click',function(){run.phase='duel';renderFlow();});
  document.getElementById('decisionContinueButton').addEventListener('click',confirmDecision);
  feedbackButton.addEventListener('click',function(){if(feedbackMode==='win')finishDuel(true);else if(feedbackMode==='lose')finishDuel(false);else renderQuestion();});
  document.getElementById('startButton').addEventListener('click',startFresh);document.getElementById('continueButton').addEventListener('click',continueStory);
  document.getElementById('mapButton').addEventListener('click',renderMap);document.getElementById('memoryButton').addEventListener('click',function(){openKnowledge('story');});
  document.getElementById('mapKnowledgeButton').addEventListener('click',function(){openKnowledge('map');});document.getElementById('mapHomeButton').addEventListener('click',function(){show('title');});document.getElementById('mapContinueButton').addEventListener('click',continueStory);
  document.getElementById('endMapButton').addEventListener('click',renderMap);document.getElementById('endKnowledgeButton').addEventListener('click',function(){openKnowledge('end');});document.getElementById('finalKnowledgeButton').addEventListener('click',function(){openKnowledge('final');});
  document.getElementById('knowledgeBackButton').addEventListener('click',closeKnowledge);document.getElementById('knowledgeContinueButton').addEventListener('click',continueStory);
  document.getElementById('nextChapterButton').addEventListener('click',function(){if(endMode==='retry')retryFromBriefing();else if(endMode==='final')showFinal();else openChapter(state.current+1);});
  document.getElementById('reviewButton').addEventListener('click',renderMap);document.getElementById('restartButton').addEventListener('click',function(){if(!window.confirm('모든 생존 기록과 가문 명망을 지우고 처음부터 시작할까요?'))return;state=blankState();try{localStorage.removeItem(KEY);}catch(e){}document.getElementById('continueButton').hidden=true;updateHud();show('title');});
  var dialog=document.getElementById('infoDialog');document.getElementById('sourcesButton').addEventListener('click',function(){dialog.showModal();});
  document.addEventListener('keydown',function(event){if(screens.story.hidden)return;if(!quizCard.hidden&&['1','2','3','4'].indexOf(event.key)>=0){var choices=quizCard.querySelectorAll('.choice:not(:disabled)'),index=Number(event.key)-1;if(choices[index])choices[index].click();}else if((event.key==='Enter'||event.key===' ')&&!dialogueCard.hidden){event.preventDefault();nextButton.click();}});

  updateHud();preloadPortraits();
})();
