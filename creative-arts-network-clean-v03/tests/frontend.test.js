
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
test('browser app retains drawing and startup functions',()=>{
  assert.match(app,/function renderGraph\(/);
  assert.match(app,/function renderDetail\(/);
  assert.match(app,/async function load\(/);
  assert.match(app,/\bload\(\);\s*$/);
});
test('uses the correct SVG namespace and labelled rectangles',()=>{
  assert.match(app,/http:\/\/www\.w3\.org\/2000\/svg/);
  assert.match(app,/group\.appendChild\(el\('rect'/);
});
