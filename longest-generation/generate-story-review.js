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
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  vm.runInContext(source, context, {filename: file});
});

const payload = {
  sourceRevision: 'editorial-20260816',
  sourceFingerprint: '',
  acts: context.ACT_INFO,
  story: context.STORY,
  endings: context.ENDINGS
};
const sourceJson = JSON.stringify({acts: payload.acts, story: payload.story, endings: payload.endings});
payload.sourceFingerprint = `sha256:${crypto.createHash('sha256').update(sourceJson).digest('hex')}`;

const reviewPath = path.join(root, 'story-review.html');
const html = fs.readFileSync(reviewPath, 'utf8');
const safeJson = JSON.stringify(payload)
  .replace(/&/g, '\\u0026')
  .replace(/</g, '\\u003c')
  .replace(/>/g, '\\u003e');
const next = html.replace(
  /(<script id="reviewData" type="application\/json">)[\s\S]*?(<\/script>)/,
  `$1${safeJson}$2`
);

if (!html.includes('<script id="reviewData" type="application/json">')) {
  throw new Error('reviewData script block was not found');
}

const updated = next !== html;
if (updated) fs.writeFileSync(reviewPath, next);

const lineCount = context.STORY.reduce((sum, chapter) => sum + chapter.beats.filter((beat) => beat.type === 'line').length, 0);
const quizCount = context.STORY.reduce((sum, chapter) => sum + chapter.beats.filter((beat) => beat.type === 'quiz').length, 0);
const decisionCount = context.STORY.filter((chapter) => chapter.decision).length;
console.log(JSON.stringify({
  acts: context.ACT_INFO.length,
  chapters: context.STORY.length,
  lines: lineCount,
  quizzes: quizCount,
  decisions: decisionCount,
  endings: Object.keys(context.ENDINGS).length,
  updated,
  sourceRevision: payload.sourceRevision,
  sourceFingerprint: payload.sourceFingerprint
}, null, 2));
