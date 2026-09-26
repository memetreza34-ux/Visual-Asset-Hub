import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import test from 'node:test';

const source = fs.readFileSync(path.join(process.cwd(), 'web', 'expansion-dashboard.js'), 'utf8');
const css = fs.readFileSync(path.join(process.cwd(), 'web', 'expansion-dashboard.css'), 'utf8');

test('Ausbau-Dashboard besitzt globale nächste Aufgaben', () => {
  assert.match(source, /function globalTaskQueue/);
  assert.match(source, /Nächste Aufgaben/);
  assert.match(source, /tasks\.slice\(0, 6\)/);
  assert.match(css, /\.expansion-next-tasks/);
});

test('globale Aufgaben sortieren Review vor Suche', () => {
  assert.match(source, /taskRank\(a\.kind\) - taskRank\(b\.kind\)/);
  assert.match(source, /return kind === 'review' \? 0 : 1/);
});

test('globale Aufgaben starten keine Review- oder Suchaktion automatisch', () => {
  assert.match(source, /button\.addEventListener\('click', \(\) => openReview/);
  assert.match(source, /button\.addEventListener\('click', \(\) => openSearch/);
});
