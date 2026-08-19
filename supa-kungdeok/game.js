(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const padScore = (value) => Math.round(value).toString().padStart(7, "0");

  const COLORS = {
    ink: "#38261f",
    paper: "#fff9e8",
    ivory: "#fff1cf",
    teal: "#176b78",
    red: "#e94f3d",
    gold: "#efb83f",
    jade: "#6fbf9e",
    purple: "#6c3f77",
  };

  const AUDIO_FILES = {
    gutgeori: "./assets/audio/gutgeori-samulnori.mp3",
    madangsamchae: "./assets/audio/madangsamchae-samulnori.mp3",
    jajinmori: "./assets/audio/jajinmori-samulnori.mp3",
    bukpyeon: "./assets/audio/janggu-bukpyeon-one-shot.wav",
    chaepyeon: "./assets/audio/janggu-chaepyeon-one-shot.wav",
  };

  const MIN_GAME_DURATION_SEC = 20;
  const MAX_GAME_DURATION_SEC = 26;
  const HIT_CUE_OFFSETS_SEC = {
    bukpyeon: 0,
    chaepyeon: 0,
  };
  const TIMING_POLICY = {
    inputWindowSec: 0.205,
    rollInputWindowSec: 0.28,
    missWindowSec: 0.235,
    rollMissWindowSec: 0.31,
    deongPartialMissWindowSec: 0.34,
    gideokPartialMissWindowSec: 0.38,
    deongGapSec: 0.17,
    gideokGapSec: 0.3,
    partialCompletionGraceSec: 0.025,
    perfectMs: 70,
    greatMs: 130,
    rollHoldRatio: 0.6,
    rollHoldMinSec: 0.24,
    rollHoldMaxSec: 0.42,
    rollReleaseGraceSec: 0.045,
    rollEarlyArmMaxSec: 0.45,
  };

  const SONGS = {
    gutgeori: {
      id: "gutgeori",
      badge: "첫 마당",
      title: "굿거리 기본형",
      meta: "굿거리 · 12/8 · 실연 평균 ♩.=53.7",
      bpm: 53.699,
      bars: 5,
      stepsPerBar: 12,
      level: 1,
      audioKey: "gutgeori",
      audioStartOffsetSec: 0,
      audioDownbeatSec: 0.681333,
      travelSec: 5.5,
      displayTravelSec: 4.2,
      phoneDisplayTravelSec: 1.4,
      noteScale: 0.92,
      barTimes: [0, 4.595, 9.14, 13.5825, 17.97, 22.346937],
      beatTimes: [
        0, 1.15875, 2.3175, 3.46625, 4.595,
        5.72375, 6.86, 8, 9.14,
        10.24625, 11.3525, 12.463125, 13.5825,
        14.701875, 15.79875, 16.884375, 17.97,
        19.0725, 20.175, 21.269234, 22.346937,
      ],
      patterns: [
        [
          [0, "deong"], [2, "gideok"],
          [3, "kung"], [4, "roll", 2],
          [6, "kung"], [8, "gideok"],
          [9, "kung"], [10, "roll", 2],
        ],
      ],
    },
    madangsamchae: {
      id: "madangsamchae",
      badge: "둘째 마당",
      title: "삼채 장단 연습",
      meta: "농악 삼채 · 교과서표준악보집 첫 제시형 · 연습 속도 ♩.=96",
      bpm: 96,
      bars: 9,
      stepsPerBar: 12,
      level: 2,
      audioKey: "madangsamchae",
      audioStartOffsetSec: 0,
      audioDownbeatSec: 0.04287,
      travelSec: 5.5,
      displayTravelSec: 2.85,
      phoneDisplayTravelSec: 1.15,
      noteScale: 0.92,
      barTimes: [0, 2.531293, 5.055716, 7.569836, 10.087391, 12.591206, 15.074416, 17.519844, 19.972141, 22.5],
      patterns: [
        [[0,"deong"],[3,"deong"],[6,"deong"],[8,"deok"],[9,"kung"],[10,"deok"]],
      ],
    },
    jajinmori: {
      id: "jajinmori",
      badge: "셋째 마당",
      title: "자진모리 변형",
      meta: "자진모리 · 〈이어도사나〉 적합형 · 실연 평균 ♩.=106.5",
      bpm: 106.516,
      bars: 11,
      stepsPerBar: 12,
      level: 3,
      audioKey: "jajinmori",
      audioStartOffsetSec: 0,
      audioDownbeatSec: 0.936333,
      travelSec: 5.5,
      displayTravelSec: 2.45,
      phoneDisplayTravelSec: 1,
      noteScale: 0.92,
      barTimes: [0, 2.25, 4.455, 6.655, 8.88, 11.17, 13.39, 15.6, 17.945, 20.355, 22.61, 24.785],
      patterns: [
        [[0,"deong"],[2,"deok"],[3,"kung"],[4,"deok"],[6,"kung"],[8,"deok"],[9,"kung"],[10,"deok"]],
      ],
    },
  };

  class RecordedAudio {
    constructor() {
      this.context = null;
      this.master = null;
      this.music = null;
      this.effects = null;
      this.buffers = new Map();
      this.loadingPromises = new Map();
      this.nodes = new Set();
      this.muted = false;
    }

    async ensure(keys = Object.keys(AUDIO_FILES)) {
      if (!this.context) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) throw new Error("이 브라우저는 WebAudio를 지원하지 않습니다.");
        this.context = new AudioContextClass({ latencyHint: "interactive" });
        this.master = this.context.createGain();
        this.music = this.context.createGain();
        this.effects = this.context.createGain();
        this.master.gain.value = this.muted ? 0.0001 : 0.78;
        this.music.gain.value = 0.52;
        this.effects.gain.value = 0.92;
        this.music.connect(this.master);
        this.effects.connect(this.master);
        this.master.connect(this.context.destination);
      }
      if (this.context.state === "suspended") await this.context.resume();
      await this.load(keys);
      return this.context;
    }

    get time() { return this.context ? this.context.currentTime : 0; }

    async load(keys) {
      if (window.location.protocol === "file:") {
        throw new Error("파일을 직접 열면 브라우저가 음원을 차단합니다. README의 정적 서버 실행 방법으로 열어 주세요.");
      }
      try {
        await Promise.all([...new Set(keys)].map((key) => this.loadOne(key)));
      } catch (error) {
        throw new Error(`실제 연주 음원을 불러오지 못했습니다: ${error.message}`);
      }
    }

    async loadOne(key) {
      if (this.buffers.has(key)) return;
      if (!AUDIO_FILES[key]) throw new Error(`알 수 없는 음원: ${key}`);
      if (!this.loadingPromises.has(key)) {
        const promise = (async () => {
          const url = AUDIO_FILES[key];
          const response = await fetch(url);
          if (!response.ok) throw new Error(`${url} (${response.status})`);
          const encoded = await response.arrayBuffer();
          const buffer = await this.context.decodeAudioData(encoded);
          this.buffers.set(key, buffer);
        })();
        this.loadingPromises.set(key, promise);
      }
      try {
        await this.loadingPromises.get(key);
      } finally {
        this.loadingPromises.delete(key);
      }
    }

    track(node) {
      this.nodes.add(node);
      node.addEventListener?.("ended", () => this.nodes.delete(node), { once: true });
      return node;
    }

    playBuffer(key, at = this.time, strength = 1, destination = this.effects, offsetSec = 0, durationSec = null) {
      const buffer = this.buffers.get(key);
      if (!this.context || !buffer) return null;
      const requestedAt = Number.isFinite(at) ? at : this.time;
      const lateBy = Math.max(0, this.time - requestedAt);
      const startAt = Math.max(this.time, requestedAt);
      const offset = clamp(offsetSec + lateBy, 0, buffer.duration);
      const available = Math.max(0, buffer.duration - offset);
      const duration = durationSec == null ? available : Math.min(durationSec - lateBy, available);
      if (duration <= 0) return null;
      const source = this.track(this.context.createBufferSource());
      const gain = this.context.createGain();
      source.buffer = buffer;
      gain.gain.value = Math.max(0.0001, strength);
      source.connect(gain).connect(destination);
      source.addEventListener("ended", () => {
        source.disconnect();
        gain.disconnect();
      }, { once: true });
      source.start(startAt, offset, duration);
      return source;
    }

    kung(at = this.time, strength = 1) {
      this.playBuffer("bukpyeon", at, 0.82 * strength, this.effects, HIT_CUE_OFFSETS_SEC.bukpyeon);
    }

    deok(at = this.time, strength = 1) {
      this.playBuffer("chaepyeon", at, 0.78 * strength, this.effects, HIT_CUE_OFFSETS_SEC.chaepyeon);
    }

    deong(at = this.time, strength = 1) {
      this.kung(at, strength);
      this.deok(at, strength);
    }

    roll(at = this.time, count = 4) {
      for (let index = 0; index < count; index += 1) {
        this.deok(at + index * 0.062, 0.34 + index * 0.025);
      }
    }

    count(at, strong = false) {
      this.deok(at, strong ? 0.2 : 0.12);
    }

    getBufferDuration(key) {
      return this.buffers.get(key)?.duration || 0;
    }

    playBacking(song, downbeatAt, runDurationSec) {
      const bufferDuration = this.getBufferDuration(song.audioKey);
      const offset = clamp(song.audioStartOffsetSec, 0, bufferDuration);
      const preDownbeatSec = song.audioDownbeatSec - offset;
      const startAt = downbeatAt - preDownbeatSec;
      const duration = Math.min(bufferDuration - offset, preDownbeatSec + runDurationSec);
      return this.playBuffer(song.audioKey, startAt, 1, this.music, offset, duration);
    }

    setMuted(muted) {
      this.muted = muted;
      if (!this.master || !this.context) return;
      this.master.gain.cancelScheduledValues(this.time);
      this.master.gain.setTargetAtTime(muted ? 0.0001 : 0.78, this.time, 0.025);
    }

    stopAll() {
      for (const node of this.nodes) {
        try { node.stop(this.time); } catch (_) { /* already stopped */ }
      }
      this.nodes.clear();
    }
  }

  const elements = {
    game: $("#game"), canvas: $("#gameCanvas"), score: $("#scoreValue"), gauge: $("#gaugeFill"),
    songTitle: $("#songTitle"), songMeta: $("#songMeta"), songBadge: $("#songBadge"),
    combo: $("#combo"), judgment: $("#judgment"), timing: $("#timingHint"),
    hero: $("#heroCharacter"), perfectMini: $("#perfectMini"), missMini: $("#missMini"),
    countdown: $("#countdown"), countdownValue: $("#countdown span"), beatWash: $("#beatWash"),
    livingTiger: $("#livingTiger"), livingDeer: $("#livingDeer"),
    ribbonLayer: $("#ribbonLayer"), comboBurst: $("#comboBurst"), startOverlay: $("#startOverlay"), resultOverlay: $("#resultOverlay"),
    startButton: $("#startButton"), retryButton: $("#retryButton"), chooseButton: $("#chooseButton"),
    startStatus: $("#startStatus"),
    soundButton: $("#soundButton"), fullscreenButton: $("#fullscreenButton"),
    kungButton: $("#kungButton"), deokButton: $("#deokButton"),
    resultScore: $("#resultScore"), resultTitle: $("#resultTitle"), resultStamp: $("#resultStamp"),
    resultNote: $("#resultNote"), perfectCount: $("#perfectCount"), greatCount: $("#greatCount"),
    goodCount: $("#goodCount"), missCount: $("#missCount"), maxComboCount: $("#maxComboCount"),
    steadinessValue: $("#steadinessValue"),
  };

  const context = elements.canvas.getContext("2d");
  const audio = new RecordedAudio();
  const particles = [];
  const rings = [];
  const heldKeys = new Set();
  const heldInputs = { kung: new Map(), deok: new Map() };
  const rollReleaseLocks = new Set();
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const hiddenLivingBeatActors = window.matchMedia("(max-height: 650px) and (orientation: landscape)");
  let animationFrame = 0;
  let heroTimer = 0;
  let impactTimer = 0;
  let comboBurstTimer = 0;
  let resizeObserver = null;
  let selectedSong = SONGS.gutgeori;
  let lastCountdown = null;
  let lastBeat = -1;
  let activeRoll = null;
  let canvasWidth = 1;
  let canvasHeight = 1;
  let dpr = 1;
  let lastDrawAt = 0;

  const state = {
    phase: "ready",
    songStart: 0,
    runDuration: 0,
    chart: [],
    score: 0,
    combo: 0,
    maxCombo: 0,
    perfect: 0,
    great: 0,
    good: 0,
    miss: 0,
    judged: 0,
    timingErrors: [],
    beatGrid: [],
    countInBeatSec: 0,
  };

  function getDuration(song = selectedSong) { return song.barTimes[song.barTimes.length - 1]; }

  function getStepTime(song, bar, step) {
    if (song.beatTimes) {
      const stepsPerBeat = song.stepsPerBar / 4;
      const beatOffset = Math.floor(step / stepsPerBeat);
      const stepWithinBeat = step - beatOffset * stepsPerBeat;
      const beatIndex = bar * 4 + beatOffset;
      if (stepWithinBeat === 0) return song.beatTimes[beatIndex];
      const beatStart = song.beatTimes[beatIndex];
      const beatEnd = song.beatTimes[beatIndex + 1];
      return beatStart + (beatEnd - beatStart) * (stepWithinBeat / stepsPerBeat);
    }
    const barStart = song.barTimes[bar];
    const barEnd = song.barTimes[bar + 1];
    return barStart + (barEnd - barStart) * (step / song.stepsPerBar);
  }

  function getCountInBeatSec(song = selectedSong) {
    return getStepTime(song, 0, 3) - getStepTime(song, 0, 0);
  }

  function buildBeatGrid(song) {
    const beats = [];
    for (let bar = 0; bar < song.bars; bar += 1) {
      for (let beat = 0; beat < 4; beat += 1) {
        beats.push({ time: getStepTime(song, bar, beat * 3), barStart: beat === 0 });
      }
    }
    beats.push({ time: getDuration(song), barStart: true, endpoint: true });
    return beats;
  }

  function getBeatPhase(elapsed) {
    if (elapsed < 0) {
      const beatSec = state.countInBeatSec || getCountInBeatSec();
      return ((elapsed % beatSec) + beatSec) % beatSec / beatSec;
    }
    const beats = state.beatGrid;
    if (beats.length < 2) return 0;
    for (let index = 0; index < beats.length - 1; index += 1) {
      const start = beats[index].time;
      const end = beats[index + 1].time;
      if (elapsed >= start && elapsed < end) return (elapsed - start) / (end - start);
    }
    return 1;
  }

  function notationForSpan(type, span) {
    if (type === "gideok") return "♫";
    if (type === "roll") return "♬";
    if (span >= 3) return "♩.";
    if (span === 2) return "♩";
    return "♪";
  }

  function getPlayableDuration(song = selectedSong) {
    const availableAfterDownbeat = audio.getBufferDuration(song.audioKey) - song.audioDownbeatSec;
    const playable = Math.min(MAX_GAME_DURATION_SEC, getDuration(song), availableAfterDownbeat);
    if (playable < MIN_GAME_DURATION_SEC) {
      throw new Error(`음원 길이가 너무 짧습니다 (${playable.toFixed(2)}초). 20초 이상 필요합니다.`);
    }
    return playable;
  }

  function buildChart(song, runDuration = getDuration(song)) {
    const notes = [];
    for (let bar = 0; bar < song.bars; bar += 1) {
      const pattern = song.patterns[bar % song.patterns.length];
      for (let patternIndex = 0; patternIndex < pattern.length; patternIndex += 1) {
        const [step, type, holdSteps = 0] = pattern[patternIndex];
        const nextStep = pattern[patternIndex + 1]?.[0] ?? song.stepsPerBar;
        const span = Math.max(1, nextStep - step);
        const globalStep = bar * song.stepsPerBar + step;
        const time = getStepTime(song, bar, step);
        if (time >= runDuration) continue;
        const holdEndTime = holdSteps ? getStepTime(song, bar, Math.min(song.stepsPerBar, step + holdSteps)) : time;
        notes.push({
          id: `${song.id}-${bar}-${step}-${type}`,
          step: globalStep,
          time,
          type,
          notation: notationForSpan(type, span),
          holdSec: holdSteps ? holdEndTime - time : 0,
          judged: false,
          partial: null,
          result: null,
        });
      }
    }
    return notes.sort((a, b) => a.time - b.time || a.type.localeCompare(b.type));
  }

  function resetRun(runDuration, song = selectedSong) {
    clearInputState();
    Object.assign(state, {
      phase: "countIn", songStart: 0, runDuration, chart: buildChart(song, runDuration),
      score: 0, combo: 0, maxCombo: 0, perfect: 0, great: 0, good: 0, miss: 0,
      judged: 0, timingErrors: [], beatGrid: buildBeatGrid(song),
      countInBeatSec: getCountInBeatSec(song),
    });
    particles.length = 0;
    rings.length = 0;
    elements.ribbonLayer.replaceChildren();
    window.clearTimeout(impactTimer);
    window.clearTimeout(comboBurstTimer);
    lastDrawAt = 0;
    lastCountdown = null;
    lastBeat = -1;
    elements.game.dataset.comboTier = "0";
    elements.game.classList.remove("impact-hit", "impact-heavy");
    elements.comboBurst.classList.remove("show");
    elements.livingTiger.classList.remove("is-beat");
    elements.livingDeer.classList.remove("is-beat");
    updateHud();
  }

  async function startGame() {
    if (elements.startButton.disabled) return;
    const song = selectedSong;
    setStartBusy(true);
    elements.startStatus.textContent = "선택한 장단과 장구 소리를 여는 중…";
    let runDuration;
    try {
      await audio.ensure([song.audioKey, "bukpyeon", "chaepyeon"]);
      runDuration = getPlayableDuration(song);
    } catch (error) {
      elements.timing.textContent = error.message;
      elements.startStatus.textContent = error.message;
      setStartBusy(false);
      return;
    }
    stopGameLoop();
    audio.stopAll();
    resetRun(runDuration, song);
    elements.startOverlay.classList.remove("overlay--open");
    elements.resultOverlay.classList.remove("overlay--open");
    elements.resultOverlay.setAttribute("aria-hidden", "true");
    elements.game.dataset.phase = "countIn";
    elements.countdown.setAttribute("aria-hidden", "false");
    const beatSec = state.countInBeatSec;
    state.songStart = audio.time + beatSec * 4 + 0.16;
    audio.playBacking(song, state.songStart, state.runDuration);
    for (let index = 4; index > 0; index -= 1) {
      audio.count(state.songStart - index * beatSec, index === 1);
    }
    elements.startStatus.textContent = "";
    setStartBusy(false);
    animationFrame = requestAnimationFrame(frame);
  }

  function setStartBusy(busy) {
    elements.startButton.disabled = busy;
    elements.retryButton.disabled = busy;
    elements.chooseButton.disabled = busy;
    $$(".stage-choice").forEach((button) => { button.disabled = busy; });
    elements.startButton.setAttribute("aria-busy", String(busy));
    elements.retryButton.setAttribute("aria-busy", String(busy));
    elements.startButton.innerHTML = busy ? "음원 여는 중…" : "공연 시작 <span>▶</span>";
    elements.retryButton.textContent = busy ? "음원 여는 중…" : "다시 치기";
  }

  function stopGameLoop() {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = 0;
  }

  function frame() {
    const now = audio.time;
    const elapsed = now - state.songStart;
    if (state.phase === "countIn") updateCountdown(now);
    if (state.phase === "playing") {
      armHeldRoll(elapsed);
      updateActiveRoll(elapsed);
      markMisses(elapsed);
      updateBeat(elapsed);
      if (elapsed > state.runDuration + 1.15) finishGame();
    }
    draw(now);
    if (state.phase !== "result" && state.phase !== "ready") animationFrame = requestAnimationFrame(frame);
  }

  function updateCountdown(now) {
    const beatsLeft = Math.ceil((state.songStart - now) / state.countInBeatSec);
    const display = clamp(beatsLeft, 1, 4);
    if (display !== lastCountdown) {
      lastCountdown = display;
      elements.countdownValue.textContent = String(display);
      elements.countdownValue.style.animation = "none";
      void elements.countdownValue.offsetWidth;
      elements.countdownValue.style.animation = "";
    }
    if (now >= state.songStart) {
      state.phase = "playing";
      elements.game.dataset.phase = "playing";
      elements.countdown.setAttribute("aria-hidden", "true");
      showFeedback("시작!", "장단을 타요", "perfect");
    }
  }

  function updateBeat(elapsed) {
    let beat = -1;
    for (let index = 0; index < state.beatGrid.length; index += 1) {
      if (state.beatGrid[index].endpoint) break;
      if (state.beatGrid[index].time > elapsed) break;
      beat = index;
    }
    if (beat === lastBeat || beat < 0) return;
    lastBeat = beat;
    if (reducedMotion.matches) return;
    const livingBeatActors = hiddenLivingBeatActors.matches ? [] : [elements.livingTiger, elements.livingDeer];
    elements.beatWash.classList.remove("is-on");
    livingBeatActors.forEach((element) => element.classList.remove("is-beat"));
    void elements.game.offsetWidth;
    elements.beatWash.classList.add("is-on");
    livingBeatActors.forEach((element) => element.classList.add("is-beat"));
  }

  function requiredRollHoldSec(note) {
    return clamp(note.holdSec * TIMING_POLICY.rollHoldRatio, TIMING_POLICY.rollHoldMinSec, TIMING_POLICY.rollHoldMaxSec);
  }

  function beginRoll(note, sourceId, startedAt, judgmentAt = startedAt) {
    if (note.judged || activeRoll?.active || rollReleaseLocks.has(sourceId)) return;
    note.partial = { active: true, sourceId, startedAt, judgmentAt };
    activeRoll = { note, sourceId, startedAt, judgmentAt, active: true };
    rollReleaseLocks.add(sourceId);
    audio.roll(audio.time + 0.055, 3);
    showFeedback("더러…", "채편을 계속 누르고 있어요", "partial");
  }

  function armHeldRoll(elapsed) {
    if (activeRoll?.active || heldInputs.deok.size === 0) return;
    const candidate = state.chart.find((note) => (
      !note.decorative && !note.judged && note.type === "roll"
      && elapsed >= note.time - TIMING_POLICY.rollInputWindowSec
      && elapsed <= note.time + TIMING_POLICY.rollInputWindowSec
    ));
    if (!candidate) return;
    const owner = [...heldInputs.deok.entries()].find(([sourceId, sourceStartedAt]) => (
      !rollReleaseLocks.has(sourceId)
      && sourceStartedAt >= candidate.time - TIMING_POLICY.rollEarlyArmMaxSec
    ));
    if (!owner) return;
    const [sourceId, sourceStartedAt] = owner;
    const startedAt = Math.max(sourceStartedAt, candidate.time - TIMING_POLICY.rollInputWindowSec);
    const judgmentAt = Math.max(sourceStartedAt, candidate.time - TIMING_POLICY.inputWindowSec);
    beginRoll(candidate, sourceId, startedAt, judgmentAt);
  }

  function updateActiveRoll(elapsed) {
    if (!activeRoll || activeRoll.note.judged || !activeRoll.active) return;
    if (elapsed - activeRoll.startedAt >= requiredRollHoldSec(activeRoll.note)) {
      const note = activeRoll.note;
      activeRoll.active = false;
      judge(note, activeRoll.judgmentAt - note.time, false);
      showFeedback("더러러러!", "채편 굴림이 이어졌어요", "perfect");
      activeRoll = null;
    }
  }

  function markMisses(elapsed) {
    for (const note of state.chart) {
      if (note.decorative || note.judged) continue;
      if (note.type === "roll" && note.partial?.active) continue;
      let missDeadline = note.time + (note.type === "roll" ? TIMING_POLICY.rollMissWindowSec : TIMING_POLICY.missWindowSec);
      if (note.type === "deong" && note.partial) {
        missDeadline = Math.max(
          note.time + TIMING_POLICY.deongPartialMissWindowSec,
          note.partial.time + TIMING_POLICY.deongGapSec + TIMING_POLICY.partialCompletionGraceSec,
        );
      }
      if (note.type === "gideok" && note.partial) {
        missDeadline = Math.max(
          note.time + TIMING_POLICY.gideokPartialMissWindowSec,
          note.partial.startedAt + TIMING_POLICY.gideokGapSec + TIMING_POLICY.partialCompletionGraceSec,
        );
      }
      if (elapsed <= missDeadline) continue;
      note.judged = true;
      note.result = "miss";
      note.partial = null;
      if (activeRoll?.note === note) activeRoll = null;
      state.miss += 1;
      state.judged += 1;
      state.combo = 0;
      showFeedback("아깝다", "한 박을 놓쳤어요", "miss");
      spawnMissEffect(note);
      updateHud();
    }
  }

  function noteAcceptsInput(note, input) {
    if (note.type === "deong") return true;
    if (input === "kung") return note.type === "kung";
    return ["deok", "gideok", "roll"].includes(note.type);
  }

  function noteName(type) {
    return ({ deong: "덩", deok: "덕", gideok: "기덕", kung: "쿵", roll: "더러러러" })[type] || "장구 구음";
  }

  function press(type, sourceId, startedAt) {
    animateHero(type);
    if (!audio.context) return;
    if (type === "kung") audio.kung(); else audio.deok();
    if (state.phase !== "playing") return;

    const elapsed = startedAt;
    let candidate = null;
    let smallest = Infinity;
    for (const note of state.chart) {
      if (note.decorative || note.judged) continue;
      if (!noteAcceptsInput(note, type)) continue;
      const windowSec = note.type === "roll" ? TIMING_POLICY.rollInputWindowSec : TIMING_POLICY.inputWindowSec;
      const distance = note.partial && (note.type === "gideok" || note.type === "deong") ? 0 : Math.abs(note.time - elapsed);
      if (distance <= windowSec && distance < smallest) {
        candidate = note;
        smallest = distance;
      }
    }

    if (!candidate) {
      const nearby = state.chart.find((note) => !note.judged && !note.decorative && Math.abs(note.time - elapsed) <= TIMING_POLICY.inputWindowSec);
      if (nearby) showFeedback("주법 확인!", `이번에는 ${noteName(nearby.type)}이에요`, "wrong");
      else showFeedback("엇박", elapsed < 0 ? "조금 기다려요" : "다음 노트를 봐요", "wrong");
      return;
    }

    if (candidate.type === "deong") {
      if (!candidate.partial) {
        candidate.partial = { type, sourceId, time: elapsed };
        showFeedback("덩!", type === "kung" ? "덕도 같이 쳐요" : "쿵도 같이 쳐요", "partial");
        return;
      }
      if (candidate.partial.type === type) {
        candidate.partial = { type, sourceId, time: elapsed };
        return;
      }
      if (Math.abs(elapsed - candidate.partial.time) > TIMING_POLICY.deongGapSec) {
        candidate.partial = { type, sourceId, time: elapsed };
        showFeedback("함께!", "두 소리를 더 가깝게", "partial");
        return;
      }
      const combinedTime = (elapsed + candidate.partial.time) / 2;
      judge(candidate, combinedTime - candidate.time, true);
      return;
    }

    if (candidate.type === "gideok") {
      if (!candidate.partial) {
        candidate.partial = { sourceId, startedAt: elapsed, taps: 1 };
        showFeedback("기-", "채편을 한 번 더 빠르게!", "partial");
        return;
      }
      const gap = elapsed - candidate.partial.startedAt;
      if (gap > TIMING_POLICY.gideokGapSec) {
        candidate.partial = { sourceId, startedAt: elapsed, taps: 1 };
        showFeedback("기-", "두 타격을 더 가깝게", "partial");
        return;
      }
      judge(candidate, elapsed - candidate.time, false);
      showFeedback("기덕!", "앞꾸밈과 채가 붙었어요", "perfect");
      return;
    }

    if (candidate.type === "roll") {
      beginRoll(candidate, sourceId, elapsed);
      return;
    }

    judge(candidate, elapsed - candidate.time, false);
  }

  function release(type, sourceId) {
    if (type !== "deok" || !activeRoll || activeRoll.sourceId !== sourceId || !activeRoll.active || activeRoll.note.judged) return;
    const elapsed = audio.time - state.songStart;
    const heldFor = elapsed - activeRoll.startedAt;
    if (heldFor + TIMING_POLICY.rollReleaseGraceSec >= requiredRollHoldSec(activeRoll.note)) {
      const note = activeRoll.note;
      activeRoll.active = false;
      judge(note, activeRoll.judgmentAt - note.time, false);
      showFeedback("더러러러!", "채편 굴림이 이어졌어요", "perfect");
      activeRoll = null;
    } else {
      activeRoll.active = false;
      activeRoll.note.partial = null;
      activeRoll = null;
      showFeedback("조금 더!", "더러러러는 채편을 길게 눌러요", "wrong");
    }
  }

  function abortRollForSource(sourceId) {
    if (!activeRoll || activeRoll.sourceId !== sourceId) return;
    activeRoll.active = false;
    if (!activeRoll.note.judged) activeRoll.note.partial = null;
    activeRoll = null;
  }

  function clearPartialsForSource(sourceId) {
    for (const note of state.chart) {
      if (!note.judged && note.partial?.sourceId === sourceId) note.partial = null;
    }
  }

  function inputDown(type, sourceId, sourceElement) {
    const sources = heldInputs[type];
    if (sources.has(sourceId)) return;
    const startedAt = audio.context ? audio.time - state.songStart : -Infinity;
    sources.set(sourceId, startedAt);
    sourceElement?.classList.add("is-pressed");
    press(type, sourceId, startedAt);
  }

  function inputUp(type, sourceId, sourceElement) {
    const sources = heldInputs[type];
    if (!sources.has(sourceId)) return;
    sources.delete(sourceId);
    if (type === "deok") {
      release(type, sourceId);
      rollReleaseLocks.delete(sourceId);
    }
    if (sources.size === 0) sourceElement?.classList.remove("is-pressed");
  }

  function inputCancel(type, sourceId, sourceElement) {
    const sources = heldInputs[type];
    if (!sources.has(sourceId)) return;
    sources.delete(sourceId);
    abortRollForSource(sourceId);
    clearPartialsForSource(sourceId);
    rollReleaseLocks.delete(sourceId);
    if (sources.size === 0) sourceElement?.classList.remove("is-pressed");
  }

  function clearInputState() {
    heldInputs.kung.clear();
    heldInputs.deok.clear();
    heldKeys.clear();
    elements.kungButton.classList.remove("is-pressed");
    elements.deokButton.classList.remove("is-pressed");
    if (activeRoll && !activeRoll.note.judged) activeRoll.note.partial = null;
    activeRoll = null;
    rollReleaseLocks.clear();
  }

  function abortAllInputs() {
    for (const note of state.chart) {
      if (!note.judged) note.partial = null;
    }
    clearInputState();
  }

  function judge(note, errorSec, combined) {
    const errorMs = Math.abs(errorSec * 1000);
    let result;
    let points;
    if (errorMs <= TIMING_POLICY.perfectMs) { result = "perfect"; points = 1000; }
    else if (errorMs <= TIMING_POLICY.greatMs) { result = "great"; points = 700; }
    else { result = "good"; points = 420; }
    note.judged = true;
    note.result = result;
    note.errorMs = errorSec * 1000;
    state[result] += 1;
    state.judged += 1;
    state.combo += 1;
    state.maxCombo = Math.max(state.maxCombo, state.combo);
    state.timingErrors.push(note.errorMs);
    const comboBonus = Math.min(500, state.combo * 12);
    state.score += points + comboBonus + (combined ? 140 : 0);

    const centerSec = TIMING_POLICY.perfectMs / 1000;
    const timingText = errorSec < -centerSec ? "조금 빨라요" : errorSec > centerSec ? "조금 늦어요" : combined ? "두 소리가 하나로!" : "박 한가운데!";
    const label = result === "perfect" ? "반짝!" : result === "great" ? "좋아!" : "맞았어요";
    showFeedback(label, timingText, result);
    spawnHitEffect(note, result, combined);
    triggerStageImpact(result, combined);
    if (state.combo > 0 && state.combo % 10 === 0) showComboBurst();
    animateHero(combined ? "deong" : note.type, result === "perfect" && state.combo % 10 === 0);
    updateHud();
  }

  function animateHero(type, celebrate = false) {
    clearTimeout(heroTimer);
    elements.hero.classList.remove("is-kung", "is-deok", "is-cheer");
    if (celebrate || type === "deong") elements.hero.classList.add("is-cheer");
    else elements.hero.classList.add(type === "kung" ? "is-kung" : "is-deok");
    heroTimer = window.setTimeout(() => elements.hero.classList.remove("is-kung", "is-deok", "is-cheer"), celebrate ? 440 : 170);
  }

  function showFeedback(title, detail, kind) {
    elements.judgment.textContent = title;
    elements.judgment.dataset.kind = kind;
    elements.judgment.classList.remove("show");
    void elements.judgment.offsetWidth;
    elements.judgment.classList.add("show");
    elements.timing.textContent = detail;
  }

  function triggerStageImpact(result, combined) {
    if (reducedMotion.matches) return;
    const heavy = combined || result === "perfect" || state.combo % 10 === 0;
    window.clearTimeout(impactTimer);
    elements.game.classList.remove("impact-hit", "impact-heavy");
    void elements.game.offsetWidth;
    elements.game.classList.add(heavy ? "impact-heavy" : "impact-hit");
    impactTimer = window.setTimeout(() => elements.game.classList.remove("impact-hit", "impact-heavy"), heavy ? 260 : 150);
  }

  function showComboBurst() {
    const strong = elements.comboBurst.querySelector("strong");
    const label = elements.comboBurst.querySelector("span");
    strong.textContent = String(state.combo);
    label.textContent = state.combo >= 30 ? "신명나는 이어치기!" : state.combo >= 20 ? "장단이 이어져요!" : "이어치기!";
    window.clearTimeout(comboBurstTimer);
    elements.comboBurst.classList.remove("show");
    void elements.comboBurst.offsetWidth;
    elements.comboBurst.classList.add("show");
    comboBurstTimer = window.setTimeout(() => elements.comboBurst.classList.remove("show"), 900);
  }

  function updateHud() {
    elements.score.textContent = padScore(state.score);
    const realNotes = state.chart.filter((note) => !note.decorative).length || 1;
    const energy = clamp(((state.perfect + state.great * 0.72 + state.good * 0.35) / realNotes) * 100, 0, 100);
    elements.gauge.style.width = `${energy}%`;
    elements.combo.querySelector("strong").textContent = state.combo;
    elements.game.dataset.comboTier = state.combo >= 30 ? "3" : state.combo >= 20 ? "2" : state.combo >= 10 ? "1" : "0";
    elements.combo.classList.remove("pulse");
    void elements.combo.offsetWidth;
    if (state.combo > 0) elements.combo.classList.add("pulse");
    elements.perfectMini.textContent = `반짝 ${state.perfect}`;
    elements.missMini.textContent = `놓침 ${state.miss}`;
  }

  function finishGame() {
    abortAllInputs();
    state.phase = "result";
    elements.game.dataset.phase = "result";
    elements.livingTiger.classList.remove("is-beat");
    elements.livingDeer.classList.remove("is-beat");
    stopGameLoop();
    audio.stopAll();
    const total = state.perfect + state.great + state.good + state.miss || 1;
    const weighted = (state.perfect + state.great * 0.8 + state.good * 0.5) / total;
    const sd = standardDeviation(state.timingErrors);
    const stamp = weighted >= 0.92 ? "덩실!" : weighted >= 0.75 ? "얼쑤!" : weighted >= 0.55 ? "좋다!" : "한번 더!";
    const title = weighted >= 0.9 ? "장단이 고르게 이어졌어요" : weighted >= 0.7 ? "다섯 장구 구음을 잘 구별했어요" : "느린 마당에서 다시 맞춰 봐요";
    elements.resultStamp.textContent = stamp;
    elements.resultTitle.textContent = title;
    elements.resultScore.textContent = padScore(state.score);
    elements.perfectCount.textContent = state.perfect;
    elements.greatCount.textContent = state.great;
    elements.goodCount.textContent = state.good;
    elements.missCount.textContent = state.miss;
    elements.maxComboCount.textContent = state.maxCombo;
    elements.steadinessValue.textContent = state.timingErrors.length < 2 ? "--" : sd < 55 ? "아주 고름" : sd < 95 ? "고른 편" : "조금 흔들림";
    const bias = average(state.timingErrors);
    elements.resultNote.textContent = state.timingErrors.length < 2 ? "노트를 더 이어 치면 박의 고름도 볼 수 있어요." : bias < -60 ? "전체가 조금 빨랐어요. 꽃 판정선을 끝까지 보고 쳐 봐요." : bias > 60 ? "전체가 조금 늦었어요. 꽃 판정선에 닿는 순간을 노려 봐요." : "빠르거나 늦게 치우치지 않고 박 한가운데를 잘 찾았어요.";
    saveBest();
    elements.resultOverlay.classList.add("overlay--open");
    elements.resultOverlay.setAttribute("aria-hidden", "false");
  }

  function average(values) { return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0; }
  function standardDeviation(values) {
    if (values.length < 2) return 0;
    const mean = average(values);
    return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length);
  }

  function saveBest() {
    try {
      const key = `janggu-master-best-${selectedSong.id}`;
      const best = Number(localStorage.getItem(key) || 0);
      if (state.score > best) localStorage.setItem(key, String(Math.round(state.score)));
    } catch (_) { /* storage may be unavailable */ }
  }

  function selectSong(id) {
    selectedSong = SONGS[id] || SONGS.gutgeori;
    elements.songTitle.textContent = selectedSong.title;
    elements.songMeta.textContent = selectedSong.meta;
    elements.songBadge.textContent = selectedSong.badge;
    $$(".stage-choice").forEach((button) => button.classList.toggle("is-selected", button.dataset.song === selectedSong.id));
  }

  function spawnHitEffect(note, result, combined) {
    const position = notePosition(note, audio.time);
    const milestone = state.combo > 0 && state.combo % 10 === 0;
    const count = result === "perfect" ? 18 : result === "great" ? 12 : 8;
    const palette = combined ? [COLORS.teal, COLORS.red, COLORS.gold, COLORS.jade] : note.type === "kung" ? [COLORS.teal, COLORS.jade, COLORS.gold] : [COLORS.red, COLORS.gold, COLORS.ivory];
    for (let index = 0; index < count; index += 1) {
      const angle = (Math.PI * 2 * index) / count + Math.random() * 0.35;
      const speed = 90 + Math.random() * (result === "perfect" ? 230 : 150);
      particles.push({ x: position.x, y: position.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 0.68 + Math.random() * 0.25, age: 0, color: palette[index % palette.length], size: 4 + Math.random() * 8, shape: index % 3 });
    }
    rings.push({ x: position.x, y: position.y, age: 0, life: 0.5, color: result === "perfect" ? COLORS.gold : COLORS.paper, max: result === "perfect" ? 112 : 78 });
    while (particles.length > 120) particles.shift();
    while (rings.length > 12) rings.shift();
    if (combined || milestone) spawnRibbons(milestone ? 8 : 4);
  }

  function spawnMissEffect(note) {
    const position = notePosition(note, audio.time);
    rings.push({ x: position.x, y: position.y, age: 0, life: 0.45, color: "#7d7068", max: 55, dashed: true });
    while (rings.length > 12) rings.shift();
  }

  function spawnRibbons(count) {
    const colors = [COLORS.red, COLORS.teal, COLORS.gold, COLORS.jade, COLORS.purple];
    for (let index = 0; index < count; index += 1) {
      while (elements.ribbonLayer.childElementCount >= 24) elements.ribbonLayer.firstElementChild?.remove();
      const ribbon = document.createElement("i");
      ribbon.className = "ribbon";
      ribbon.style.left = `${20 + Math.random() * 65}%`;
      ribbon.style.top = `${62 + Math.random() * 25}%`;
      ribbon.style.background = colors[index % colors.length];
      ribbon.style.setProperty("--r", `${-40 + Math.random() * 80}deg`);
      elements.ribbonLayer.append(ribbon);
      ribbon.addEventListener("animationend", () => ribbon.remove(), { once: true });
    }
  }

  function resizeCanvas() {
    const rect = elements.canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvasWidth = Math.max(1, rect.width);
    canvasHeight = Math.max(1, rect.height);
    elements.canvas.width = Math.round(canvasWidth * dpr);
    elements.canvas.height = Math.round(canvasHeight * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function visualTravelSec() {
    const displayTravel = selectedSong.displayTravelSec || selectedSong.travelSec;
    if (canvasWidth < 520) return selectedSong.phoneDisplayTravelSec || Math.min(displayTravel, 1.5);
    return canvasWidth < 900 ? Math.min(displayTravel, 4.3) : displayTravel;
  }

  function notePosition(note, now) {
    const travel = visualTravelSec();
    const targetTime = state.songStart + note.time;
    const hitX = Math.max(105, canvasWidth * 0.12);
    const farX = canvasWidth + 70;
    const x = hitX + ((targetTime - now) / travel) * (farX - hitX);
    return { x, y: canvasHeight * 0.63, hitX };
  }

  function draw(now) {
    context.clearRect(0, 0, canvasWidth, canvasHeight);
    drawStaff(now);
    drawHitFlower(now);
    if (state.chart.length) drawNotes(now);
    const dt = lastDrawAt ? clamp(now - lastDrawAt, 0, 0.033) : 1 / 60;
    lastDrawAt = now;
    drawEffects(dt);
  }

  function drawStaff(now) {
    const top = canvasHeight * 0.23;
    context.save();
    context.globalAlpha = 0.32;
    context.strokeStyle = COLORS.ivory;
    context.lineWidth = 2;
    for (let line = 0; line < 5; line += 1) {
      const y = top + line * 10;
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(canvasWidth, y);
      context.stroke();
    }
    if (state.songStart) {
      const travel = visualTravelSec();
      const hitX = Math.max(105, canvasWidth * 0.12);
      const farX = canvasWidth + 70;
      for (const beat of state.beatGrid) {
        const at = state.songStart + beat.time;
        const x = hitX + ((at - now) / travel) * (farX - hitX);
        if (x < hitX || x > canvasWidth) continue;
        context.globalAlpha = beat.barStart ? 0.34 : 0.13;
        context.lineWidth = beat.barStart ? 4 : 2;
        context.beginPath();
        context.moveTo(x, 36);
        context.lineTo(x, canvasHeight - 36);
        context.stroke();
      }
    }
    context.restore();
  }

  function drawHitFlower(now) {
    const x = Math.max(105, canvasWidth * 0.12);
    const y = canvasHeight * 0.63;
    const isRunning = state.phase === "countIn" || state.phase === "playing";
    const beatPhase = isRunning ? getBeatPhase(now - state.songStart) : 1;
    const pulse = isRunning ? 1 + Math.pow(1 - beatPhase, 4) * 0.075 : 1;
    context.save();
    context.translate(x, y);
    context.scale(pulse, pulse);
    for (let petal = 0; petal < 10; petal += 1) {
      const angle = (petal / 10) * Math.PI * 2;
      context.fillStyle = petal % 2 ? COLORS.red : COLORS.gold;
      context.strokeStyle = COLORS.ink;
      context.lineWidth = 3;
      context.beginPath();
      context.arc(Math.cos(angle) * 42, Math.sin(angle) * 42, 18, 0, Math.PI * 2);
      context.fill(); context.stroke();
    }
    context.fillStyle = COLORS.paper;
    context.lineWidth = 6;
    context.beginPath(); context.arc(0, 0, 39, 0, Math.PI * 2); context.fill(); context.stroke();
    context.fillStyle = COLORS.ink;
    context.font = "900 13px system-ui";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("딱!", 0, 1);
    context.restore();
  }

  function drawNotes(now) {
    for (const note of state.chart) {
      const position = notePosition(note, now);
      if (position.x < position.hitX - 90 || position.x > canvasWidth + 100) continue;
      if (note.judged && !note.decorative && position.x <= position.hitX + 35) continue;
      const alpha = note.result === "miss" ? 0.25 : 1;
      drawNote(note, position.x, position.y, alpha);
    }
  }

  function drawNote(note, x, y, alpha) {
    context.save();
    context.globalAlpha = alpha;
    const noteScale = canvasHeight < 220 ? Math.min(selectedSong.noteScale || 1, 0.88) : selectedSong.noteScale || 1;
    context.translate(x, y);
    context.scale(noteScale, noteScale);
    x = 0;
    y = 0;
    if (note.type === "rest") {
      context.fillStyle = COLORS.paper;
      roundRect(context, x - 26, y - 31, 52, 62, 15);
      context.fill();
      context.strokeStyle = COLORS.ink; context.lineWidth = 4; context.stroke();
      context.fillStyle = COLORS.purple; context.font = "900 31px serif"; context.textAlign = "center"; context.textBaseline = "middle";
      context.fillText("𝄽", x, y - 2);
      context.font = "900 9px system-ui"; context.fillStyle = COLORS.ink; context.fillText("쉼", x, y + 21);
      context.restore();
      return;
    }

    const radius = note.type === "deong" ? 33 : note.type === "gideok" ? 35 : note.type === "roll" ? 31 : 28;
    context.strokeStyle = COLORS.ink;
    context.lineWidth = 6;
    if (note.type === "roll") {
      context.fillStyle = COLORS.gold;
      roundRect(context, x - 61, y - 27, 122, 54, 26); context.fill(); context.stroke();
      for (let index = 0; index < 4; index += 1) {
        context.fillStyle = COLORS.red;
        context.beginPath(); context.arc(x - 39 + index * 26, y, 8, 0, Math.PI * 2); context.fill();
      }
    } else if (note.type === "gideok") {
      context.fillStyle = COLORS.gold;
      context.beginPath(); context.moveTo(x - 17, y); context.lineTo(x + 17, y); context.stroke();
      for (const offset of [-15, 15]) {
        context.fillStyle = COLORS.red;
        context.beginPath(); context.arc(x + offset, y, 23, 0, Math.PI * 2); context.fill(); context.stroke();
      }
    } else {
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      if (note.type === "deong") {
        context.save(); context.clip();
        context.fillStyle = COLORS.teal; context.fillRect(x - radius, y - radius, radius, radius * 2);
        context.fillStyle = COLORS.red; context.fillRect(x, y - radius, radius, radius * 2);
        context.restore(); context.stroke();
      } else {
        context.fillStyle = note.type === "kung" ? COLORS.teal : COLORS.red;
        context.fill(); context.stroke();
      }
    }

    context.fillStyle = note.type === "roll" ? COLORS.ink : COLORS.paper;
    context.textAlign = "center";
    context.textBaseline = "middle";
    const labelScreenSize = note.type === "deong" ? 14 : note.type === "roll" || note.type === "gideok" ? 12 : 13;
    context.font = `900 ${labelScreenSize / noteScale}px system-ui`;
    context.fillText(noteName(note.type), x, y + 1);

    const notationY = y - 77;
    context.strokeStyle = COLORS.gold;
    context.globalAlpha = alpha * 0.55;
    context.lineWidth = 3;
    context.beginPath(); context.moveTo(x, y - radius - 6); context.lineTo(x, notationY + 20); context.stroke();
    context.globalAlpha = alpha;
    context.fillStyle = COLORS.paper;
    context.strokeStyle = COLORS.ink;
    context.lineWidth = 3;
    roundRect(context, x - 23, notationY - 22, 46, 44, 12); context.fill(); context.stroke();
    context.fillStyle = COLORS.ink;
    const notationScreenSize = note.notation.includes(".") ? 15 : 16;
    context.font = `900 ${notationScreenSize / noteScale}px Georgia, serif`;
    context.fillText(note.notation, x, notationY + 1);
    context.restore();
  }

  function roundRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function drawEffects(dt) {
    for (let index = particles.length - 1; index >= 0; index -= 1) {
      const p = particles[index];
      p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 260 * dt;
      if (p.age >= p.life) { particles.splice(index, 1); continue; }
      const alpha = 1 - p.age / p.life;
      context.save(); context.globalAlpha = alpha; context.translate(p.x, p.y); context.rotate(p.age * 8);
      context.fillStyle = p.color; context.strokeStyle = COLORS.ink; context.lineWidth = 2;
      if (p.shape === 0) { context.beginPath(); context.arc(0,0,p.size,0,Math.PI*2); context.fill(); context.stroke(); }
      else if (p.shape === 1) { context.fillRect(-p.size,-p.size/2,p.size*2,p.size); context.strokeRect(-p.size,-p.size/2,p.size*2,p.size); }
      else { drawFlowerParticle(context, p.size); }
      context.restore();
    }
    for (let index = rings.length - 1; index >= 0; index -= 1) {
      const ring = rings[index]; ring.age += dt;
      if (ring.age >= ring.life) { rings.splice(index, 1); continue; }
      const progress = ring.age / ring.life;
      context.save(); context.globalAlpha = 1 - progress; context.strokeStyle = ring.color; context.lineWidth = 8 * (1 - progress) + 2;
      if (ring.dashed) context.setLineDash([8,8]);
      context.beginPath(); context.arc(ring.x, ring.y, 30 + ring.max * progress, 0, Math.PI * 2); context.stroke(); context.restore();
    }
  }

  function drawFlowerParticle(ctx, size) {
    ctx.beginPath();
    for (let petal = 0; petal < 5; petal += 1) {
      const angle = (petal / 5) * Math.PI * 2;
      ctx.moveTo(Math.cos(angle) * size * 0.35, Math.sin(angle) * size * 0.35);
      ctx.arc(Math.cos(angle) * size * 0.7, Math.sin(angle) * size * 0.7, size * 0.42, 0, Math.PI * 2);
    }
    ctx.fill(); ctx.stroke();
  }

  function bindEvents() {
    elements.startButton.addEventListener("click", startGame);
    elements.retryButton.addEventListener("click", startGame);
    elements.chooseButton.addEventListener("click", () => {
      elements.resultOverlay.classList.remove("overlay--open");
      elements.resultOverlay.setAttribute("aria-hidden", "true");
      elements.startOverlay.classList.add("overlay--open");
      state.phase = "ready";
      elements.game.dataset.phase = "ready";
    });
    $$(".stage-choice").forEach((button) => button.addEventListener("click", () => selectSong(button.dataset.song)));

    window.addEventListener("keydown", (event) => {
      if (event.repeat || heldKeys.has(event.code)) return;
      if (!["KeyS", "KeyK"].includes(event.code)) return;
      event.preventDefault();
      heldKeys.add(event.code);
      if (event.code === "KeyS") inputDown("kung", `key:${event.code}`, elements.kungButton);
      if (event.code === "KeyK") inputDown("deok", `key:${event.code}`, elements.deokButton);
    });
    window.addEventListener("keyup", (event) => {
      if (event.code === "KeyS") inputUp("kung", `key:${event.code}`, elements.kungButton);
      if (event.code === "KeyK") inputUp("deok", `key:${event.code}`, elements.deokButton);
      heldKeys.delete(event.code);
    });
    window.addEventListener("blur", abortAllInputs);

    [[elements.kungButton, "kung"], [elements.deokButton, "deok"]].forEach(([button, type]) => {
      button.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        try { button.setPointerCapture?.(event.pointerId); } catch (_) { /* pointer capture is an enhancement */ }
        inputDown(type, `pointer:${event.pointerId}`, button);
      });
      const releasePointer = (event) => inputUp(type, `pointer:${event.pointerId}`, button);
      const cancelPointer = (event) => inputCancel(type, `pointer:${event.pointerId}`, button);
      button.addEventListener("pointerup", releasePointer);
      button.addEventListener("pointercancel", cancelPointer);
      button.addEventListener("lostpointercapture", cancelPointer);
    });
    const releasePointerAnywhere = (event) => {
      const sourceId = `pointer:${event.pointerId}`;
      inputUp("kung", sourceId, elements.kungButton);
      inputUp("deok", sourceId, elements.deokButton);
    };
    const cancelPointerAnywhere = (event) => {
      const sourceId = `pointer:${event.pointerId}`;
      inputCancel("kung", sourceId, elements.kungButton);
      inputCancel("deok", sourceId, elements.deokButton);
    };
    window.addEventListener("pointerup", releasePointerAnywhere);
    window.addEventListener("pointercancel", cancelPointerAnywhere);

    elements.soundButton.addEventListener("click", () => {
      audio.setMuted(!audio.muted);
      elements.soundButton.setAttribute("aria-pressed", String(audio.muted));
      elements.soundButton.setAttribute("aria-label", audio.muted ? "소리 켜기" : "소리 끄기");
      elements.soundButton.textContent = audio.muted ? "×" : "♪";
    });
    elements.fullscreenButton.addEventListener("click", async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await elements.game.requestFullscreen();
      } catch (_) { /* fullscreen may be blocked */ }
    });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) return;
      abortAllInputs();
      if (state.phase === "playing") showFeedback("잠깐!", "돌아오면 장단을 다시 봐요", "wrong");
    });
    window.addEventListener("pagehide", abortAllInputs);
  }

  bindEvents();
  selectSong("gutgeori");
  resizeObserver = new ResizeObserver(resizeCanvas);
  resizeObserver.observe(elements.canvas);
  resizeCanvas();
  draw(0);
})();
