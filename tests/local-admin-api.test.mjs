import assert from 'node:assert/strict';
import test from 'node:test';
import { validateReviewPayload, validateUsagePayload } from '../scripts/local-admin-api.mjs';

const completeChecklist = {
  contentViewed: true,
  peopleAndBrandsChecked: true,
  rightsChecked: true,
  contextChecked: true
};

test('lokale Freigabe verlangt vollständige Pflichtprüfung', () => {
  const value = validateReviewPayload({
    assetId: 'VAH-GAINET01',
    decision: 'approve',
    reviewer: 'Arman',
    notes: 'Inhalt und Rechte geprüft.',
    quality: 4,
    checklist: completeChecklist
  });
  assert.equal(value.decision, 'approve');
  assert.equal(value.quality, 4);
  assert.throws(() => validateReviewPayload({
    assetId: 'VAH-GAINET01', decision: 'approve', reviewer: 'Arman', checklist: { ...completeChecklist, rightsChecked: false }
  }), /alle vier Prüfpunkte/);
});

test('Einschränkung benötigt eine Begründung', () => {
  assert.throws(() => validateReviewPayload({
    assetId: 'VAH-GAINET01', decision: 'restrict', reviewer: 'Arman', notes: ''
  }), /Begründung/);
});

test('Asset-ID und Entscheidung werden streng geprüft', () => {
  assert.throws(() => validateReviewPayload({
    assetId: 'falsch', decision: 'archive', reviewer: 'Arman'
  }), /assetId/);
  assert.throws(() => validateReviewPayload({
    assetId: 'VAH-!!!!!!!!', decision: 'archive', reviewer: 'Arman'
  }), /Format VAH/);
  assert.throws(() => validateReviewPayload({
    assetId: 'VAH-GAINET01', decision: 'delete', reviewer: 'Arman'
  }), /approve, restrict/);
});

test('reale Nutzung akzeptiert nur unterstützte Plattformen und HTTP-Links', () => {
  const value = validateUsagePayload({
    assetId: 'VAH-GAINET01',
    project: 'elektro-klar-reel-01',
    title: 'Schutzschalter Reel',
    platform: 'tiktok',
    url: 'https://example.com/content/1',
    notes: 'Hintergrund in Szene 2'
  });
  assert.equal(value.platform, 'tiktok');
  assert.throws(() => validateUsagePayload({
    assetId: 'VAH-GAINET01', project: 'test', platform: 'unknown-platform'
  }), /Ungültige Plattform/);
  assert.throws(() => validateUsagePayload({
    assetId: 'VAH-GAINET01', project: 'test', platform: 'youtube', url: 'file:///tmp/video'
  }), /HTTP/);
});
