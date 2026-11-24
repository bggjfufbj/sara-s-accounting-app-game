import { sanitizeCustomQuestions } from '../game/engine.ts';
import type { GameQuestion } from '../game/types.ts';

export const ID_REGEX = /^[a-zA-Z0-9_-]+$/;
export const MAX_TOPIC_LEN = 160;
export const MAX_HINT_LEN = 600;
export const MAX_EXPLANATION_LEN = 800;
export const MAX_ID_LEN = 64;

function clampText(raw: unknown, maxLen: number): string {
  return String(raw ?? '').trim().slice(0, maxLen);
}

export function sanitizeDocId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, MAX_ID_LEN);
  return cleaned.length > 0 ? cleaned : `q-${Date.now()}`;
}

export interface FirestoreQuestionCore {
  id: string;
  mode: GameQuestion['mode'];
  difficulty: GameQuestion['difficulty'];
  topic: string;
  timeLimitSec: number;
  ruleHint: string;
  explanation: string;
  questionData: Record<string, unknown>;
}

export function buildFirestoreQuestionFields(q: GameQuestion): FirestoreQuestionCore {
  const id = sanitizeDocId(q.id);
  const topic = clampText(q.topic || 'مبادئ المحاسبة', MAX_TOPIC_LEN) || 'مبادئ المحاسبة';
  const timeLimitSec = Math.max(10, Math.min(120, Math.round(Number(q.timeLimitSec) || 24)));
  const ruleHint = clampText(q.ruleHint, MAX_HINT_LEN);
  const explanation = clampText(q.explanation, MAX_EXPLANATION_LEN);

  let questionData: Record<string, unknown>;
  switch (q.mode) {
    case 'mcq':
      questionData = {
        prompt: clampText(q.prompt, 500),
        options: q.options.slice(0, 4).map((o) => clampText(o, 250)),
        correctIndex: Math.max(0, Math.min(3, Math.trunc(q.correctIndex))),
      };
      break;
    case 'journal_entry':
      questionData = {
        transaction: clampText(q.transaction, 500),
        amount: Math.max(1, Math.round(Number(q.amount) || 1000)),
        currency: clampText(q.currency || 'دینار', 32) || 'دینار',
        accounts: q.accounts.slice(0, 6).map((a) => clampText(a, 120)),
        correctDebit: clampText(q.correctDebit, 120),
        correctCredit: clampText(q.correctCredit, 120),
      };
      break;
    case 'debit_credit':
      questionData = {
        transaction: clampText(q.transaction, 500),
        targetAccount: clampText(q.targetAccount, 140),
        prompt: clampText(q.prompt, 300),
        correctSide: q.correctSide === 'credit' ? 'credit' : 'debit',
      };
      break;
    case 'true_false':
      questionData = {
        claim: clampText(q.claim, 500),
        ledgerRef: clampText(q.ledgerRef || topic, 120),
        correctAnswer: Boolean(q.correctAnswer),
      };
      break;
    case 'classify':
      questionData = {
        prompt: clampText(q.prompt, 400),
        items: q.items.slice(0, 4).map((item, idx) => ({
          id: sanitizeDocId(item.id || `c${idx + 1}`),
          label: clampText(item.label, 140),
          correctBucket: item.correctBucket,
        })),
      };
      break;
    case 'equation':
      questionData = {
        formulaTitle: clampText(q.formulaTitle, 200),
        prompt: clampText(q.prompt, 400),
        leftSide: q.leftSide.slice(0, 2).map((s) => ({
          label: clampText(s.label, 120),
          value: s.value === null ? null : Number(s.value),
        })),
        rightSide: q.rightSide.slice(0, 2).map((s) => ({
          label: clampText(s.label, 120),
          value: s.value === null ? null : Number(s.value),
        })),
        operatorRight: q.operatorRight === '-' ? '-' : '+',
        choices: q.choices.slice(0, 4).map((n) => Number(n)),
        correctValue: Number(q.correctValue),
        currency: clampText(q.currency || 'دینار', 32) || 'دینار',
      };
      break;
  }

  return {
    id,
    mode: q.mode,
    difficulty: q.difficulty === 'hard' ? 'hard' : 'easy',
    topic,
    timeLimitSec,
    ruleHint,
    explanation,
    questionData,
  };
}

export function firestoreDocToQuestion(data: Record<string, unknown>): GameQuestion | null {
  if (!data || typeof data !== 'object' || !data.questionData || typeof data.questionData !== 'object') {
    return null;
  }
  const reconstructed = {
    id: data.id,
    mode: data.mode,
    difficulty: data.difficulty,
    topic: data.topic,
    timeLimitSec: data.timeLimitSec,
    ruleHint: data.ruleHint,
    explanation: data.explanation,
    ...(data.questionData as Record<string, unknown>),
  };
  const sanitized = sanitizeCustomQuestions([reconstructed], 1);
  return sanitized[0] ?? null;
}
