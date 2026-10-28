'use strict';
const fs = require('node:fs');
function extractArray(source, marker) {
  const at = source.indexOf('const ' + marker + '=');
  if (at < 0) throw new Error('Missing array: ' + marker);
  const open = source.indexOf('[', at);
  let depth = 0, quote = '', escaped = false;
  for (let i = open; i < source.length; i++) {
    const ch = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"') { quote = ch; continue; }
    if (ch === '[') depth++;
    else if (ch === ']') {
      depth--;
      if (depth === 0) return JSON.parse(source.slice(open, i + 1));
    }
  }
  throw new Error('Unclosed array: ' + marker);
}
const source = fs.readFileSync('practice.html', 'utf8');
const stimuli = extractArray(source, 'COMMON_STIMULI');
const questions = extractArray(source, 'COMMON_TEST');
const errors = [];
if (stimuli.length !== 4) errors.push('Expected four shared stimuli, found ' + stimuli.length);
if (questions.length !== 20) errors.push('Expected 20 common-test questions, found ' + questions.length);
const counts = new Map(), seen = new Set(), prompts = new Set();
let previous = null;
for (let i = 0; i < questions.length; i++) {
  const q = questions[i], label = 'question ' + (i + 1);
  if (!Array.isArray(q) || q.length !== 5) { errors.push(label + ': expected [prompt, options, answerIndex, explanation, stimulusIndex]'); continue; }
  if (typeof q[0] !== 'string' || !q[0].trim()) errors.push(label + ': empty prompt');
  if (!Array.isArray(q[1]) || q[1].length !== 4 || q[1].some(x => typeof x !== 'string' || !x.trim())) errors.push(label + ': expected four non-empty options');
  if (!Number.isInteger(q[2]) || q[2] < 0 || q[2] > 3) errors.push(label + ': invalid answer index');
  if (typeof q[3] !== 'string' || !q[3].trim()) errors.push(label + ': missing explanation');
  if (!Number.isInteger(q[4]) || q[4] < 0 || q[4] >= stimuli.length) errors.push(label + ': invalid stimulus index');
  if (q[4] !== previous) {
    if (seen.has(q[4])) errors.push(label + ': questions using the same stimulus are split across groups');
    seen.add(q[4]); previous = q[4];
  }
  counts.set(q[4], (counts.get(q[4]) || 0) + 1);
  const normalized = String(q[0] || '').normalize('NFKC').toLowerCase().replace(/\s+/g, '');
  if (prompts.has(normalized)) errors.push(label + ': duplicate prompt');
  prompts.add(normalized);
}
for (let i = 0; i < stimuli.length; i++) if (counts.get(i) !== 5) errors.push('Stimulus ' + i + ' should have exactly 5 linked questions, found ' + (counts.get(i) || 0));
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log('Information I common-test bank OK: 20 questions across four five-question stimulus groups.');
