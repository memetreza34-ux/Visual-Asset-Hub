import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import test from 'node:test';
import { allocateDurations, createShotPlan, planToCsv, planToMarkdown, splitScript } from '../web/script-planner-core.js';

const root = process.cwd();
const keywords = read('catalog/planner-keywords.json');
const channels = Object.fromEntries(['finance', 'ai', 'electro', 'combat-sports'].map((id) => [id, read(`catalog/channels/${id}.json`)]));

function record({ id, title, tags, text, status = 'approved', orientation = 'vertical', type = 'video' }) {
  return {
    id,
    filename: `${id}.mp4`,
    title,
    description: text,
    type,
    category: 'test',
    secondaryCategories: [],
    tags,
    searchAliases: [],
    orientation,
    status,
    qualityRating: 4,
    licenseStatus: 'licensed',
    attributionText: 'Test',
    preview: null,
    source: `https://example.com/${id}.mp4`,
    searchableText: `${title} ${text} ${tags.join(' ')}`.toLowerCase()
  };
}

test('Skript wird in Szenen zerlegt und Zeit exakt verteilt', () => {
  const scenes = splitScript('Erste Szene erklärt das Problem. Zweite Szene zeigt die Lösung.\nDritte Szene fasst alles zusammen.');
  assert.equal(scenes.length, 3);
  const timing = allocateDurations(scenes, 45);
  assert.equal(timing[0].start, 0);
  assert.equal(timing.at(-1).end, 45);
  assert.equal(timing.reduce((sum, item) => sum + item.duration, 0), 45);
});

test('Finanztext erkennt Aktien und Inflation', () => {
  const plan = planFor('finance', 'Aktien und ETFs können Vermögen aufbauen. Inflation senkt die Kaufkraft von Bargeld.', []);
  assert.equal(plan.scenes[0].collections[0].id, 'investing-stocks');
  assert.ok(plan.scenes[1].collections.some((item) => item.id === 'inflation-cost-of-living'));
});

test('Elektrotext erkennt RCD, Schutzschalter und Messung', () => {
  const assets = [record({ id: 'VAH-TEST1001', title: 'RCD Prüfung', tags: ['channel-electro', 'collection-circuit-breakers-rcd', 'rcd'], text: 'Elektriker prüft einen FI Schutzschalter mit Messgerät.' })];
  const plan = planFor('electro', 'Der RCD schützt bei Fehlerstrom. Danach wird die Anlage mit einem Messgerät geprüft.', assets);
  assert.equal(plan.scenes[0].collections[0].id, 'circuit-breakers-rcd');
  assert.ok(plan.scenes[0].assets.some((asset) => asset.id === 'VAH-TEST1001'));
  assert.ok(plan.scenes[1].collections.some((item) => ['testing-inspection', 'tools-measurement'].includes(item.id)));
});

test('Kampfsporttext erkennt Boxtraining und Sparring', () => {
  const plan = planFor('combat-sports', 'Beim Boxtraining verbessert der Athlet seinen Jab. Im Sparring trainiert er Timing und Distanz.', []);
  assert.ok(plan.scenes[0].collections.some((item) => item.id === 'boxing-training'));
  assert.equal(plan.scenes[1].collections[0].id, 'sparring');
});

test('KI-Text erkennt Chatbots und Automatisierung', () => {
  const plan = planFor('ai', 'Ein Chatbot beantwortet Kundenfragen. Automatisierung übernimmt wiederkehrende Workflows.', []);
  assert.equal(plan.scenes[0].collections[0].id, 'chatbots-assistants');
  assert.ok(plan.scenes[1].collections.some((item) => item.id === 'automation-workflows'));
});

test('Kurze Kürzel treffen nur ganze Wörter und keine Teilwörter', () => {
  const combat = planFor('combat-sports', 'Die Kombination aus sauberer Beinarbeit und guter Deckung verbessert das Boxtraining.', []);
  assert.ok(combat.scenes[0].collections.some((item) => item.id === 'boxing-training'));
  assert.ok(!combat.scenes[0].collections.some((item) => item.id === 'knockout-reaction'));

  const ai = planFor('ai', 'Im Kino läuft ein Film über moderne Softwareentwicklung.', []);
  assert.ok(!ai.scenes[0].collections.some((item) => item.id === 'ai-general'));
  assert.ok(ai.scenes[0].collections.some((item) => item.id === 'coding-development'));
});

test('Nur-freigegeben-Modus blockiert Review-Assets', () => {
  const assets = [record({ id: 'VAH-TEST1002', title: 'Aktienchart', tags: ['channel-finance', 'collection-investing-stocks', 'stocks'], text: 'Aktien und Investment', status: 'review' })];
  const openPlan = planFor('finance', 'Aktien können langfristig wachsen.', assets, false);
  const safePlan = planFor('finance', 'Aktien können langfristig wachsen.', assets, true);
  assert.equal(openPlan.scenes[0].assets[0].id, 'VAH-TEST1002');
  assert.equal(safePlan.scenes[0].assets.length, 0);
  assert.equal(safePlan.scenes[0].needsSearch, true);
});

test('Hauptvorschläge werden über Szenen möglichst nicht wiederholt', () => {
  const sharedTags = ['channel-finance', 'collection-investing-stocks', 'collection-inflation-cost-of-living', 'stocks', 'inflation'];
  const assets = [
    record({ id: 'VAH-TEST2001', title: 'Finanzmotiv Eins', tags: sharedTags, text: 'Aktien und Inflation' }),
    record({ id: 'VAH-TEST2002', title: 'Finanzmotiv Zwei', tags: sharedTags, text: 'Aktien und Inflation' })
  ];
  const plan = planFor('finance', 'Aktien können langfristig wachsen. Inflation senkt die Kaufkraft.', assets);
  assert.equal(plan.version, 2);
  assert.equal(plan.scenes.length, 2);
  assert.notEqual(plan.scenes[0].primaryAssetId, plan.scenes[1].primaryAssetId);
  assert.equal(plan.summary.uniquePrimaryAssetCount, 2);
  assert.equal(plan.summary.reusedPrimaryCount, 0);
});

test('Shotlist exportiert JSON-kompatible Struktur, CSV und Markdown', () => {
  const plan = planFor('finance', 'Ein Budget hilft beim Sparen.', []);
  const csv = planToCsv(plan);
  const markdown = planToMarkdown(plan);
  assert.match(csv, /Szene,Start,Ende,Dauer/);
  assert.match(csv, /Budget/);
  assert.match(markdown, /# Visual Asset Hub Shotlist/);
  assert.match(markdown, /Pexels-Suche/);
  assert.equal(plan.format, 'visual-asset-hub-shot-plan');
});

test('Weboberfläche bindet Skript-Planer und lokale Datenschutzhinweise ein', () => {
  const html = fs.readFileSync(path.join(root, 'web/index.html'), 'utf8');
  const browser = fs.readFileSync(path.join(root, 'web/script-planner.js'), 'utf8');
  const nav = fs.readFileSync(path.join(root, 'web/workspace-nav.js'), 'utf8');
  assert.match(html, /id="script-planner"/);
  assert.match(html, /script-planner\.css/);
  assert.match(html, /script-planner\.js/);
  assert.match(browser, /keine KI-API/);
  assert.match(browser, /planToCsv/);
  assert.match(browser, /vah:select-arsenal-collection/);
  assert.match(nav, /Skript planen/);
});

function planFor(channel, script, records, approvedOnly = false) {
  return createShotPlan({
    script,
    channel,
    channelData: channels[channel],
    records,
    keywordConfig: keywords,
    durationSeconds: 45,
    orientation: 'vertical',
    approvedOnly
  });
}

function read(relative) {
  return JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
}
