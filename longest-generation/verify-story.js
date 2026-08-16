'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = __dirname;
const context = {console};
context.window = context;
vm.createContext(context);

[
  'story.js',
  'expansion-base.js',
  'expansion-war.js',
  'expansion-politics.js',
  'expansion-aftermath.js',
  'expansion.js'
].forEach((file) => {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, {filename: file});
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function reviewSnapshot(html) {
  const match = html.match(/<script id="reviewData" type="application\/json">([\s\S]*?)<\/script>/);
  assert(match, 'reviewData script block is missing');
  return JSON.parse(match[1]);
}

function fieldMap(snapshot) {
  const fields = new Map();
  snapshot.story.forEach((chapter) => {
    const prefix = `story.ch${String(chapter.no).padStart(2, '0')}`;
    ['title', 'date', 'place', 'summary', 'evidenceTitle', 'evidenceText'].forEach((key) => fields.set(`${prefix}.${key}`, chapter[key]));
    ['name', 'role', 'quote'].forEach((key) => fields.set(`${prefix}.duel.${key}`, chapter.duel[key]));
    let lineNo = 0;
    chapter.beats.forEach((beat) => {
      if (beat.type === 'line') {
        lineNo += 1;
        const linePrefix = `${prefix}.line.${String(lineNo).padStart(3, '0')}`;
        ['text', 'label', 'name', 'role', 'date', 'place'].forEach((key) => {
          if (beat[key] != null && beat[key] !== '') fields.set(`${linePrefix}.${key}`, beat[key]);
        });
      } else if (beat.type === 'quiz') {
        ['label', 'prompt', 'context', 'fact', 'explanation'].forEach((key) => fields.set(`quiz.${beat.id}.${key}`, beat[key]));
        beat.choices.forEach((choice, index) => fields.set(`quiz.${beat.id}.choice.${index}`, choice));
      }
    });
  });
  return fields;
}

const chapters = context.STORY;
const quizzes = chapters.flatMap((chapter) => chapter.beats.filter((beat) => beat.type === 'quiz'));
const lines = chapters.flatMap((chapter) => chapter.beats.filter((beat) => beat.type === 'line'));
const bridges = chapters.flatMap((chapter) => chapter.beats.filter((beat) => beat.type === 'bridge'));
const decisions = chapters.filter((chapter) => chapter.decision).map((chapter) => chapter.no);
const quizIds = quizzes.map((quiz) => quiz.id);

assert(context.ACT_INFO.length === 12, `expected 12 acts, found ${context.ACT_INFO.length}`);
assert(chapters.length === 48, `expected 48 chapters, found ${chapters.length}`);
assert(lines.length === 294, `expected 294 lines, found ${lines.length}`);
assert(bridges.length === 13, `expected 13 narrative bridges, found ${bridges.length}`);
assert(quizzes.length === 144, `expected 144 quizzes, found ${quizzes.length}`);
assert(new Set(quizIds).size === quizIds.length, 'quiz ids are not unique');
assert(JSON.stringify(decisions) === JSON.stringify([4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48]), `unexpected decision chapters: ${decisions.join(', ')}`);
assert(Object.keys(context.ENDINGS).length === 5, `expected 5 endings, found ${Object.keys(context.ENDINGS).length}`);

const mixedBeatChapters = [];
chapters.forEach((chapter) => {
  chapter.beats.forEach((beat) => assert(['line', 'bridge', 'quiz', 'decision'].includes(beat.type), `chapter ${chapter.no} has an unsupported beat type: ${beat.type}`));
  assert(chapter.beats.filter((beat) => beat.type === 'quiz').length === 3, `chapter ${chapter.no} does not have three quizzes`);
  const firstQuiz = chapter.beats.findIndex((beat) => beat.type === 'quiz');
  let lastQuiz = -1;
  chapter.beats.forEach((beat, index) => { if (beat.type === 'quiz') lastQuiz = index; });
  const interleavedLines = chapter.beats.slice(firstQuiz, lastQuiz + 1).filter((beat) => beat.type === 'line' || beat.type === 'bridge');
  if (interleavedLines.length) mixedBeatChapters.push(chapter.no);
  const quizIndexes = chapter.beats.map((beat, index) => beat.type === 'quiz' ? index : -1).filter((index) => index >= 0);
  for (let index = 1; index < quizIndexes.length; index += 1) {
    const bridge = chapter.beats.slice(quizIndexes[index - 1] + 1, quizIndexes[index]);
    assert(bridge.some((beat) => beat.type === 'line' || beat.type === 'bridge'), `chapter ${chapter.no} has consecutive questions without a narrative bridge`);
  }
});
assert(mixedBeatChapters.includes(2), 'chapter 2 no longer interleaves the registry questions with the hearing scenes');

const chapterOne = chapters[0];
const chapterOneQ02 = chapterOne.beats.findIndex((beat) => beat.id === 'q02');
const chapterOneNight = chapterOne.beats.findIndex((beat) => beat.label === '밤 11시 48분');
assert(chapterOneQ02 >= 0 && chapterOneNight > chapterOneQ02, 'chapter 1 returns to the classroom debate after the late-night collapse begins');
const chapterThree = chapters[2];
const chapterThreeQ04 = chapterThree.beats.findIndex((beat) => beat.id === 'q04');
const chapterThreeMarch = chapterThree.beats.findIndex((beat) => beat.label === '전생자의 초라한 능력');
assert(chapterThreeQ04 >= 0 && chapterThreeMarch > chapterThreeQ04, 'chapter 3 returns from March 1592 to the 1591 registry question');
const chapterThreeQ126 = chapterThree.beats.findIndex((beat) => beat.id === 'q126');
const chapterThreeUsefulPlan = chapterThree.beats.findIndex((beat) => beat.label === '1590년 장마 · 처음 쓸모가 생긴 약속');
assert(chapterThreeQ126 === chapterThreeUsefulPlan + 1, 'chapter 3 asks about practical preparation before showing the family marks, meeting place, and tested route');

const chapterNine = chapters[8];
const chapterNineQ08 = chapterNine.beats.findIndex((beat) => beat.id === 'q08');
const chapterNineQ128 = chapterNine.beats.findIndex((beat) => beat.id === 'q128');
const chapterNineMeal = chapterNine.beats.findIndex((beat) => beat.label === '아전이 읽어 준 배급 순서');
assert(chapterNineQ08 < chapterNineQ128 && chapterNineQ128 < chapterNineMeal, 'chapter 9 returns to ledger definitions after the old man receives his meal');

const chapterTen = chapters[9];
const chapterTenQ56 = chapterTen.beats.findIndex((beat) => beat.id === 'q56');
const chapterTenJune = chapterTen.beats.findIndex((beat) => beat.label === '1593년 6월 · 진주에서 온 패전보');
const chapterTenQ58 = chapterTen.beats.findIndex((beat) => beat.id === 'q58');
const chapterTenReflection = chapterTen.beats.findIndex((beat) => beat.label === '두 사건 사이의 사람');
assert(chapterTenQ56 < chapterTenJune && chapterTenJune < chapterTenQ58 && chapterTenQ58 < chapterTenReflection, 'chapter 10 shows June and the emotional conclusion before returning to the February question');

const chapterEleven = chapters[10];
const chapterElevenWhy = chapterEleven.beats.findIndex((beat) => beat.label === '남해안 왜성과 새 중앙 군영');
const chapterElevenQ129 = chapterEleven.beats.findIndex((beat) => beat.id === 'q129');
const chapterElevenQ10 = chapterEleven.beats.findIndex((beat) => beat.id === 'q10');
const chapterElevenPlan = chapterEleven.beats.findIndex((beat) => beat.label === '재침을 앞두고 익힌 피란길');
assert(chapterElevenWhy < chapterElevenQ129 && chapterElevenQ129 < chapterElevenQ10 && chapterElevenQ10 < chapterElevenPlan, 'chapter 11 postpones the Japanese-garrison question until after the preparation conclusion');

const chapterThirteen = chapters[12];
assert(chapterThirteen.beats.findIndex((beat) => beat.id === 'q130') < chapterThirteen.beats.findIndex((beat) => beat.label === '서준이 실제로 맡은 일'), 'chapter 13 postpones the army comparison until after the closing joke');
const chapterFifteen = chapters[14];
assert(chapterFifteen.beats.findIndex((beat) => beat.id === 'q131') < chapterFifteen.beats.findIndex((beat) => beat.label === '마지막 논을 놓지 못한 태석'), 'chapter 15 returns to the Jeolla campaign after Taeseok is carried away');
const chapterEighteen = chapters[17];
assert(chapterEighteen.beats.findIndex((beat) => beat.id === 'q132') < chapterEighteen.beats.findIndex((beat) => beat.label === '서툰 작별'), 'chapter 18 returns to the withdrawal cause after the couple goes home');
const chapterThirty = chapters[29];
assert(chapterThirty.beats.findIndex((beat) => beat.label === '돌아온 사람과 남은 이름') < chapterThirty.beats.findIndex((beat) => beat.id === 'q137'), 'chapter 30 asks about missing soldiers before showing how survivors were checked');
const chapterThirtySeven = chapters[36];
assert(chapterThirtySeven.date === '1629.04—08' && String(chapterThirtySeven.beats[0].text).includes('1629년 봄'), 'chapter 37 starts in July and then returns to the same summer after three months');
const chapterFortyOne = chapters[40];
assert(chapterFortyOne.beats.findIndex((beat) => beat.id === 'q142') < chapterFortyOne.beats.findIndex((beat) => beat.label === '둘째 고비 · 줄어든 배급'), 'chapter 41 asks about the invasion route only after the siege conclusion');
const chapterFortySix = chapters[45];
const chapterFortySixQ120 = chapterFortySix.beats.findIndex((beat) => beat.id === 'q120');
const chapterFortySixUnknown = chapterFortySix.beats.findIndex((beat) => beat.label === '확인할 수 없다고 적다');
const chapterFortySixJune = chapterFortySix.beats.findIndex((beat) => beat.label === '봉림대군을 향한 시선');
assert(chapterFortySixQ120 < chapterFortySixUnknown && chapterFortySixUnknown < chapterFortySixJune, 'chapter 46 resumes the May poisoning argument after the September succession question');

const anchoredBonus = (context.CS_EXPANSION && context.CS_EXPANSION.bonus) || [];
assert(anchoredBonus.every((entry) => entry.afterBeat), 'a bonus question still relies on the automatic fallback position');

const anchoredDecisions = {
  12: '바뀐 길과 사흘을 다시 셈하다',
  20: 'q18',
  24: '대동법을 기다릴 수 없는 사람들',
  32: '고발장과 세 문서를 맞춰 보다',
  36: '열 줄로 센 열흘 치 곡식',
  40: '손자 곁에서 남은 말 한 필',
  48: 'q144'
};
const defaultDecisionChapters = [4, 8, 16, 28, 44];
let markerCount = 0;
chapters.forEach((chapter) => {
  const markerIndexes = chapter.beats.map((beat, index) => beat.type === 'decision' ? index : -1).filter((index) => index >= 0);
  markerCount += markerIndexes.length;
  if (Object.prototype.hasOwnProperty.call(anchoredDecisions, chapter.no)) {
    assert(markerIndexes.length === 1, `chapter ${chapter.no} does not have exactly one anchored decision marker`);
    const previous = chapter.beats[markerIndexes[0] - 1] || {};
    assert((previous.id || previous.label) === anchoredDecisions[chapter.no], `chapter ${chapter.no} decision marker moved away from ${anchoredDecisions[chapter.no]}`);
  }
  if (defaultDecisionChapters.includes(chapter.no)) assert(markerIndexes.length === 0, `chapter ${chapter.no} should use the default first-question transition`);
  if (chapter.decision) {
    assert(Array.isArray(chapter.decision.options) && chapter.decision.options.length === 3, `chapter ${chapter.no} decision does not have three options`);
    chapter.decision.options.forEach((option) => {
      ['label', 'description', 'resultTitle', 'result'].forEach((key) => assert(String(option[key] || '').trim(), `chapter ${chapter.no} decision option ${option.id || '?'} is missing ${key}`));
      assert(option.effects && Object.keys(option.effects).length, `chapter ${chapter.no} decision option ${option.id || '?'} has no route effect`);
    });
  }
});
assert(markerCount === 7, `expected 7 anchored decision markers, found ${markerCount}`);

const decisionResults = new Map();
chapters.forEach((chapter) => {
  if (!chapter.decision) return;
  chapter.decision.options.forEach((option) => decisionResults.set(option.id, option.result));
});
const immediateResultChecks = {
  'd04-love': '다음 배식에서는 어른 몫부터 줄여야 했다',
  'd12-honor': '사흘 동안 새 나루와 절까지 다시 걸어',
  'd12-survival': '길 연습은 봄갈이 뒤로 밀렸다',
  'd12-status': '함께 준비할 날은 하루만 남았다',
  'd16-love': '다음 날 아침 한 번뿐이었다',
  'd16-record': '다음 날 수레를 몰 사람이 줄었다',
  'd16-survival': '아이의 확인은 다음 날로 남았다',
  'd20-love': '이번 구매 줄에서는 물러났다',
  'd24-honor': '다음 날 다시 출두하라는 명을 받았다',
  'd24-survival': '그날 각 집의 겨울 곡식에서 빠진 양',
  'd24-record': '다음 요구를 따질 근거를 만들었다',
  'd40-status': '말은 관아를 향해 떠났고',
  'd40-love': '약속한 절로 떠나게 했다',
  'd40-record': '말 탄 장정은 먼 산마을로 떠났고',
  'd44-survival': '은 열 냥은 겨울 곡식과 봄 씨앗 값으로 묶였다',
  'd44-record': '위치와 몸값을 묻는 답신을 기다리는 동안'
};
Object.entries(immediateResultChecks).forEach(([id, phrase]) => {
  assert(String(decisionResults.get(id) || '').includes(phrase), `${id} no longer reports the immediate consequence before the shared story resumes`);
});
['d12-honor', 'd12-survival', 'd12-status'].forEach((id) => assert(!/재침 때|이듬해/.test(decisionResults.get(id)), `${id} jumps to a later war before chapter 13`));
['d16-love', 'd16-record', 'd16-survival'].forEach((id) => assert(!/초겨울|울산행/.test(decisionResults.get(id)), `${id} jumps to the Ulsan expedition before the September scenes`));
['d40-status', 'd40-love', 'd40-record'].forEach((id) => assert(!/다음 날에야|큰길에 들어선 뒤|세 마을은 .*움직였다/.test(decisionResults.get(id)), `${id} completes the evacuation before chapter 41 returns to the same night`));
assert(!/그해 귀환 행렬|굶주림을 넘기고/.test(decisionResults.get('d44-survival')), 'd44-survival finishes the winter before the autumn story resumes');
assert(!/세 가족은 붙들린 곳과 몸값을 알게 됐다|실제 귀환은 다음 사행/.test(decisionResults.get('d44-record')), 'd44-record completes the December reply before the October work begins');
const q134 = quizzes.find((quiz) => quiz.id === 'q134');
assert(q134 && /빼 달라고 했지만.*거절했다/.test(q134.context), 'q134 reopens Taeseok\'s rejected request as an unresolved present action');

const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
assert(appSource.includes('duelBeats:chapter.beats.slice(firstQuiz,lastQuiz+1)'), 'runtime no longer preserves interleaved scene and quiz beats');
assert(appSource.includes("beat.type==='line'||beat.type==='bridge'"), 'runtime no longer renders explicit narrative bridges');
assert(appSource.includes('function decisionMarkerFor('), 'runtime no longer resolves anchored decision markers');
assert(appSource.includes("duelBeat.type==='decision'"), 'runtime no longer renders decisions inside a chapter transition');
const expansionSource = fs.readFileSync(path.join(root, 'expansion.js'), 'utf8');
assert(expansionSource.includes('Bonus question is missing an explicit story anchor'), 'bonus questions can silently fall back to a chapter-ending position');
assert(expansionSource.includes('function uniqueAnchorIndex(') && expansionSource.includes("matches.length!==1)throw new Error"), 'story anchors can silently use a missing or duplicate match');
assert(appSource.includes("chapter.decision.afterBeat&&!decisionMarker)throw new Error"), 'an unresolved decision anchor can silently fall back before the first question');
const reviewSource = fs.readFileSync(path.join(root, 'story-review.html'), 'utf8');
assert(reviewSource.includes('실제 플레이 순서 · 도입부터 결과까지'), 'review screen no longer labels the actual play order');
assert(reviewSource.includes('장면 전환 · 인생 선택'), 'review screen no longer displays anchored decisions at their story transition');
assert(!reviewSource.includes("heading((chapter.decision?'3':'2')+' · 설전과 문제')"), 'review screen still groups every quiz separately from the story');

Object.entries(context.CHARACTERS).forEach(([key, character]) => {
  const source = String(character.src || '').split('?')[0];
  assert(source && fs.existsSync(path.join(root, source)), `missing character image for ${key}: ${source}`);
});
assert(context.CHARACTERS['jun-old'].src.includes('jun-old-respected.png'), 'jun-old does not use the respected elder portrait');
assert(context.CHARACTERS['jun-old-soft'].src.includes('jun-old-soft-respected.png'), 'jun-old-soft does not use the respected elder portrait');
const runtimeStoryText = JSON.stringify({story: chapters, endings: context.ENDINGS});
const bannedEditorialCoinages = [
  '메모', '피란단', '연표첩', '속환계', '구휼계', '출납표', '배급표', '징수표', '징발표',
  '반출표', '대조표', '배정표', '배치표', '물목표', '기록소', '확인소', '정비소', '접수소',
  '작성소', '개수소', '보급소', '실무자', '책임자', '담당자', '영수증', '집결지', '피란창고',
  '기록원', '공동 창고', '정치 평문', '피란 창고', '자료관', '수능에는', '문초소',
  '피란민 두 사람의 계약', '모든 소유권을 주는 판정', '인상착의', '통역·접촉 비용'
];
bannedEditorialCoinages.forEach((term) => assert(!runtimeStoryText.includes(term), `runtime story still contains editorial coinage: ${term}`));
assert(!JSON.stringify(chapters.slice(1)).includes('연표'), 'a Joseon-era chapter still uses the repeated timeline expression');
assert(!runtimeStoryText.includes('벌금과 추징'), 'the I Gwal rebellion chapter still uses modern penalty wording');
assert(!runtimeStoryText.includes('송사 비용'), 'a lawsuit is still described with vague modern cost wording');
assert(!runtimeStoryText.includes('적몰'), 'reader-facing story still uses the opaque confiscation term');
[
  '보리죽', '죽을 나누', '죽을 먹', '죽을 끓', '빈 죽그릇', '먹을 죽', '죽 한 그릇'
].forEach((term) => assert(!runtimeStoryText.includes(term), `porridge is still used as a default meal expression: ${term}`));
[
  '죽은 문서는 밥을 못 먹어', '마른 솥에서 밥이 생기', '산성도 배 속도'
].forEach((term) => assert(!runtimeStoryText.includes(term), `Yeonhwa still uses a repeated food metaphor: ${term}`));

const currentReview = reviewSnapshot(fs.readFileSync(path.join(root, 'story-review.html'), 'utf8'));
assert(currentReview.story.length === 48, 'review snapshot does not contain 48 chapters');
assert(currentReview.sourceRevision === 'editorial-20260816', `unexpected review revision: ${currentReview.sourceRevision}`);
assert(JSON.stringify(currentReview.acts) === JSON.stringify(context.ACT_INFO), 'review snapshot acts are stale');
assert(JSON.stringify(currentReview.story) === JSON.stringify(chapters), 'review snapshot story is stale');
assert(JSON.stringify(currentReview.endings) === JSON.stringify(context.ENDINGS), 'review snapshot endings are stale');
const currentFingerprint = `sha256:${crypto.createHash('sha256').update(JSON.stringify({acts: context.ACT_INFO, story: chapters, endings: context.ENDINGS})).digest('hex')}`;
assert(currentReview.sourceFingerprint === currentFingerprint, `review snapshot fingerprint is stale: ${currentReview.sourceFingerprint}`);

const protectedBaselinePath = path.join(root, 'USER_PROTECTED_FIELDS.json');
assert(fs.existsSync(protectedBaselinePath), 'USER_PROTECTED_FIELDS.json is missing');
const protectedBaseline = JSON.parse(fs.readFileSync(protectedBaselinePath, 'utf8'));
assert(protectedBaseline.format === 'commonsenses-longest-generation-protected-fields', `unexpected protected-field format: ${protectedBaseline.format}`);
assert(protectedBaseline.version === 1, `unexpected protected-field version: ${protectedBaseline.version}`);
const protectedKeys = Object.keys(protectedBaseline.fieldHashes);
assert(protectedKeys.length === 45, `expected 45 protected field hashes, found ${protectedKeys.length}`);
assert(protectedBaseline.authorizedPriorOverrides.length === 8, `expected 8 authorized prior overrides, found ${protectedBaseline.authorizedPriorOverrides.length}`);
const currentFields = fieldMap(currentReview);
const changedProtectedFields = protectedKeys.filter((key) => {
  assert(currentFields.has(key), `protected field is missing from the current story: ${key}`);
  const currentHash = `sha256:${crypto.createHash('sha256').update(String(currentFields.get(key))).digest('hex')}`;
  return currentHash !== protectedBaseline.fieldHashes[key];
});
assert(changedProtectedFields.length === 0, `protected canonical fields changed: ${changedProtectedFields.join(', ')}`);

const userJsonPath = '/Users/9ood2s/Downloads/longest-generation-script-edits-202608160621.json';
if (fs.existsSync(userJsonPath)) {
  const userJsonBuffer = fs.readFileSync(userJsonPath);
  const userEdits = JSON.parse(userJsonBuffer.toString('utf8'));
  const userJsonHash = crypto.createHash('sha256').update(userJsonBuffer).digest('hex');
  assert(userJsonHash === protectedBaseline.userEditJsonSha256, 'user edit JSON hash changed');
  const userKeys = userEdits.changes.map(({key}) => key).sort();
  assert(JSON.stringify(userKeys) === JSON.stringify(protectedKeys.slice().sort()), 'user edit JSON keys no longer match the protected-field baseline');
}
const protectedFields = `45 canonical fields unchanged (37 original + 8 authorized)`;

console.log(JSON.stringify({
  acts: context.ACT_INFO.length,
  chapters: chapters.length,
  lines: lines.length,
  bridges: bridges.length,
  quizzes: quizzes.length,
  decisions: decisions.length,
  endings: Object.keys(context.ENDINGS).length,
  protectedFields,
  elderPortraits: [context.CHARACTERS['jun-old'].src, context.CHARACTERS['jun-old-soft'].src]
}, null, 2));
