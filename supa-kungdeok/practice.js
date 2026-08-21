(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  function eventPerformanceTime(timeStamp) {
    const now = performance.now();
    let eventTime = Number(timeStamp);
    if (!Number.isFinite(eventTime) || eventTime <= 0) return now;
    if (eventTime > now + 60000 && Number.isFinite(performance.timeOrigin)) eventTime -= performance.timeOrigin;
    if (!Number.isFinite(eventTime) || Math.abs(eventTime - now) > 60000) return now;
    return Math.min(eventTime, now);
  }

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
    rollHoldMs: 220,
  };

  const METRONOME_TIMING = {
    startLeadSec: 0.07,
    lookaheadSec: 0.12,
    schedulerIntervalMs: 25,
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
      note: "국립국악원 교육 자료의 굿거리 기본형입니다. 메트로놈은 박과 세부박만 들려주며 장구 장단은 자동으로 재생하지 않습니다.",
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
      this.inputNodes = new Set();
      this.metronomeNodes = new Set();
      this.rollNodes = new Map();
    }

    get time() { return this.context ? this.context.currentTime : 0; }

    async ensureContext() {
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
    }

    async ensure() {
      await this.ensureContext();
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

    play(key, when = this.time, gainValue = 0.7, collection = null) {
      const buffer = this.buffers.get(key);
      if (!buffer || !this.context) return null;
      const source = this.context.createBufferSource();
      const gain = this.context.createGain();
      source.buffer = buffer;
      gain.gain.value = gainValue;
      source.connect(gain).connect(this.master);
      source.start(Math.max(this.time, when));
      this.nodes.add(source);
      collection?.add(source);
      source.addEventListener("ended", () => {
        this.nodes.delete(source);
        collection?.delete(source);
        source.disconnect();
        gain.disconnect();
      }, { once: true });
      return source;
    }

    playRollContinuation(ownerId, when = this.time + 0.008) {
      this.stopRoll(ownerId);
      const start = Math.max(this.time, when);
      const group = new Set();
      this.rollNodes.set(ownerId, group);
      [0, 0.072, 0.144].forEach((offset, index) => {
        const source = this.play("chae", start + offset, 0.52 - index * 0.06, group);
        source?.addEventListener("ended", () => {
          if (group.size === 0 && this.rollNodes.get(ownerId) === group) this.rollNodes.delete(ownerId);
        }, { once: true });
      });
    }

    stopRoll(ownerId) {
      const group = this.rollNodes.get(ownerId);
      if (!group) return;
      for (const source of group) {
        try { source.stop(this.time); } catch (_) { /* already ended */ }
      }
      this.rollNodes.delete(ownerId);
    }

    stopAllRolls() {
      for (const ownerId of [...this.rollNodes.keys()]) this.stopRoll(ownerId);
    }

    stopAllInputs() {
      for (const source of this.inputNodes) {
        try { source.stop(this.time); } catch (_) { /* already ended */ }
      }
      this.inputNodes.clear();
    }

    playMetronome(when, emphasis = "subdivision") {
      if (!this.context || !this.master) return;
      const start = Math.max(this.time, when);
      const first = emphasis === "first";
      const beat = emphasis === "beat";
      const duration = first ? 0.065 : beat ? 0.052 : 0.035;
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = first ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(first ? 1120 : beat ? 860 : 620, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(first ? 0.22 : beat ? 0.14 : 0.065, start + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(gain).connect(this.master);
      const entry = { oscillator, gain };
      this.metronomeNodes.add(entry);
      oscillator.addEventListener("ended", () => {
        this.metronomeNodes.delete(entry);
        oscillator.disconnect();
        gain.disconnect();
      }, { once: true });
      oscillator.start(start);
      oscillator.stop(start + duration + 0.015);
    }

    stopMetronome() {
      for (const entry of this.metronomeNodes) {
        try { entry.oscillator.stop(this.time); } catch (_) { /* already ended */ }
      }
      this.metronomeNodes.clear();
    }

    stopAll() {
      this.stopMetronome();
      this.stopAllInputs();
      this.stopAllRolls();
      for (const source of this.nodes) {
        try { source.stop(this.time); } catch (_) { /* already ended */ }
      }
      this.nodes.clear();
      this.rollNodes.clear();
    }
  }

  const elements = {
    tabs: $$(".pattern-tab"),
    tempo: $("#tempoRange"), tempoValue: $("#tempoValue"), beatUnit: $("#beatUnit"),
    startMetronome: $("#startMetronomeButton"), restartMetronome: $("#restartMetronomeButton"), stopMetronome: $("#stopMetronomeButton"),
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
  let metronomeRunning = false;
  let metronomeTimer = 0;
  let metronomeRequest = 0;
  let metronomeOriginAt = 0;
  let metronomeTickIndex = 0;
  let tempoRestartTimer = 0;
  let gestureSequence = 0;
  let inputGeneration = 0;
  const pendingInputSounds = [];
  let inputSoundFlushPromise = null;

  function discardPendingInputSounds() {
    for (const request of pendingInputSounds) request.resolveScheduled(null);
    pendingInputSounds.length = 0;
  }

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
    inputGeneration += 1;
    discardPendingInputSounds();
    audio.stopAllInputs();
    audio.stopAllRolls();
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
    stopMetronome(false);
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
    elements.beatPosition.textContent = "메트로놈 준비";
    elements.currentStroke.textContent = "장단을 고르고 직접 연주해 보세요";
  }

  function updateTempoLabel() {
    elements.tempoValue.textContent = `${elements.tempo.value} BPM`;
    elements.tempo.setAttribute("aria-valuetext", `${selectedPattern.beatUnit} = ${elements.tempo.value} BPM`);
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

  async function prepareMetronome() {
    try {
      await audio.ensureContext();
      return true;
    } catch (error) {
      elements.status.textContent = error.message;
      return false;
    }
  }

  function clearMetronomeScheduler() {
    if (metronomeTimer) window.clearTimeout(metronomeTimer);
    metronomeTimer = 0;
    audio.stopMetronome();
  }

  function scheduleMetronome() {
    if (!metronomeRunning || !audio.context) return;
    const beatSec = 60 / Number(elements.tempo.value);
    const tickSec = beatSec / selectedPattern.ticksPerBeat;
    const ticksPerBar = selectedPattern.beatsPerBar * selectedPattern.ticksPerBeat;
    const now = audio.time;
    let nextBeatAt = metronomeOriginAt + metronomeTickIndex * tickSec;
    if (nextBeatAt < now - 0.02) {
      metronomeTickIndex = Math.floor((now - metronomeOriginAt) / tickSec) + 1;
      nextBeatAt = metronomeOriginAt + metronomeTickIndex * tickSec;
    }
    const horizon = now + METRONOME_TIMING.lookaheadSec;
    while (nextBeatAt <= horizon) {
      const barTick = metronomeTickIndex % ticksPerBar;
      const emphasis = barTick === 0 ? "first" : barTick % selectedPattern.ticksPerBeat === 0 ? "beat" : "subdivision";
      audio.playMetronome(nextBeatAt, emphasis);
      metronomeTickIndex += 1;
      nextBeatAt = metronomeOriginAt + metronomeTickIndex * tickSec;
    }
    metronomeTimer = window.setTimeout(scheduleMetronome, METRONOME_TIMING.schedulerIntervalMs);
  }

  function beginMetronome(statusText) {
    clearMetronomeScheduler();
    metronomeRunning = true;
    metronomeTickIndex = 0;
    metronomeOriginAt = audio.time + METRONOME_TIMING.startLeadSec;
    elements.startMetronome.setAttribute("aria-pressed", "true");
    elements.startMetronome.textContent = "첫 박부터 다시 ▶";
    elements.stopMetronome.disabled = false;
    elements.beatPosition.textContent = "메트로놈 재생 중";
    elements.currentStroke.textContent = "첫 박은 높게, 세부박은 작게 들려요";
    elements.status.textContent = statusText;
    scheduleMetronome();
  }

  async function startMetronome(statusText = "메트로놈과 내 입력 소리만 들립니다. 장구 장단은 직접 연주해요.") {
    const request = ++metronomeRequest;
    if (!await prepareMetronome() || request !== metronomeRequest || document.hidden) return;
    beginMetronome(statusText);
  }

  function restartMetronome(updateStatus = true) {
    return startMetronome(updateStatus ? "첫 박부터 메트로놈을 다시 시작했습니다." : "메트로놈 빠르기를 바꿨습니다. 장구 장단은 직접 연주해요.");
  }

  function stopMetronome(updateStatus = true) {
    metronomeRequest += 1;
    metronomeRunning = false;
    if (tempoRestartTimer) window.clearTimeout(tempoRestartTimer);
    tempoRestartTimer = 0;
    clearMetronomeScheduler();
    elements.startMetronome.setAttribute("aria-pressed", "false");
    elements.startMetronome.textContent = "메트로놈 시작 ▶";
    elements.stopMetronome.disabled = true;
    elements.beatPosition.textContent = "메트로놈 준비";
    if (updateStatus) elements.status.textContent = "메트로놈을 멈췄습니다. 자유롭게 직접 연주할 수 있어요.";
  }

  function flushInputSoundQueue() {
    if (inputSoundFlushPromise) return;
    inputSoundFlushPromise = (async () => {
      if (!await prepareAudio()) {
        discardPendingInputSounds();
        return;
      }
      if (document.hidden) {
        discardPendingInputSounds();
        return;
      }

      const generation = inputGeneration;
      const queued = pendingInputSounds.splice(0);
      const batch = queued.filter((request) => request.generation === generation);
      for (const request of queued) {
        if (request.generation !== generation) request.resolveScheduled(null);
      }
      if (!batch.length) return;
      const firstInputAtMs = batch[0].inputAtMs;
      const firstSoundAt = audio.time + 0.012;
      for (const request of batch) {
        const relativeSec = Math.max(0, (request.inputAtMs - firstInputAtMs) / 1000);
        const key = request.type === "kung" ? "buk" : "chae";
        const gain = request.type === "kung" ? 0.72 : request.weak ? 0.42 : 0.64;
        const scheduledAt = firstSoundAt + relativeSec;
        const source = audio.play(key, scheduledAt, gain, audio.inputNodes);
        request.resolveScheduled(source ? scheduledAt : null);
      }
    })().catch((error) => {
      discardPendingInputSounds();
      elements.status.textContent = error.message;
    }).finally(() => {
      inputSoundFlushPromise = null;
      if (pendingInputSounds.length) flushInputSoundQueue();
    });
  }

  function playInput(type, weak = false, inputAtMs = performance.now()) {
    let resolveScheduled;
    const scheduled = new Promise((resolve) => { resolveScheduled = resolve; });
    pendingInputSounds.push({ type, weak, inputAtMs, generation: inputGeneration, resolveScheduled });
    flushInputSoundQueue();
    return scheduled;
  }

  async function playRollContinuation(gesture) {
    const generation = inputGeneration;
    const inputSoundAt = await gesture.inputSoundPromise;
    if (inputSoundAt === null || generation !== inputGeneration || gesture.cancelled || !gesture.rollRecognized || document.hidden) return;
    const preservedHoldAt = inputSoundAt + INPUT_TIMING.rollHoldMs / 1000 - 0.004;
    audio.playRollContinuation(gesture.id, Math.max(audio.time + 0.008, preservedHoldAt));
  }

  function announceStroke(type) {
    const played = STROKE_NAMES[type];
    elements.currentStroke.textContent = `방금 연주: ${played}`;
    elements.beatPosition.textContent = metronomeRunning ? "메트로놈 재생 중" : "자유 연주";
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
    announceStroke("roll");
    playRollContinuation(gesture);
    retireGesture(gesture);
  }

  function scheduleRollRecognition(gesture) {
    const remainingMs = INPUT_TIMING.rollHoldMs + 1 - (performance.now() - gesture.startedAtMs);
    const delayMs = remainingMs <= 0 ? 8 : remainingMs;
    gesture.rollTimer = window.setTimeout(() => {
      gesture.rollTimer = 0;
      if (performance.now() - gesture.startedAtMs + 0.001 < INPUT_TIMING.rollHoldMs) {
        scheduleRollRecognition(gesture);
        return;
      }
      recognizeRoll(gesture);
    }, delayMs);
  }

  function findGideokGesture(currentGesture) {
    let nearest = null;
    let nearestGap = Infinity;
    for (const gesture of activeGestures) {
      if (gesture === currentGesture || gesture.type !== "deok" || gesture.cancelled) continue;
      const gap = currentGesture.startedAtMs - gesture.startedAtMs;
      if (gap < INPUT_TIMING.doubleTapMinMs || gap > INPUT_TIMING.doubleTapMs || gap >= nearestGap) continue;
      if (gesture.rollRecognized) {
        if (!gesture.held || gap > INPUT_TIMING.rollHoldMs) continue;
        audio.stopRoll(gesture.id);
        gesture.rollRecognized = false;
        gesture.consumed = false;
      } else if (gesture.consumed) continue;
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

  function inputDown(type, sourceId, pad, timeStamp) {
    const sources = heldSources[type];
    if (sources.has(sourceId)) return;

    const nowMs = eventPerformanceTime(timeStamp);
    const gesture = {
      id: ++gestureSequence,
      type,
      sourceId,
      startedAtMs: nowMs,
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

    gesture.inputSoundPromise = playInput(type, false, nowMs);
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
        announceStroke("gideok");
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
    scheduleRollRecognition(gesture);
  }

  function inputUp(type, sourceId, pad, timeStamp) {
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
    if (!gesture.rollRecognized && !gesture.cancelled && !gesture.consumed && eventPerformanceTime(timeStamp) - gesture.startedAtMs >= INPUT_TIMING.rollHoldMs) {
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
    audio.stopRoll(gesture.id);
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
      inputDown(type, `pointer:${event.pointerId}`, button, event.timeStamp);
    });
    const releasePointer = (event) => inputUp(type, `pointer:${event.pointerId}`, button, event.timeStamp);
    const cancelPointer = (event) => cancelInput(type, `pointer:${event.pointerId}`, button);
    button.addEventListener("pointerup", releasePointer);
    button.addEventListener("pointercancel", cancelPointer);
    button.addEventListener("lostpointercapture", cancelPointer);
    button.addEventListener("click", (event) => {
      if (event.detail !== 0) return;
      const sourceId = `button:${type}`;
      inputDown(type, sourceId, button, event.timeStamp);
      window.setTimeout(() => inputUp(type, sourceId, button, performance.now()), 85);
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
    if (tempoRestartTimer) window.clearTimeout(tempoRestartTimer);
    if (metronomeRunning) {
      clearMetronomeScheduler();
      tempoRestartTimer = window.setTimeout(() => {
        tempoRestartTimer = 0;
        restartMetronome(false);
      }, 120);
    }
    elements.status.textContent = `메트로놈을 ${selectedPattern.beatUnit}=${elements.tempo.value}로 맞췄습니다. 장구 장단은 직접 연주합니다.`;
  });
  elements.startMetronome.addEventListener("click", () => startMetronome());
  elements.restartMetronome.addEventListener("click", () => restartMetronome());
  elements.stopMetronome.addEventListener("click", () => stopMetronome());

  bindPad(elements.bukPad, "kung");
  bindPad(elements.chaePad, "deok");
  const releasePointerAnywhere = (event) => {
    const sourceId = `pointer:${event.pointerId}`;
    inputUp("kung", sourceId, elements.bukPad, event.timeStamp);
    inputUp("deok", sourceId, elements.chaePad, event.timeStamp);
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
    inputDown(type, `key:${event.code}`, type === "kung" ? elements.bukPad : elements.chaePad, event.timeStamp);
  });
  window.addEventListener("keyup", (event) => {
    const type = event.code === "KeyS" ? "kung" : event.code === "KeyK" ? "deok" : null;
    if (!type) return;
    inputUp(type, `key:${event.code}`, type === "kung" ? elements.bukPad : elements.chaePad, event.timeStamp);
    heldKeys.delete(event.code);
  });
  window.addEventListener("blur", () => {
    resetGestureState();
    stopMetronome(false);
    audio.stopAll();
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) return;
    resetGestureState();
    stopMetronome(false);
    audio.stopAll();
  });
  window.addEventListener("pagehide", () => {
    resetGestureState();
    stopMetronome(false);
    audio.stopAll();
  });
  window.addEventListener("beforeunload", () => {
    stopMetronome(false);
    audio.stopAll();
  });

  validatePatterns();
  renderPattern();
})();
