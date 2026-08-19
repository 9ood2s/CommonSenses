(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  const SAMPLE_FILES = {
    buk: "./assets/audio/janggu-bukpyeon-one-shot.wav",
    chae: "./assets/audio/janggu-chaepyeon-one-shot.wav",
  };

  const STROKE_NAMES = {
    deong: "덩",
    kung: "쿵",
    deok: "덕",
    gideok: "기덕",
    roll: "더러러러",
  };

  const INPUT_TIMING = {
    simultaneousMs: 170,
    doubleTapMs: 300,
    doubleTapMinMs: 0,
    rollHoldMs: 360,
  };

  const PATTERNS = {
    gutgeori: {
      id: "gutgeori",
      title: "굿거리",
      kind: "국립국악원 자료 기본형",
      bpm: 54,
      tempoMin: 40,
      tempoMax: 80,
      beatUnit: "♩.",
      meterLabel: "3소박 × 4박 · 12/8",
      beatsPerBar: 4,
      sobakPerBeat: 3,
      ticksPerBeat: 3,
      layoutColumns: 4,
      phrase: "덩-기덕 / 쿵 더러러러 / 쿵-기덕 / 쿵 더러러러",
      note: "국립국악원 교육 자료의 굿거리 기본형입니다. 시각 안내만 움직이며 장단 소리는 자동으로 재생하지 않습니다.",
      events: [
        { step: 0, type: "deong" }, { step: 2, type: "gideok" },
        { step: 3, type: "kung" }, { step: 4, type: "roll", holdSteps: 2 },
        { step: 6, type: "kung" }, { step: 8, type: "gideok" },
        { step: 9, type: "kung" }, { step: 10, type: "roll", holdSteps: 2 },
      ],
    },
    samchae: {
      id: "samchae",
      title: "삼채",
      kind: "국립국악원 교과서표준악보집 첫 제시형",
      bpm: 96,
      tempoMin: 60,
      tempoMax: 120,
      beatUnit: "♩.",
      meterLabel: "3소박 × 4박 · 12/8",
      beatsPerBar: 4,
      sobakPerBeat: 3,
      ticksPerBeat: 3,
      layoutColumns: 4,
      phrase: "덩-- / 덩-- / 덩-덕 / 쿵덕-",
      note: "국립국악원 『교과서표준악보집』의 농악 삼채 장구 제시형 가운데 첫 장단을 두 버튼으로 옮겼습니다. 삼채 가락은 지역과 연행 맥락에 따라 달라질 수 있습니다.",
      events: [
        { step: 0, type: "deong" }, { step: 3, type: "deong" },
        { step: 6, type: "deong" }, { step: 8, type: "deok" },
        { step: 9, type: "kung" }, { step: 10, type: "deok" },
      ],
    },
    jajinmori: {
      id: "jajinmori",
      title: "자진모리",
      kind: "국악교육 내용 통일안(Ⅱ) 제시형",
      bpm: 108,
      tempoMin: 70,
      tempoMax: 144,
      beatUnit: "♩.",
      meterLabel: "3소박 × 4박 · 12/8",
      beatsPerBar: 4,
      sobakPerBeat: 3,
      ticksPerBeat: 3,
      layoutColumns: 4,
      phrase: "덩-- / 덩-- / 덩-덕 / 쿵--",
      note: "국립국악원이 공개한 『국악교육 내용 통일안(Ⅱ)』의 자진모리 제시형입니다. 특정 노래에 맞춘 변형이 아니라 장단 연습용 배열로 표시합니다.",
      events: [
        { step: 0, type: "deong" }, { step: 3, type: "deong" },
        { step: 6, type: "deong" }, { step: 8, type: "deok" },
        { step: 9, type: "kung" },
      ],
    },
    hwimori: {
      id: "hwimori",
      title: "휘모리",
      kind: "국악교육 내용 통일안(Ⅱ) 제시형",
      bpm: 128,
      tempoMin: 90,
      tempoMax: 144,
      beatUnit: "♩",
      meterLabel: "2소박 × 4박 · 4/4",
      beatsPerBar: 4,
      sobakPerBeat: 2,
      ticksPerBeat: 2,
      layoutColumns: 4,
      phrase: "덩- / 덕덕 / 쿵덕 / 쿵-",
      note: "국립국악원이 공개한 『국악교육 내용 통일안(Ⅱ)』의 휘모리(단모리) 제시형입니다. 이 형은 4/4의 2소박 4박이므로 여덟 칸으로 연습합니다.",
      events: [
        { step: 0, type: "deong" },
        { step: 2, type: "deok" }, { step: 3, type: "deok" },
        { step: 4, type: "kung" }, { step: 5, type: "deok" },
        { step: 6, type: "kung" },
      ],
    },
    semachi: {
      id: "semachi",
      title: "세마치",
      kind: "국립국악원 교과서표준악보집 제시형",
      bpm: 85,
      tempoMin: 60,
      tempoMax: 110,
      beatUnit: "♩.",
      meterLabel: "3소박 × 3박 · 9/8",
      beatsPerBar: 3,
      sobakPerBeat: 3,
      ticksPerBeat: 3,
      layoutColumns: 3,
      phrase: "덩-- / 덩-덕 / 쿵-덕",
      note: "국립국악원 『교과서표준악보집』의 세마치 제시형입니다. 여기서는 민요에서 쓰는 3소박 3박 구조를 아홉 칸으로 연습합니다.",
      events: [
        { step: 0, type: "deong" }, { step: 3, type: "deong" },
        { step: 5, type: "deok" }, { step: 6, type: "kung" },
        { step: 8, type: "deok" },
      ],
    },
    jungjungmori: {
      id: "jungjungmori",
      title: "중중모리",
      kind: "국립국악원 교과서표준악보집 제시형",
      bpm: 85,
      tempoMin: 60,
      tempoMax: 100,
      beatUnit: "♩.",
      meterLabel: "3소박 × 4박 · 12/8",
      beatsPerBar: 4,
      sobakPerBeat: 3,
      ticksPerBeat: 3,
      layoutColumns: 4,
      phrase: "덩-덕 / 쿵덕덕 / 쿵쿵덕 / 쿵-쿵",
      note: "국립국악원 『교과서표준악보집』의 중중모리 제시형입니다. 3소박 네 박을 열두 칸으로 연습합니다.",
      events: [
        { step: 0, type: "deong" }, { step: 2, type: "deok" },
        { step: 3, type: "kung" }, { step: 4, type: "deok" }, { step: 5, type: "deok" },
        { step: 6, type: "kung" }, { step: 7, type: "kung" }, { step: 8, type: "deok" },
        { step: 9, type: "kung" }, { step: 11, type: "kung" },
      ],
    },
    jungmori: {
      id: "jungmori",
      title: "중모리",
      kind: "국립국악원 교과서표준악보집 제시형",
      bpm: 85,
      tempoMin: 50,
      tempoMax: 100,
      beatUnit: "♩",
      meterLabel: "2소박 × 12박 · 12/4",
      beatsPerBar: 12,
      sobakPerBeat: 2,
      ticksPerBeat: 4,
      layoutColumns: 4,
      tickLabels: ["1소박", "1뒤", "2소박", "2뒤"],
      phrase: "덩 / 쉼 / 덕 / 쿵 / 덕-기 / 덕덕 / 쿵 / 쿵 / 덕 / 쿵 / 덕-기 / 덕덕",
      note: "국립국악원 『교과서표준악보집』의 중모리 제시형입니다. 기본 구조는 2소박 12박이며, ‘기’는 약하게 치는 덕이고 세부 타점은 16분음표 해상도로 표시합니다.",
      events: [
        { step: 0, type: "deong", notation: "♩" },
        { step: 8, type: "deok", notation: "♩" },
        { step: 12, type: "kung", notation: "♩" },
        { step: 16, type: "deok", notation: "♪." },
        { step: 19, type: "deok", weak: true, guum: "기", notation: "16분" },
        { step: 20, type: "deok", notation: "♪" }, { step: 22, type: "deok", notation: "♪" },
        { step: 24, type: "kung", notation: "♩" },
        { step: 28, type: "kung", notation: "♩" },
        { step: 32, type: "deok", notation: "♩" },
        { step: 36, type: "kung", notation: "♩" },
        { step: 40, type: "deok", notation: "♪." },
        { step: 43, type: "deok", weak: true, guum: "기", notation: "16분" },
        { step: 44, type: "deok", notation: "♪" }, { step: 46, type: "deok", notation: "♪" },
      ],
    },
  };

  class JangguSamples {
    constructor() {
      this.context = null;
      this.master = null;
      this.buffers = new Map();
      this.loading = null;
      this.nodes = new Set();
    }

    get time() { return this.context ? this.context.currentTime : 0; }

    async ensure() {
      if (window.location.protocol === "file:") {
        throw new Error("파일을 직접 열면 브라우저가 장구 소리를 차단합니다. 정적 서버에서 practice.html을 열어 주세요.");
      }
      if (!this.context) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) throw new Error("이 브라우저는 Web Audio를 지원하지 않습니다.");
        this.context = new AudioContextClass({ latencyHint: "interactive" });
        this.master = this.context.createGain();
        this.master.gain.value = 0.86;
        this.master.connect(this.context.destination);
      }
      if (this.context.state === "suspended") await this.context.resume();
      if (!this.loading) this.loading = this.loadAll();
      try {
        await this.loading;
      } catch (error) {
        this.loading = null;
        throw error;
      }
    }

    async loadAll() {
      await Promise.all(Object.entries(SAMPLE_FILES).map(async ([key, url]) => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`${url}을 불러오지 못했습니다 (${response.status}).`);
        this.buffers.set(key, await this.context.decodeAudioData(await response.arrayBuffer()));
      }));
    }

    play(key, when = this.time, gainValue = 0.7) {
      const buffer = this.buffers.get(key);
      if (!buffer || !this.context) return;
      const source = this.context.createBufferSource();
      const gain = this.context.createGain();
      source.buffer = buffer;
      gain.gain.value = gainValue;
      source.connect(gain).connect(this.master);
      source.start(Math.max(this.time, when));
      this.nodes.add(source);
      source.addEventListener("ended", () => {
        this.nodes.delete(source);
        source.disconnect();
        gain.disconnect();
      }, { once: true });
    }

    playRollContinuation() {
      const start = this.time + 0.018;
      [0, 0.072, 0.144].forEach((offset, index) => this.play("chae", start + offset, 0.52 - index * 0.06));
    }

    stopAll() {
      for (const source of this.nodes) {
        try { source.stop(this.time); } catch (_) { /* already ended */ }
      }
      this.nodes.clear();
    }
  }

  const elements = {
    tabs: $$(".pattern-tab"),
    tempo: $("#tempoRange"), tempoValue: $("#tempoValue"), beatUnit: $("#beatUnit"),
    startGuide: $("#startGuideButton"), restartGuide: $("#restartGuideButton"), stopGuide: $("#stopGuideButton"),
    status: $("#practiceStatus"), grid: $("#beatGrid"),
    patternKind: $("#patternKind"), patternTitle: $("#patternTitle"), meterLabel: $("#meterLabel"),
    patternPhrase: $("#patternPhrase"), patternNote: $("#patternNote"),
    beatPosition: $("#beatPosition"), currentStroke: $("#currentStroke"),
    bukPad: $("#bukPad"), chaePad: $("#chaePad"),
  };

  const audio = new JangguSamples();
  const heldSources = { kung: new Map(), deok: new Map() };
  const activeGestures = new Set();
  const heldKeys = new Set();
  let selectedPattern = PATTERNS.gutgeori;
  let guideRunning = false;
  let guideOriginMs = 0;
  let guideFrame = 0;
  let currentStep = -1;
  let gestureSequence = 0;

  function totalSteps(pattern = selectedPattern) {
    return pattern.beatsPerBar * pattern.ticksPerBeat;
  }

  function validatePatterns() {
    const validTypes = new Set(Object.keys(STROKE_NAMES));
    for (const pattern of Object.values(PATTERNS)) {
      if (!Number.isInteger(pattern.beatsPerBar) || pattern.beatsPerBar < 1) throw new Error(`${pattern.id}: beatsPerBar가 올바르지 않습니다.`);
      if (!Number.isInteger(pattern.sobakPerBeat) || pattern.sobakPerBeat < 1) throw new Error(`${pattern.id}: sobakPerBeat가 올바르지 않습니다.`);
      if (!Number.isInteger(pattern.ticksPerBeat) || pattern.ticksPerBeat < pattern.sobakPerBeat) throw new Error(`${pattern.id}: ticksPerBeat가 올바르지 않습니다.`);
      if (pattern.ticksPerBeat % pattern.sobakPerBeat !== 0) throw new Error(`${pattern.id}: 한 소박을 같은 수의 tick으로 나눌 수 없습니다.`);
      if (!Number.isInteger(pattern.layoutColumns) || pattern.layoutColumns < 1) throw new Error(`${pattern.id}: layoutColumns가 올바르지 않습니다.`);
      if (pattern.tickLabels && pattern.tickLabels.length !== pattern.ticksPerBeat) throw new Error(`${pattern.id}: tickLabels 수가 tick 수와 다릅니다.`);
      if (![pattern.tempoMin, pattern.bpm, pattern.tempoMax].every(Number.isFinite) || pattern.tempoMin > pattern.bpm || pattern.bpm > pattern.tempoMax) throw new Error(`${pattern.id}: 기본 BPM이 조절 범위를 벗어났습니다.`);
      let previousStep = -1;
      for (const event of pattern.events) {
        if (!Number.isInteger(event.step) || event.step < 0 || event.step >= totalSteps(pattern)) throw new Error(`${pattern.id}: 범위를 벗어난 타점이 있습니다.`);
        if (event.step <= previousStep) throw new Error(`${pattern.id}: 타점은 중복 없이 시간순이어야 합니다.`);
        if (!validTypes.has(event.type)) throw new Error(`${pattern.id}: 알 수 없는 주법 ${event.type}입니다.`);
        if (event.type === "roll" && (!Number.isInteger(event.holdSteps) || event.holdSteps < 1 || event.step + event.holdSteps > totalSteps(pattern))) throw new Error(`${pattern.id}: 굴림 길이가 올바르지 않거나 마디 경계를 넘습니다.`);
        previousStep = event.step;
      }
    }
    const tabPatternIds = new Set(elements.tabs.map((tab) => tab.dataset.pattern));
    for (const tab of elements.tabs) {
      if (!PATTERNS[tab.dataset.pattern]) throw new Error(`탭 ${tab.dataset.pattern}에 대응하는 장단 데이터가 없습니다.`);
    }
    for (const patternId of Object.keys(PATTERNS)) {
      if (!tabPatternIds.has(patternId)) throw new Error(`${patternId} 장단을 여는 탭이 없습니다.`);
    }
  }

  function eventAtStep(step) {
    return selectedPattern.events.find((event) => event.step === step) || null;
  }

  function rollOwnerAtStep(step) {
    return selectedPattern.events.find((event) => event.type === "roll" && step > event.step && step < event.step + (event.holdSteps || 1)) || null;
  }

  function notationForEvent(event) {
    if (!event) return "·";
    if (event.notation) return event.notation;
    if (event.type === "gideok") return "♫";
    if (event.type === "roll") return "♬";
    const index = selectedPattern.events.indexOf(event);
    const nextStep = selectedPattern.events[index + 1]?.step ?? totalSteps();
    const span = nextStep - event.step;
    if (selectedPattern.ticksPerBeat === 3) {
      if (span >= 3) return "♩.";
      if (span === 2) return "♩";
      return "♪";
    }
    if (selectedPattern.ticksPerBeat === 2) return span >= 2 ? "♩" : "♪";
    if (span >= 4) return "♩";
    if (span === 3) return "♪.";
    if (span === 2) return "♪";
    return "16분";
  }

  function eventLabel(event) {
    return event?.guum || (event ? STROKE_NAMES[event.type] : "");
  }

  function tickLabel(withinBeat) {
    return selectedPattern.tickLabels?.[withinBeat] || `${withinBeat + 1}소박`;
  }

  function resetGestureState() {
    for (const gesture of activeGestures) {
      if (gesture.deongTimer) window.clearTimeout(gesture.deongTimer);
      if (gesture.gideokTimer) window.clearTimeout(gesture.gideokTimer);
      if (gesture.rollTimer) window.clearTimeout(gesture.rollTimer);
      gesture.deongTimer = 0;
      gesture.gideokTimer = 0;
      gesture.rollTimer = 0;
      gesture.held = false;
      gesture.cancelled = true;
    }
    activeGestures.clear();
    heldSources.kung.clear();
    heldSources.deok.clear();
    heldKeys.clear();
    elements.bukPad.classList.remove("is-pressed");
    elements.chaePad.classList.remove("is-pressed");
  }

  function renderPattern() {
    resetGestureState();
    stopGuide(false);
    elements.patternKind.textContent = selectedPattern.kind;
    elements.patternTitle.textContent = selectedPattern.title;
    elements.meterLabel.textContent = selectedPattern.meterLabel;
    elements.patternPhrase.textContent = selectedPattern.phrase;
    elements.patternNote.textContent = selectedPattern.note;
    elements.beatUnit.textContent = selectedPattern.beatUnit;
    elements.tempo.min = String(selectedPattern.tempoMin);
    elements.tempo.max = String(selectedPattern.tempoMax);
    elements.tempo.value = String(selectedPattern.bpm);
    elements.grid.style.setProperty("--beat-columns", String(selectedPattern.layoutColumns || 4));
    elements.grid.setAttribute("aria-label", `${selectedPattern.beatsPerBar}박, 박마다 ${selectedPattern.sobakPerBeat}소박, ${totalSteps()}개 타점 안내 칸으로 표시한 ${selectedPattern.title}`);
    updateTempoLabel();
    elements.grid.replaceChildren();

    for (let beat = 0; beat < selectedPattern.beatsPerBar; beat += 1) {
      const group = document.createElement("div");
      group.className = "beat-group";
      group.dataset.beat = String(beat);
      group.dataset.label = `제${beat + 1}박`;
      group.style.setProperty("--steps-per-beat", String(selectedPattern.ticksPerBeat));
      group.setAttribute("role", "group");
      group.setAttribute("aria-label", `제${beat + 1}박`);
      for (let withinBeat = 0; withinBeat < selectedPattern.ticksPerBeat; withinBeat += 1) {
        const step = beat * selectedPattern.ticksPerBeat + withinBeat;
        const event = eventAtStep(step);
        const rollOwner = rollOwnerAtStep(step);
        const cell = document.createElement("div");
        cell.className = `step-cell${event ? "" : " is-empty"}${rollOwner ? " is-roll-tail" : ""}${event?.weak ? " is-weak" : ""}`;
        cell.dataset.step = String(step);
        cell.dataset.stepLabel = tickLabel(withinBeat);
        cell.setAttribute("role", "listitem");
        const label = event ? eventLabel(event) : rollOwner ? "굴림 계속" : "쉼";
        cell.setAttribute("aria-label", `${beat + 1}박 ${tickLabel(withinBeat)}, ${label}${event?.weak ? ", 약하게" : ""}`);
        const name = document.createElement("b");
        name.textContent = label;
        const notation = document.createElement("small");
        notation.textContent = event ? notationForEvent(event) : rollOwner ? "··" : "·";
        cell.append(name, notation);
        group.append(cell);
      }
      elements.grid.append(group);
    }
    setGuideStep(-1);
  }

  function updateTempoLabel() {
    elements.tempoValue.textContent = `${elements.tempo.value} BPM`;
    elements.tempo.setAttribute("aria-valuetext", `${selectedPattern.beatUnit} = ${elements.tempo.value} BPM`);
  }

  function timing() {
    const beatMs = 60000 / Number(elements.tempo.value);
    return { subdivisionMs: beatMs / selectedPattern.ticksPerBeat, barMs: beatMs * selectedPattern.beatsPerBar };
  }

  async function prepareAudio() {
    try {
      await audio.ensure();
      return true;
    } catch (error) {
      elements.status.textContent = error.message;
      return false;
    }
  }

  function startGuide() {
    guideRunning = true;
    guideOriginMs = performance.now() + 240;
    elements.startGuide.setAttribute("aria-pressed", "true");
    elements.startGuide.textContent = "시각 안내 다시 시작 ↻";
    elements.stopGuide.disabled = false;
    elements.status.textContent = "자동 소리 없이 박과 소박만 움직입니다. 직접 연주해요.";
    setGuideStep(0);
    if (guideFrame) cancelAnimationFrame(guideFrame);
    guideFrame = requestAnimationFrame(updateGuide);
  }

  function updateGuide(nowMs) {
    if (!guideRunning) return;
    const { subdivisionMs, barMs } = timing();
    if (nowMs < guideOriginMs) {
      guideFrame = requestAnimationFrame(updateGuide);
      return;
    }
    const elapsed = (nowMs - guideOriginMs) % barMs;
    const nextStep = clamp(Math.floor(elapsed / subdivisionMs), 0, totalSteps() - 1);
    if (nextStep !== currentStep) setGuideStep(nextStep);
    guideFrame = requestAnimationFrame(updateGuide);
  }

  function restartGuide() {
    guideOriginMs = performance.now() + 240;
    setGuideStep(0);
    if (!guideRunning) elements.status.textContent = "첫 박으로 돌아왔습니다. 시각 안내를 시작하거나 자유롭게 연주해요.";
  }

  function stopGuide(updateStatus = true) {
    guideRunning = false;
    if (guideFrame) cancelAnimationFrame(guideFrame);
    guideFrame = 0;
    elements.startGuide.setAttribute("aria-pressed", "false");
    elements.startGuide.textContent = "시각 안내 시작 ▶";
    elements.stopGuide.disabled = true;
    setGuideStep(-1);
    if (updateStatus) elements.status.textContent = "시각 안내를 멈췄습니다. 자유롭게 직접 연주할 수 있어요.";
  }

  function keepActiveBeatVisible(group) {
    if (!guideRunning || !group || window.innerWidth > 820) return;
    const groupRect = group.getBoundingClientRect();
    const nowPlayingRect = elements.beatPosition.closest(".now-playing").getBoundingClientRect();
    const padRect = elements.bukPad.closest(".audition-card").getBoundingClientRect();
    const topGuard = Math.max(8, nowPlayingRect.bottom + 12);
    const bottomGuard = Math.min(window.innerHeight - 12, padRect.top - 12);
    let delta = 0;
    if (groupRect.top < topGuard) delta = groupRect.top - topGuard;
    else if (groupRect.bottom > bottomGuard) delta = groupRect.bottom - bottomGuard;
    if (Math.abs(delta) < 4) return;
    window.scrollBy({ top: delta, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }

  function setGuideStep(step) {
    currentStep = step;
    $$(".step-cell").forEach((cell) => cell.classList.toggle("is-active", Number(cell.dataset.step) === step));
    let activeGroup = null;
    $$(".beat-group").forEach((group) => {
      const active = step >= 0 && Number(group.dataset.beat) === Math.floor(step / selectedPattern.ticksPerBeat);
      group.classList.toggle("is-active", active);
      if (active) activeGroup = group;
    });
    if (step < 0) {
      elements.beatPosition.textContent = "준비";
      elements.currentStroke.textContent = "장단을 고르고 직접 연주해 보세요";
      return;
    }
    const event = eventAtStep(step);
    const rollOwner = rollOwnerAtStep(step);
    elements.beatPosition.textContent = `제${Math.floor(step / selectedPattern.ticksPerBeat) + 1}박 · ${tickLabel(step % selectedPattern.ticksPerBeat)}`;
    elements.currentStroke.textContent = event ? `${eventLabel(event)}${event.weak ? "(약하게)" : ""} 자리 — 직접 연주해요` : rollOwner ? "더러러러를 계속 유지하는 자리" : "쉼 — 다음 타격을 기다려요";
    keepActiveBeatVisible(activeGroup);
  }

  async function playInput(type, weak = false) {
    if (!await prepareAudio()) return;
    audio.play(type === "kung" ? "buk" : "chae", audio.time + 0.012, type === "kung" ? 0.72 : weak ? 0.42 : 0.64);
  }

  async function playRollContinuation() {
    if (!await prepareAudio()) return;
    audio.playRollContinuation();
  }

  function announceStroke(type, guideStep = currentStep) {
    const played = STROKE_NAMES[type];
    if (!guideRunning || guideStep < 0) {
      elements.currentStroke.textContent = `방금 연주: ${played}`;
      elements.beatPosition.textContent = "자유 연주";
      return;
    }
    const expected = eventAtStep(guideStep);
    const rollOwner = rollOwnerAtStep(guideStep);
    if (expected?.type === type || (type === "roll" && (expected?.type === "roll" || rollOwner))) {
      elements.currentStroke.textContent = `좋아요 · 현재 ${expected?.weak ? `${eventLabel(expected)}(약하게)` : played} 자리`;
      return;
    }
    const expectedLabel = expected ? eventLabel(expected) : rollOwner ? "더러러러 유지" : "쉼";
    elements.currentStroke.textContent = `방금 ${played} · 현재는 ${expectedLabel} 자리`;
  }

  function clearGestureTimer(gesture, key) {
    if (!gesture[key]) return;
    window.clearTimeout(gesture[key]);
    gesture[key] = 0;
  }

  function retireGesture(gesture) {
    if (gesture.held || gesture.deongTimer || gesture.gideokTimer || gesture.rollTimer) return;
    activeGestures.delete(gesture);
  }

  function consumeGesture(gesture) {
    gesture.consumed = true;
    clearGestureTimer(gesture, "deongTimer");
    clearGestureTimer(gesture, "gideokTimer");
    clearGestureTimer(gesture, "rollTimer");
    retireGesture(gesture);
  }

  function recognizeRoll(gesture, allowReleased = false) {
    const isCurrentSource = heldSources.deok.get(gesture.sourceId) === gesture;
    if (gesture.rollRecognized || gesture.cancelled || gesture.consumed || (!allowReleased && (!gesture.held || !isCurrentSource))) return;
    if (allowReleased && performance.now() - gesture.startedAtMs < INPUT_TIMING.rollHoldMs) return;
    gesture.rollRecognized = true;
    gesture.consumed = true;
    clearGestureTimer(gesture, "deongTimer");
    clearGestureTimer(gesture, "gideokTimer");
    clearGestureTimer(gesture, "rollTimer");
    announceStroke("roll", gesture.guideStep);
    playRollContinuation();
    retireGesture(gesture);
  }

  function findGideokGesture(currentGesture) {
    let nearest = null;
    let nearestGap = Infinity;
    for (const gesture of activeGestures) {
      if (gesture === currentGesture || gesture.type !== "deok" || gesture.cancelled || gesture.consumed) continue;
      const gap = currentGesture.startedAtMs - gesture.startedAtMs;
      if (gap < INPUT_TIMING.doubleTapMinMs || gap > INPUT_TIMING.doubleTapMs || gap >= nearestGap) continue;
      nearest = gesture;
      nearestGap = gap;
    }
    return nearest;
  }

  function findSimultaneousGesture(currentGesture) {
    const otherType = currentGesture.type === "kung" ? "deok" : "kung";
    let nearest = null;
    let nearestGap = Infinity;
    for (const gesture of activeGestures) {
      if (gesture === currentGesture || gesture.type !== otherType) continue;
      const gap = currentGesture.startedAtMs - gesture.startedAtMs;
      if (gesture.cancelled || gesture.consumed || gesture.deongConsumed || gap > INPUT_TIMING.simultaneousMs || gap >= nearestGap) continue;
      nearest = gesture;
      nearestGap = gap;
    }
    return nearest;
  }

  function inputDown(type, sourceId, pad) {
    const sources = heldSources[type];
    if (sources.has(sourceId)) return;

    const nowMs = performance.now();
    const gesture = {
      id: ++gestureSequence,
      type,
      sourceId,
      startedAtMs: nowMs,
      guideStep: currentStep,
      held: true,
      cancelled: false,
      consumed: false,
      deongConsumed: false,
      rollRecognized: false,
      deongTimer: 0,
      gideokTimer: 0,
      rollTimer: 0,
    };
    sources.set(sourceId, gesture);
    activeGestures.add(gesture);
    pad.classList.add("is-pressed");

    const expectedNow = guideRunning && currentStep >= 0 ? eventAtStep(currentStep) : null;
    playInput(type, type === "deok" && expectedNow?.weak === true);
    announceStroke(type);

    gesture.deongTimer = window.setTimeout(() => {
      gesture.deongTimer = 0;
      retireGesture(gesture);
    }, INPUT_TIMING.simultaneousMs + 1);

    if (type === "deok") {
      const gideokGesture = findGideokGesture(gesture);
      if (gideokGesture) {
        consumeGesture(gideokGesture);
        consumeGesture(gesture);
        announceStroke("gideok", gesture.guideStep);
        return;
      }
    }

    const simultaneousGesture = findSimultaneousGesture(gesture);
    if (simultaneousGesture) {
      gesture.deongConsumed = true;
      simultaneousGesture.deongConsumed = true;
      consumeGesture(simultaneousGesture);
      consumeGesture(gesture);
      announceStroke("deong");
      return;
    }

    if (type !== "deok") return;
    gesture.gideokTimer = window.setTimeout(() => {
      gesture.gideokTimer = 0;
      retireGesture(gesture);
    }, INPUT_TIMING.doubleTapMs + 1);
    gesture.rollTimer = window.setTimeout(() => {
      gesture.rollTimer = 0;
      recognizeRoll(gesture);
    }, INPUT_TIMING.rollHoldMs);
  }

  function inputUp(type, sourceId, pad) {
    const sources = heldSources[type];
    const gesture = sources.get(sourceId);
    if (!gesture) return;
    sources.delete(sourceId);
    gesture.held = false;
    if (sources.size === 0) pad.classList.remove("is-pressed");
    if (type !== "deok") {
      retireGesture(gesture);
      return;
    }

    clearGestureTimer(gesture, "rollTimer");
    if (!gesture.rollRecognized && !gesture.cancelled && !gesture.consumed && performance.now() - gesture.startedAtMs >= INPUT_TIMING.rollHoldMs) {
      recognizeRoll(gesture, true);
    }
    retireGesture(gesture);
  }

  function cancelInput(type, sourceId, pad) {
    const sources = heldSources[type];
    const gesture = sources.get(sourceId);
    if (!gesture) return;
    sources.delete(sourceId);
    gesture.held = false;
    gesture.cancelled = true;
    gesture.consumed = true;
    clearGestureTimer(gesture, "deongTimer");
    clearGestureTimer(gesture, "gideokTimer");
    clearGestureTimer(gesture, "rollTimer");
    activeGestures.delete(gesture);
    if (sources.size === 0) pad.classList.remove("is-pressed");
  }

  function bindPad(button, type) {
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      try { button.setPointerCapture?.(event.pointerId); } catch (_) { /* capture is an enhancement */ }
      inputDown(type, `pointer:${event.pointerId}`, button);
    });
    const releasePointer = (event) => inputUp(type, `pointer:${event.pointerId}`, button);
    const cancelPointer = (event) => cancelInput(type, `pointer:${event.pointerId}`, button);
    button.addEventListener("pointerup", releasePointer);
    button.addEventListener("pointercancel", cancelPointer);
    button.addEventListener("lostpointercapture", cancelPointer);
    button.addEventListener("click", (event) => {
      if (event.detail !== 0) return;
      const sourceId = `button:${type}`;
      inputDown(type, sourceId, button);
      window.setTimeout(() => inputUp(type, sourceId, button), 85);
    });
  }

  elements.tabs.forEach((tab) => tab.addEventListener("click", () => {
    selectedPattern = PATTERNS[tab.dataset.pattern] || PATTERNS.gutgeori;
    elements.tabs.forEach((button) => {
      const selected = button === tab;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    renderPattern();
    elements.status.textContent = `${selectedPattern.title} 장단을 표시했습니다. 자동 재생 없이 직접 연주해요.`;
  }));

  elements.tempo.addEventListener("input", () => {
    updateTempoLabel();
    if (guideRunning) restartGuide();
    elements.status.textContent = `시각 안내를 ${selectedPattern.beatUnit}=${elements.tempo.value}로 맞췄습니다. 자동 소리는 나지 않습니다.`;
  });
  elements.startGuide.addEventListener("click", startGuide);
  elements.restartGuide.addEventListener("click", restartGuide);
  elements.stopGuide.addEventListener("click", () => stopGuide());

  bindPad(elements.bukPad, "kung");
  bindPad(elements.chaePad, "deok");
  const releasePointerAnywhere = (event) => {
    const sourceId = `pointer:${event.pointerId}`;
    inputUp("kung", sourceId, elements.bukPad);
    inputUp("deok", sourceId, elements.chaePad);
  };
  const cancelPointerAnywhere = (event) => {
    const sourceId = `pointer:${event.pointerId}`;
    cancelInput("kung", sourceId, elements.bukPad);
    cancelInput("deok", sourceId, elements.chaePad);
  };
  window.addEventListener("pointerup", releasePointerAnywhere);
  window.addEventListener("pointercancel", cancelPointerAnywhere);

  window.addEventListener("keydown", (event) => {
    if (event.repeat || heldKeys.has(event.code) || event.target instanceof HTMLInputElement) return;
    const type = event.code === "KeyS" ? "kung" : event.code === "KeyK" ? "deok" : null;
    if (!type) return;
    event.preventDefault();
    heldKeys.add(event.code);
    inputDown(type, `key:${event.code}`, type === "kung" ? elements.bukPad : elements.chaePad);
  });
  window.addEventListener("keyup", (event) => {
    const type = event.code === "KeyS" ? "kung" : event.code === "KeyK" ? "deok" : null;
    if (!type) return;
    inputUp(type, `key:${event.code}`, type === "kung" ? elements.bukPad : elements.chaePad);
    heldKeys.delete(event.code);
  });
  window.addEventListener("blur", resetGestureState);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) return;
    resetGestureState();
    if (guideRunning) stopGuide(false);
  });
  window.addEventListener("pagehide", () => {
    resetGestureState();
    stopGuide(false);
    audio.stopAll();
  });
  window.addEventListener("beforeunload", () => {
    stopGuide(false);
    audio.stopAll();
  });

  validatePatterns();
  renderPattern();
})();
