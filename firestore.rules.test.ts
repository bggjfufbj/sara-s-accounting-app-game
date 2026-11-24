import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { ACCOUNTING_QUESTIONS } from './src/game/questions.ts';
import {
  buildFirestoreQuestionFields,
  firestoreDocToQuestion,
  ID_REGEX,
  MAX_EXPLANATION_LEN,
  MAX_HINT_LEN,
  MAX_ID_LEN,
  MAX_TOPIC_LEN,
  sanitizeDocId,
} from './src/firebase/questionCodec.ts';

test('firestore.rules covers every collection in firebase-blueprint.json and enforces Eight Pillars guards', () => {
  const blueprint = JSON.parse(fs.readFileSync('firebase-blueprint.json', 'utf8'));
  const rules = fs.readFileSync('firestore.rules', 'utf8');

  assert.match(rules, /rules_version\s*=\s*'2'/);
  assert.match(rules, /match \/\{document=\*\*\}\s*\{\s*allow read, write: if false;/);
  assert.match(rules, /request\.auth\.token\.email_verified == true/);
  assert.match(rules, /request\.time/);
  assert.match(rules, /affectedKeys\(\)\.hasOnly/);

  for (const collectionPath of Object.keys(blueprint.firestore)) {
    assert.ok(
      rules.includes(`match ${collectionPath}`),
      `Missing match block in firestore.rules for ${collectionPath}`
    );
  }
});

test('all 60 curriculum questions across all 6 modes round-trip cleanly through native Firestore codec within blueprint bounds', () => {
  assert.equal(ACCOUNTING_QUESTIONS.length, 60);
  for (const q of ACCOUNTING_QUESTIONS) {
    const encoded = buildFirestoreQuestionFields(q);
    assert.ok(ID_REGEX.test(encoded.id), `Invalid doc ID: ${encoded.id}`);
    assert.ok(encoded.id.length >= 1 && encoded.id.length <= MAX_ID_LEN);
    assert.ok(encoded.topic.length >= 1 && encoded.topic.length <= MAX_TOPIC_LEN);
    assert.ok(encoded.ruleHint.length <= MAX_HINT_LEN);
    assert.ok(encoded.explanation.length <= MAX_EXPLANATION_LEN);
    assert.ok(encoded.timeLimitSec >= 10 && encoded.timeLimitSec <= 120);
    assert.ok(
      Object.keys(encoded.questionData).length >= 1 &&
        Object.keys(encoded.questionData).length <= 16
    );

    const decoded = firestoreDocToQuestion(encoded as unknown as Record<string, unknown>);
    assert.ok(decoded, `Failed to reconstruct question ${q.id}`);
    assert.equal(decoded.id, q.id);
    assert.equal(decoded.mode, q.mode);
    assert.equal(decoded.difficulty, q.difficulty);
  }
});

test('dirty dozen boundary clamping prevents ID poisoning and oversized payloads', () => {
  const poisonedId = '../etc/passwd ' + 'a'.repeat(200);
  const safeId = sanitizeDocId(poisonedId);
  assert.ok(ID_REGEX.test(safeId));
  assert.ok(safeId.length <= MAX_ID_LEN);

  const baseMcq = ACCOUNTING_QUESTIONS.find((q) => q.mode === 'mcq')!;
  const hugePayload = buildFirestoreQuestionFields({
    ...baseMcq,
    id: poisonedId,
    topic: 'ت'.repeat(500),
    ruleHint: 'ه'.repeat(2000),
    explanation: 'ش'.repeat(4000),
    timeLimitSec: 9999,
  });
  assert.ok(hugePayload.topic.length <= MAX_TOPIC_LEN);
  assert.ok(hugePayload.ruleHint.length <= MAX_HINT_LEN);
  assert.ok(hugePayload.explanation.length <= MAX_EXPLANATION_LEN);
  assert.equal(hugePayload.timeLimitSec, 120);
});
