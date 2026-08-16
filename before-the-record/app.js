(function () {
  'use strict';

  var STORY = window.BEFORE_RECORD_STORY || [];
  var STORAGE_KEY = 'commonsenses.before-the-record.v3';
  var PASS_SCORE = 8;
  var CORRECT_DAMAGE = 13;
  var screens = {
    title: document.getElementById('titleScreen'),
    vault: document.getElementById('vaultScreen'),
    story: document.getElementById('storyScreen'),
    artifact: document.getElementById('artifactScreen'),
    reconstruction: document.getElementById('reconstructionScreen'),
    duel: document.getElementById('duelScreen'),
    result: document.getElementById('resultScreen'),
    memory: document.getElementById('memoryScreen'),
    final: document.getElementById('finalScreen')
  };
  var topbar = document.getElementById('topbar');
  var currentScreen = 'title';
  var memoryReturn = 'vault';
  var timerId = null;
  var run = null;

  function blankState() {
    return {
      started: false,
      current: 0,
      unlocked: 0,
      completed: [],
      learned: [],
      reputation: 50,
      wins: 0,
      losses: 0,
      finished: false
    };
  }

  function normalizeState(raw) {
    if (!raw || !Array.isArray(raw.completed) || !Array.isArray(raw.learned)) return blankState();
    raw.started = Boolean(raw.started);
    raw.current = clamp(Number(raw.current) || 0, 0, STORY.length - 1);
    raw.unlocked = clamp(Number(raw.unlocked) || 0, 0, STORY.length - 1);
    raw.completed = raw.completed.filter(function (value, index, list) {
      return Number.isInteger(value) && value >= 0 && value < STORY.length && list.indexOf(value) === index;
    });
    var validIds = allQuestionIds();
    raw.learned = raw.learned.filter(function (value, index, list) {
      return validIds.indexOf(value) >= 0 && list.indexOf(value) === index;
    });
    raw.reputation = clamp(Number(raw.reputation) || 0, 0, 100);
    raw.wins = Number(raw.wins) || 0;
    raw.losses = Number(raw.losses) || 0;
    raw.finished = Boolean(raw.finished);
    return raw;
  }

  function loadState() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return normalizeState(JSON.parse(saved));
    } catch (error) {}
    return blankState();
  }

  var state = loadState();

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (error) {}
    updateHud();
  }

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

  function allQuestionIds() {
    return STORY.reduce(function (ids, lesson) {
      return ids.concat(lesson.questions.map(function (question) { return question.id; }));
    }, []);
  }

  function clearTimer() {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  function show(name) {
    clearTimer();
    Object.keys(screens).forEach(function (key) { screens[key].hidden = key !== name; });
    currentScreen = name;
    topbar.hidden = name === 'title' || name === 'final';
    window.scrollTo(0, 0);
  }

  function lesson() { return STORY[state.current] || STORY[0]; }

  function setPhase(no, label) {
    var item = lesson();
    document.getElementById('topEra').textContent = item ? item.era : '0호 수장고';
    document.getElementById('topTitle').textContent = item ? item.title : '기록 이전';
    document.getElementById('phaseNo').textContent = String(no).padStart(2, '0');
    document.getElementById('phaseLabel').textContent = label;
  }

  function updateHud() {
    document.getElementById('reputationCount').textContent = state.reputation;
    document.getElementById('memoryCount').textContent = state.learned.length;
    document.getElementById('memoryTotal').textContent = '/ ' + allQuestionIds().length;
    document.getElementById('memorySummaryQuestions').textContent = state.learned.length + ' / ' + allQuestionIds().length;
    document.getElementById('memorySummaryLessons').textContent = state.completed.length + ' / ' + STORY.length;
    document.getElementById('memorySummaryReputation').textContent = state.reputation;
    document.getElementById('continueButton').hidden = !state.started;
    document.getElementById('startButton').textContent = state.started ? '처음부터 다시' : '0호 수장고 열기';
  }

  function nextPlayable() {
    for (var index = 0; index < STORY.length; index += 1) {
      if (index <= state.unlocked && state.completed.indexOf(index) < 0) return index;
    }
    return clamp(state.current, 0, STORY.length - 1);
  }

  function renderVault() {
    var list = document.getElementById('lessonList');
    list.innerHTML = '';
    STORY.forEach(function (item, index) {
      var done = state.completed.indexOf(index) >= 0;
      var open = index <= state.unlocked || done;
      var current = !done && index === nextPlayable();
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'lesson-card' + (done ? ' done' : '') + (current ? ' current' : '');
      button.disabled = !open;
      button.style.setProperty('--lesson-color', item.color);
      button.innerHTML =
        '<img src="' + item.hero + '" alt="">' +
        '<span class="lesson-state">' + (done ? 'RESTORED' : open ? 'OPEN' : 'LOCKED') + '</span>' +
        '<span class="lesson-card-copy"><span>LOCK ' + String(item.no).padStart(2, '0') + ' · ' + item.era + ' · 10문제</span><b>' + item.title + '</b><small>' + (done ? '복구 완료 · 다시 조사 가능' : open ? '조사 시작 · 8개 이상 정답 시 해금' : '앞 전시를 먼저 복구하세요') + '</small></span>';
      if (open) button.addEventListener('click', function () { beginLesson(index); });
      list.appendChild(button);
    });
    var percent = STORY.length ? state.completed.length / STORY.length * 100 : 0;
    document.getElementById('vaultProgressLabel').textContent = state.completed.length + ' / ' + STORY.length;
    document.getElementById('vaultProgressBar').style.width = percent + '%';
    var next = nextPlayable();
    document.getElementById('vaultContinueButton').textContent = state.completed.length === STORY.length ? '마지막 기록 보기' : 'LOCK ' + String(next + 1).padStart(2, '0') + ' 조사 계속';
  }

  function openVault() {
    renderVault();
    setPhase(0, '전시 목록');
    show('vault');
  }

  function beginLesson(index) {
    state.started = true;
    state.current = clamp(index, 0, STORY.length - 1);
    saveState();
    run = {
      lessonIndex: state.current,
      replay: state.completed.indexOf(state.current) >= 0,
      dialogueIndex: 0,
      artifactIndex: 0,
      selectedObservations: [],
      selectedClues: [],
      questionIndex: 0,
      foeHp: 100,
      evidenceHp: 100,
      right: 0,
      wrong: 0,
      timeouts: 0,
      attemptFailed: false,
      answers: [],
      activeDialogueLines: [],
      dialogueNext: null,
      dialogueActionLabel: '실제 자료 조사',
      batch: null
    };
    renderStory();
  }

  function renderStory() {
    var item = lesson();
    document.getElementById('storyEra').textContent = item.era;
    document.getElementById('storyNo').textContent = String(item.no).padStart(2, '0');
    document.getElementById('storyTitle').textContent = item.title;
    document.getElementById('storySubtitle').textContent = item.subtitle;
    var image = document.getElementById('storyImage');
    image.src = item.hero;
    image.alt = item.heroAlt;
    run.activeDialogueLines = item.story;
    run.dialogueNext = setupArtifact;
    run.dialogueActionLabel = '실제 자료 조사';
    run.dialogueIndex = 0;
    renderDialogueLine();
    setPhase(1, '사건');
    show('story');
  }

  function renderDialogueLine() {
    var lines = run.activeDialogueLines.length ? run.activeDialogueLines : lesson().story;
    var line = lines[run.dialogueIndex];
    var visual = document.getElementById('speakerVisual');
    visual.dataset.speaker = line.speaker;
    document.getElementById('speakerName').textContent = line.speaker;
    document.getElementById('speakerRole').textContent = line.role;
    document.getElementById('dialogueText').textContent = line.text;
    document.getElementById('dialogueStep').textContent = (run.dialogueIndex + 1) + ' / ' + lines.length;
    document.getElementById('dialogueProgress').style.width = (run.dialogueIndex + 1) / lines.length * 100 + '%';
    document.getElementById('storyNextButton').textContent = run.dialogueIndex === lines.length - 1 ? run.dialogueActionLabel : '계속';
  }

  function nextDialogue() {
    var lines = run.activeDialogueLines.length ? run.activeDialogueLines : lesson().story;
    if (run.dialogueIndex < lines.length - 1) {
      run.dialogueIndex += 1;
      renderDialogueLine();
      return;
    }
    var next = run.dialogueNext || setupArtifact;
    run.dialogueNext = null;
    next();
  }

  function renderStoryBeat(key, nextAction) {
    var item = lesson();
    var beat = item.storyBeats && item.storyBeats[key];
    if (!beat) { nextAction(); return; }
    document.getElementById('storyEra').textContent = beat.stage;
    document.getElementById('storyNo').textContent = String(item.no).padStart(2, '0');
    document.getElementById('storyTitle').textContent = beat.title;
    document.getElementById('storySubtitle').textContent = beat.subtitle;
    var image = document.getElementById('storyImage');
    image.src = item.hero;
    image.alt = item.heroAlt;
    run.activeDialogueLines = beat.lines;
    run.dialogueNext = nextAction;
    run.dialogueActionLabel = key === 'artifact' ? '유물 판정 시작' : key === 'reconstruction' ? '생활 추론 판정' : '위기 판단 시작';
    run.dialogueIndex = 0;
    renderDialogueLine();
    setPhase(key === 'artifact' ? 2 : key === 'reconstruction' ? 3 : 4, key === 'crisis' ? '사건 위기' : '스토리 전개');
    show('story');
  }

  function setupArtifact() {
    run.artifactIndex = 0;
    run.selectedObservations = [];
    document.getElementById('artifactScreenTitle').textContent = lesson().era + ' 실제 자료';
    document.getElementById('artifactPrompt').textContent = lesson().artifactPrompt;
    renderArtifactMedia();
    renderObservations();
    setPhase(2, '실물 관찰');
    show('artifact');
  }

  function renderArtifactMedia() {
    var items = lesson().artifacts;
    var item = items[run.artifactIndex];
    var image = document.getElementById('artifactImage');
    image.src = item.src;
    image.alt = item.alt;
    document.getElementById('artifactKind').textContent = item.kind;
    document.getElementById('artifactName').textContent = item.name;
    document.getElementById('artifactMeta').textContent = item.meta + ' · ' + item.license;
    document.getElementById('artifactSource').href = item.source;
    document.getElementById('artifactIndex').textContent = run.artifactIndex + 1;
    document.getElementById('artifactTotal').textContent = items.length;
    document.getElementById('artifactGallery').hidden = items.length <= 1;
    document.getElementById('artifactPrevButton').disabled = run.artifactIndex === 0;
    document.getElementById('artifactNextButton').disabled = run.artifactIndex === items.length - 1;
  }

  function renderObservations() {
    var host = document.getElementById('observationList');
    host.innerHTML = '';
    lesson().observations.forEach(function (item) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'observation-card';
      button.dataset.observationId = item.id;
      button.innerHTML = '<i aria-hidden="true">✓</i><span><b>' + item.title + '</b><span>' + item.text + '</span></span>';
      button.addEventListener('click', function () { selectObservation(item, button); });
      host.appendChild(button);
    });
    updateObservationStatus();
  }

  function selectObservation(item, button) {
    var message = document.getElementById('observationMessage');
    if (item.false) {
      button.classList.add('rejected');
      message.className = 'selection-message error';
      message.textContent = '그 내용은 사진에서 확인되지 않습니다. 보이는 사실만 다시 골라 보세요.';
      window.setTimeout(function () { button.classList.remove('rejected'); }, 620);
      return;
    }
    if (run.selectedObservations.indexOf(item.id) >= 0) return;
    run.selectedObservations.push(item.id);
    button.classList.add('selected');
    updateObservationStatus();
  }

  function updateObservationStatus() {
    var required = 3;
    var count = run.selectedObservations.length;
    document.getElementById('observationCount').textContent = Math.min(count, required);
    var message = document.getElementById('observationMessage');
    var continueButton = document.getElementById('artifactContinueButton');
    if (count >= required) {
      message.className = 'selection-message success';
      message.textContent = '직접 관찰 3개를 확보했습니다. 이제 이 자료가 생활에서 어떻게 쓰였는지 추론합니다.';
      continueButton.disabled = false;
    } else {
      message.className = 'selection-message';
      message.textContent = count ? '좋습니다. 직접 보이는 특징을 ' + (required - count) + '개 더 찾으세요.' : '아직 관찰을 시작하지 않았습니다.';
      continueButton.disabled = true;
    }
  }

  function openArtifactDialog() {
    var item = lesson().artifacts[run.artifactIndex];
    document.getElementById('dialogImage').src = item.src;
    document.getElementById('dialogImage').alt = item.alt;
    document.getElementById('dialogImageName').textContent = item.name + ' · ' + item.kind;
    document.getElementById('dialogImageMeta').textContent = item.meta + ' · ' + item.license;
    document.getElementById('imageDialog').showModal();
  }

  function setupReconstruction() {
    var item = lesson();
    run.selectedClues = [];
    var image = document.getElementById('reconstructionImage');
    image.src = item.hero;
    image.alt = item.heroAlt;
    document.getElementById('reconstructionPrompt').textContent = item.reconstruction.prompt;
    document.getElementById('reconstructionCaption').textContent = item.reconstruction.caption;
    document.getElementById('clueRequired').textContent = item.reconstruction.required;
    renderHotspots();
    updateClueStatus();
    setPhase(3, '생활 추론');
    show('reconstruction');
  }

  function renderHotspots() {
    var host = document.getElementById('hotspotLayer');
    host.innerHTML = '';
    lesson().reconstruction.facts.forEach(function (fact, index) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'hotspot';
      button.style.left = fact.x + '%';
      button.style.top = fact.y + '%';
      button.setAttribute('aria-label', (index + 1) + '번 생활 단서: ' + fact.title);
      button.innerHTML = '<span>' + (index + 1) + '</span>';
      button.addEventListener('click', function () { selectClue(fact, button); });
      host.appendChild(button);
    });
  }

  function selectClue(fact, button) {
    if (run.selectedClues.indexOf(fact.id) < 0) {
      run.selectedClues.push(fact.id);
      button.classList.add('found');
      var tag = document.createElement('span');
      tag.textContent = fact.title;
      document.getElementById('clueTags').appendChild(tag);
    }
    document.getElementById('clueCurrent').innerHTML = '<small>유물과 연결한 근거 있는 추론</small><b>' + fact.title + '</b><p>' + fact.text + '</p>';
    updateClueStatus();
  }

  function updateClueStatus() {
    var required = lesson().reconstruction.required;
    var count = run.selectedClues.length;
    document.getElementById('clueCount').textContent = Math.min(count, required);
    document.getElementById('reconstructionContinueButton').disabled = count < required;
    if (!count) {
      document.getElementById('clueTags').innerHTML = '';
      document.getElementById('clueCurrent').innerHTML = '<small>장면의 숫자 표식을 누르세요</small><b>무엇을 하고 있을까?</b><p>실제 유물에서 본 특징과 장면 속 행동을 연결해 봅니다.</p>';
    }
  }

  function continueFromArtifact() {
    renderStoryBeat('artifact', function () {
      resetQuizAttempt();
      startQuestionBatch(0, 1, '유물 판정', setupReconstruction);
    });
  }

  function continueFromReconstruction() {
    renderStoryBeat('reconstruction', function () {
      startQuestionBatch(2, 4, '생활 추론', function () {
        renderStoryBeat('crisis', function () {
          startQuestionBatch(5, 7, '위기 판단', function () { setupDuel(false); });
        });
      });
    });
  }

  function setupDuel(openBriefing) {
    var item = lesson();
    var memeChip = document.getElementById('zeroMemeChip');
    if (memeChip) memeChip.textContent = '최종 삭제 판정 대기 중… ㅋ';
    document.getElementById('duelRole').textContent = item.duel.role;
    document.getElementById('duelQuote').textContent = '“' + item.duel.quote + '”';
    document.getElementById('duelCondition').textContent = item.duel.condition + ' 현재까지 ' + run.right + '개를 지켰습니다.';
    document.getElementById('briefingTitle').textContent = item.title + '의 핵심 근거';
    renderBriefing();
    document.getElementById('duelIntroPanel').hidden = Boolean(openBriefing);
    document.getElementById('briefingPanel').hidden = !openBriefing;
    document.getElementById('quizPanel').hidden = true;
    setPhase(4, 'ZERO 설전');
    show('duel');
  }

  function renderBriefing() {
    var host = document.getElementById('briefingList');
    host.innerHTML = '';
    lesson().briefing.forEach(function (item) {
      var block = document.createElement('div');
      block.className = 'briefing-item';
      block.innerHTML = '<span>' + item.tag + '</span><div><b>' + item.title + '</b><p>' + item.text + '</p></div>';
      host.appendChild(block);
    });
  }

  function openBriefing() {
    document.getElementById('duelIntroPanel').hidden = true;
    document.getElementById('briefingPanel').hidden = false;
    document.getElementById('quizPanel').hidden = true;
    window.scrollTo(0, 0);
  }

  function resetQuizAttempt() {
    run.questionIndex = 0;
    run.foeHp = 100;
    run.evidenceHp = 100;
    run.right = 0;
    run.wrong = 0;
    run.timeouts = 0;
    run.attemptFailed = false;
    run.answers = [];
  }

  function startQuiz() {
    startQuestionBatch(8, 9, '최종 설전', finishAttempt);
  }

  function startQuestionBatch(start, end, label, nextAction) {
    run.batch = { start: start, end: end, label: label, next: nextAction };
    run.questionIndex = start;
    document.getElementById('duelIntroPanel').hidden = true;
    document.getElementById('briefingPanel').hidden = true;
    document.getElementById('quizPanel').hidden = false;
    var memeChip = document.getElementById('zeroMemeChip');
    if (memeChip) memeChip.textContent = label === '최종 설전' ? '마지막 2개입니다, 휴먼 ㅋ' : label + ' 처리 중…';
    setPhase(start < 2 ? 2 : start < 5 ? 3 : 4, label);
    show('duel');
    renderQuestion();
    window.scrollTo(0, 0);
  }

  function updateDuelHud() {
    document.getElementById('foeHp').textContent = run.foeHp + ' / 100';
    document.getElementById('evidenceHp').textContent = run.evidenceHp + ' / 100';
    document.getElementById('foeBar').style.width = run.foeHp + '%';
    document.getElementById('evidenceBar').style.width = run.evidenceHp + '%';
  }

  function renderQuestion() {
    clearTimer();
    var question = lesson().questions[run.questionIndex];
    var feedback = document.getElementById('feedback');
    feedback.hidden = true;
    document.getElementById('choiceList').hidden = false;
    var batch = run.batch || { start: 0, end: lesson().questions.length - 1, label: '자료 판정' };
    document.getElementById('questionOrder').textContent = batch.label + ' ' + (run.questionIndex - batch.start + 1) + ' / ' + (batch.end - batch.start + 1);
    document.getElementById('questionType').textContent = question.type || '자료 해석';
    document.getElementById('questionId').textContent = '전체 ' + (run.questionIndex + 1) + ' / ' + lesson().questions.length + ' · ' + question.id;
    document.getElementById('questionPrompt').textContent = question.prompt;
    document.getElementById('questionContext').textContent = question.context;
    updateDuelHud();
    var host = document.getElementById('choiceList');
    host.innerHTML = '';
    question.choices.forEach(function (choice, index) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'choice';
      button.dataset.choiceIndex = index;
      button.innerHTML = '<span>' + (index + 1) + '</span><b>' + choice + '</b>';
      button.addEventListener('click', function () { answerQuestion(index, false); });
      host.appendChild(button);
    });
    renderQuestionProgress();
    startTimer(question.time);
  }

  function renderQuestionProgress() {
    var host = document.getElementById('questionProgress');
    host.innerHTML = '';
    lesson().questions.forEach(function (question, index) {
      var marker = document.createElement('i');
      marker.className = (run.answers[index] || '') + (index === run.questionIndex ? ' current' : '');
      marker.title = (index + 1) + '번 ' + (question.type || '자료 해석');
      host.appendChild(marker);
    });
  }

  function startTimer(seconds) {
    var startedAt = Date.now();
    var duration = seconds * 1000;
    function tick() {
      var elapsed = Date.now() - startedAt;
      var remainingMs = Math.max(0, duration - elapsed);
      var remaining = Math.ceil(remainingMs / 1000);
      var percent = remainingMs / duration * 100;
      var number = document.getElementById('timerNumber');
      var wrap = document.getElementById('timerNumberWrap');
      var bar = document.getElementById('timerBar');
      number.textContent = remaining;
      bar.style.width = percent + '%';
      var danger = remaining <= 8;
      wrap.classList.toggle('danger', danger);
      bar.classList.toggle('danger', danger);
      if (remainingMs <= 0) {
        clearTimer();
        answerQuestion(-1, true);
      }
    }
    tick();
    timerId = window.setInterval(tick, 200);
  }

  function answerQuestion(choiceIndex, timedOut) {
    clearTimer();
    var question = lesson().questions[run.questionIndex];
    var buttons = Array.prototype.slice.call(document.querySelectorAll('#choiceList .choice'));
    buttons.forEach(function (button) { button.disabled = true; });
    var correct = !timedOut && choiceIndex === question.answer;
    if (correct) {
      run.right += 1;
      run.foeHp = clamp(run.foeHp - CORRECT_DAMAGE, 0, 100);
      state.reputation = clamp(state.reputation + 1, 0, 100);
      run.answers[run.questionIndex] = 'correct';
      if (state.learned.indexOf(question.id) < 0) state.learned.push(question.id);
      if (buttons[choiceIndex]) buttons[choiceIndex].classList.add('correct');
    } else {
      run.attemptFailed = true;
      run.evidenceHp = clamp(run.evidenceHp - (timedOut ? 25 : 20), 0, 100);
      run.answers[run.questionIndex] = 'wrong';
      if (timedOut) {
        run.timeouts += 1;
        state.reputation = clamp(state.reputation - 4, 0, 100);
      } else {
        run.wrong += 1;
        state.reputation = clamp(state.reputation - 3, 0, 100);
        if (buttons[choiceIndex]) buttons[choiceIndex].classList.add('wrong');
      }
      if (buttons[question.answer]) buttons[question.answer].classList.add('correct');
    }
    saveState();
    updateDuelHud();
    renderQuestionProgress();
    showFeedback(correct, timedOut, question);
  }

  function showFeedback(correct, timedOut, question) {
    var feedback = document.getElementById('feedback');
    feedback.hidden = false;
    document.getElementById('feedbackTitle').textContent = correct ? '근거 적중 · ZERO 방어선 -13' : timedOut ? '시간 초과 · 근거력 -25' : '근거 불충분 · 근거력 -20';
    document.getElementById('feedbackText').textContent = question.explanation;
    document.getElementById('feedbackFact').textContent = question.fact;
    var atBatchEnd = run.batch && run.questionIndex === run.batch.end;
    document.getElementById('feedbackButton').textContent = atBatchEnd
      ? run.batch.end === lesson().questions.length - 1 ? '최종 결과 확인' : '스토리 계속'
      : '다음 질문';
  }

  function continueAfterFeedback() {
    if (!run.batch) return;
    if (run.questionIndex < run.batch.end) {
      run.questionIndex += 1;
      renderQuestion();
      return;
    }
    var next = run.batch.next;
    run.batch = null;
    next();
  }

  function finishAttempt() {
    var success = run.right >= PASS_SCORE;
    if (success) run.foeHp = 0;
    var alreadyDone = state.completed.indexOf(state.current) >= 0;
    if (success) {
      if (!alreadyDone) {
        state.completed.push(state.current);
        state.wins += 1;
        if (state.current < STORY.length - 1) state.unlocked = Math.max(state.unlocked, state.current + 1);
      }
    } else {
      state.losses += 1;
    }
    saveState();
    renderResult(success, alreadyDone);
  }

  function renderResult(success, alreadyDone) {
    var item = lesson();
    var resultScreen = document.getElementById('resultScreen');
    resultScreen.classList.toggle('failed', !success);
    document.getElementById('resultMark').textContent = success ? '✓' : '×';
    document.getElementById('resultEyebrow').textContent = 'LOCK ' + String(item.no).padStart(2, '0') + ' · ' + (success ? 'RESTORED' : 'ACCESS DENIED');
    document.getElementById('resultTitle').textContent = success ? alreadyDone ? '재조사 완료' : '전시 복구 완료' : '전시 복구 실패';
    document.getElementById('resultText').textContent = success
      ? '10개의 자료 판정에서 ' + run.right + '개의 근거를 지켰습니다. 관찰한 사실과 생활상 추론을 구분해 ZERO의 삭제 명령을 멈췄습니다.'
      : '통과 기준은 8개입니다. 이번에는 ' + run.right + '개의 근거를 지켰습니다. 사건 속에서 놓친 단서를 확인하고 처음부터 다시 조사하세요.';
    document.getElementById('resultStats').innerHTML =
      '<span>정답 ' + run.right + ' / ' + lesson().questions.length + '</span>' +
      '<span>오답 ' + run.wrong + '</span>' +
      '<span>시간 초과 ' + run.timeouts + '</span>' +
      '<span>평판 ' + state.reputation + '</span>';
    var resultCharacter = document.getElementById('resultCharacter');
    resultCharacter.src = success ? 'assets/characters/player-curator.png' : 'assets/characters/zero-archive-ai.png';
    document.getElementById('resultCharacterLine').textContent = success
      ? '증거가 이겼다. 다음 전시로!'
      : '8개도 못 지켰군요, 닝겐?';
    document.getElementById('resultEvidence').textContent = item.memory.evidence;
    document.getElementById('resultObservation').textContent = item.memory.observation;
    document.getElementById('resultInference').textContent = item.memory.inference;
    document.getElementById('resultUnknown').textContent = item.memory.unknown;
    var primary = document.getElementById('resultPrimaryButton');
    primary.dataset.success = success ? 'true' : 'false';
    if (!success) primary.textContent = '사건 처음부터 재조사';
    else if (state.current === STORY.length - 1) primary.textContent = '마지막 기록 판정';
    else primary.textContent = '다음 전시 열기';
    setPhase(5, '결과');
    show('result');
  }

  function handleResultPrimary() {
    var success = document.getElementById('resultPrimaryButton').dataset.success === 'true';
    if (!success) {
      beginLesson(state.current);
      return;
    }
    if (state.current === STORY.length - 1) {
      renderFinal();
      return;
    }
    beginLesson(state.current + 1);
  }

  function renderMemory() {
    var host = document.getElementById('memoryList');
    host.innerHTML = '';
    var visibleCount = 0;
    STORY.forEach(function (item, index) {
      var learnedQuestions = item.questions.filter(function (question) { return state.learned.indexOf(question.id) >= 0; });
      var complete = state.completed.indexOf(index) >= 0;
      if (!complete && !learnedQuestions.length) return;
      visibleCount += 1;
      var card = document.createElement('details');
      card.className = 'memory-card';
      var stateClass = complete ? '' : ' learning';
      var body = '';
      if (complete) {
        body += '<div class="memory-grid">' +
          '<div><span>직접 관찰</span><p>' + item.memory.observation + '</p></div>' +
          '<div><span>근거 있는 추론</span><p>' + item.memory.inference + '</p></div>' +
          '<div><span>아직 알 수 없음</span><p>' + item.memory.unknown + '</p></div>' +
          '</div>';
      }
      if (learnedQuestions.length) {
        body += '<div class="learned-list">' + learnedQuestions.map(function (question) {
          return '<div class="learned-question"><span>' + question.id + '</span><b>' + question.prompt + '</b><p>' + question.fact + '</p></div>';
        }).join('') + '</div>';
      }
      card.innerHTML =
        '<summary><span>LOCK ' + String(item.no).padStart(2, '0') + '</span><div><b>' + item.memory.evidence + '</b><small>' + item.title + '</small></div><i class="memory-state' + stateClass + '">' + (complete ? 'CLEAR' : 'LEARNING') + '</i></summary>' +
        '<div class="memory-body">' + body + '</div>';
      host.appendChild(card);
    });
    document.getElementById('memoryEmpty').hidden = visibleCount > 0;
    updateHud();
  }

  function openMemory(returnTo) {
    memoryReturn = returnTo || currentScreen;
    renderMemory();
    setPhase(6, '기억 보관함');
    show('memory');
  }

  function returnFromMemory() {
    if (memoryReturn === 'result') { setPhase(5, '결과'); show('result'); return; }
    if (memoryReturn === 'story') { setPhase(1, '사건'); show('story'); return; }
    if (memoryReturn === 'artifact') { setPhase(2, '실물 관찰'); show('artifact'); return; }
    if (memoryReturn === 'reconstruction') { setPhase(3, '생활 추론'); show('reconstruction'); return; }
    if (memoryReturn === 'duel') {
      setPhase(4, 'ZERO 설전');
      show('duel');
      if (!document.getElementById('quizPanel').hidden && document.getElementById('feedback').hidden) renderQuestion();
      return;
    }
    if (memoryReturn === 'final') { show('final'); return; }
    openVault();
  }

  function renderFinal() {
    document.getElementById('finalQuestion').querySelectorAll('button').forEach(function (button) {
      button.disabled = false;
      button.classList.remove('correct', 'wrong');
    });
    document.getElementById('finalFeedback').textContent = state.finished ? '정답입니다. 실제 자료와 재구성 이미지를 구분하는 것이 마지막 핵심입니다.' : '마지막 답을 선택하세요.';
    document.getElementById('finalActions').hidden = !state.finished;
    show('final');
  }

  function answerFinal(button) {
    var correct = button.dataset.finalChoice === 'correct';
    if (!correct) {
      button.classList.add('wrong');
      document.getElementById('finalFeedback').textContent = '그 답은 실제 자료와 추론의 차이를 놓쳤습니다. 유물 사진과 생활 재구성 이미지는 같은 종류의 자료가 아닙니다.';
      return;
    }
    button.classList.add('correct');
    document.getElementById('finalQuestion').querySelectorAll('button').forEach(function (choice) { choice.disabled = true; });
    document.getElementById('finalFeedback').textContent = '정답입니다. 생활 장면은 실제 유물·유적을 바탕으로 한 근거 있는 재구성입니다.';
    document.getElementById('finalActions').hidden = false;
    state.finished = true;
    saveState();
  }

  function restart() {
    if (!window.confirm('0호 수장고의 학습 기록과 평판을 모두 지우고 처음부터 시작할까요?')) return;
    try { localStorage.removeItem(STORAGE_KEY); } catch (error) {}
    state = blankState();
    run = null;
    updateHud();
    show('title');
  }

  function openInfo() { document.getElementById('infoDialog').showModal(); }

  function preloadImages() {
    var sources = [];
    STORY.forEach(function (item) {
      sources.push(item.hero);
      item.artifacts.forEach(function (artifact) { sources.push(artifact.src); });
    });
    sources.filter(function (src, index, list) { return list.indexOf(src) === index; }).forEach(function (src) {
      var image = new Image();
      image.decoding = 'async';
      image.src = src;
    });
  }

  function bindEvents() {
    document.getElementById('startButton').addEventListener('click', function () {
      if (state.started && !window.confirm('기존 학습 기록과 평판을 지우고 처음부터 시작할까요?')) return;
      state = blankState();
      state.started = true;
      saveState();
      openVault();
      window.setTimeout(preloadImages, 200);
    });
    document.getElementById('continueButton').addEventListener('click', openVault);
    document.getElementById('vaultButton').addEventListener('click', openVault);
    document.getElementById('memoryButton').addEventListener('click', function () { openMemory(currentScreen); });
    document.getElementById('vaultHomeButton').addEventListener('click', function () { show('title'); });
    document.getElementById('vaultMemoryButton').addEventListener('click', function () { openMemory('vault'); });
    document.getElementById('vaultContinueButton').addEventListener('click', function () {
      if (state.completed.length === STORY.length) renderFinal();
      else beginLesson(nextPlayable());
    });
    document.getElementById('storyNextButton').addEventListener('click', nextDialogue);
    document.getElementById('artifactPrevButton').addEventListener('click', function () { run.artifactIndex = Math.max(0, run.artifactIndex - 1); renderArtifactMedia(); });
    document.getElementById('artifactNextButton').addEventListener('click', function () { run.artifactIndex = Math.min(lesson().artifacts.length - 1, run.artifactIndex + 1); renderArtifactMedia(); });
    document.getElementById('artifactZoomButton').addEventListener('click', openArtifactDialog);
    document.getElementById('artifactContinueButton').addEventListener('click', continueFromArtifact);
    document.getElementById('reconstructionContinueButton').addEventListener('click', continueFromReconstruction);
    document.getElementById('duelBriefingButton').addEventListener('click', openBriefing);
    document.getElementById('quizStartButton').addEventListener('click', startQuiz);
    document.getElementById('feedbackButton').addEventListener('click', continueAfterFeedback);
    document.getElementById('resultPrimaryButton').addEventListener('click', handleResultPrimary);
    document.getElementById('resultMemoryButton').addEventListener('click', function () { openMemory('result'); });
    document.getElementById('resultVaultButton').addEventListener('click', openVault);
    document.getElementById('memoryBackButton').addEventListener('click', returnFromMemory);
    document.getElementById('memoryContinueButton').addEventListener('click', function () {
      if (state.completed.length === STORY.length) renderFinal();
      else beginLesson(nextPlayable());
    });
    document.getElementById('finalMemoryButton').addEventListener('click', function () { openMemory('final'); });
    document.getElementById('finalVaultButton').addEventListener('click', openVault);
    document.getElementById('restartButton').addEventListener('click', restart);
    document.getElementById('finalQuestion').querySelectorAll('button').forEach(function (button) {
      button.addEventListener('click', function () { answerFinal(button); });
    });
    document.getElementById('titleSourcesButton').addEventListener('click', openInfo);
    document.getElementById('footerSourcesButton').addEventListener('click', openInfo);
    document.addEventListener('keydown', function (event) {
      if (currentScreen !== 'duel' || document.getElementById('quizPanel').hidden || !document.getElementById('feedback').hidden) return;
      var index = Number(event.key) - 1;
      var button = document.querySelector('#choiceList .choice[data-choice-index="' + index + '"]');
      if (button && !button.disabled) button.click();
    });
  }

  function init() {
    if (!STORY.length) return;
    bindEvents();
    updateHud();
    if (state.started) document.getElementById('continueButton').hidden = false;
    var idle = window.requestIdleCallback || function (callback) { return window.setTimeout(callback, 700); };
    idle(preloadImages);
  }

  init();
}());
