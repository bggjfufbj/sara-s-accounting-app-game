import { ACCOUNTING_QUESTIONS, TEAM_CATALOG } from './questions.ts';
import type {
  AnswerPayload,
  CompetitionMode,
  DifficultyLevel,
  GameMode,
  GameQuestion,
  InternalRoomState,
  LedgerBucket,
  Player,
  PublicRoomState,
  QuestionSource,
  RoomPhase,
  RoomSettings,
  RoundSummary,
  SubmittedAnswer,
  TeamId,
  TeamState,
} from './types.ts';

export const ALL_GAME_MODES: GameMode[] = [
  'journal_entry',
  'mcq',
  'debit_credit',
  'classify',
  'equation',
  'true_false',
];

export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  competitionMode: 'teams',
  questionSource: 'auto',
  difficulty: 'mixed',
  teamCount: 6,
  roundCount: 6,
  enabledModes: [...ALL_GAME_MODES],
};

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateRoomCode(rng: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += CODE_ALPHABET[Math.floor(rng() * CODE_ALPHABET.length)];
  }
  return code;
}

export function validatePlayerName(rawName: string): { ok: true; value: string } | { ok: false; error: string } {
  const trimmed = rawName.trim().replace(/\s+/g, ' ');
  if (trimmed.length < 2) {
    return { ok: false, error: 'تکایە ناوی خۆت بنووسە (لانیکەم ٢ پیت).' };
  }
  if (trimmed.length > 24) {
    return { ok: false, error: 'ناوەکە زۆر درێژە (ئەوپەڕی ٢٤ پیت).' };
  }
  return { ok: true, value: trimmed };
}

export function validateRoomCode(rawCode: string): { ok: true; value: string } | { ok: false; error: string } {
  const cleaned = rawCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (cleaned.length !== 4) {
    return { ok: false, error: 'کۆدی ژوور دەبێت ٤ پیت یان ژمارە بێت.' };
  }
  return { ok: true, value: cleaned };
}

export function buildTeams(teamCount: 2 | 3 | 4 | 5 | 6): TeamState[] {
  return TEAM_CATALOG.slice(0, teamCount).map((meta) => ({
    ...meta,
    score: 0,
    roundDelta: 0,
    synergyBonus: 0,
    correctRounds: 0,
  }));
}

export function getParticipatingPlayers(players: Player[]): Player[] {
  return players.filter((p) => !p.isSupervisor);
}

export function pickBalancedTeam(teams: TeamState[], players: Player[]): TeamId {
  const counts = new Map<TeamId, number>();
  for (const t of teams) counts.set(t.id, 0);
  for (const p of players) {
    if (p.connected && !p.isSupervisor && p.teamId && counts.has(p.teamId)) {
      counts.set(p.teamId, (counts.get(p.teamId) ?? 0) + 1);
    }
  }
  let best = teams[0].id;
  let minCount = Infinity;
  for (const t of teams) {
    const c = counts.get(t.id) ?? 0;
    if (c < minCount) {
      minCount = c;
      best = t.id;
    }
  }
  return best;
}

export function normalizeSettings(input?: Partial<RoomSettings>): RoomSettings {
  const competitionMode: CompetitionMode =
    input?.competitionMode === 'individual' || input?.competitionMode === 'teams'
      ? input.competitionMode
      : DEFAULT_ROOM_SETTINGS.competitionMode;

  const questionSource: QuestionSource =
    input?.questionSource === 'custom' || input?.questionSource === 'auto'
      ? input.questionSource
      : DEFAULT_ROOM_SETTINGS.questionSource;

  const difficulty: DifficultyLevel =
    input?.difficulty === 'easy' || input?.difficulty === 'mixed' || input?.difficulty === 'hard'
      ? input.difficulty
      : DEFAULT_ROOM_SETTINGS.difficulty;

  const teamCount: 2 | 3 | 4 | 5 | 6 =
    input?.teamCount === 2 ||
    input?.teamCount === 3 ||
    input?.teamCount === 4 ||
    input?.teamCount === 5 ||
    input?.teamCount === 6
      ? input.teamCount
      : DEFAULT_ROOM_SETTINGS.teamCount;

  const roundCount: 6 | 10 | 15 =
    input?.roundCount === 6 || input?.roundCount === 10 || input?.roundCount === 15
      ? input.roundCount
      : DEFAULT_ROOM_SETTINGS.roundCount;

  const validModes = Array.isArray(input?.enabledModes)
    ? input.enabledModes.filter((m): m is GameMode => ALL_GAME_MODES.includes(m))
    : DEFAULT_ROOM_SETTINGS.enabledModes;

  const enabledModes = validModes.length > 0 ? Array.from(new Set(validModes)) : [...ALL_GAME_MODES];

  return { competitionMode, questionSource, difficulty, teamCount, roundCount, enabledModes };
}

const VALID_BUCKETS: LedgerBucket[] = ['assets', 'liabilities_equity', 'revenue', 'expenses'];

function cleanText(val: unknown, maxLen: number): string {
  if (typeof val !== 'string') return '';
  return val.trim().replace(/\s+/g, ' ').slice(0, maxLen);
}

function clampTimeLimit(val: unknown, fallback: number): number {
  const num = typeof val === 'number' && Number.isFinite(val) ? Math.round(val) : fallback;
  return Math.max(10, Math.min(90, num));
}

export function sanitizeCustomQuestions(raw: unknown, maxCount = 30): GameQuestion[] {
  if (!Array.isArray(raw)) return [];
  const out: GameQuestion[] = [];

  for (let i = 0; i < raw.length && out.length < maxCount; i++) {
    const item = raw[i] as Record<string, unknown> | null;
    if (!item || typeof item !== 'object') continue;
    const id = cleanText(item.id, 48) || `custom-${Date.now()}-${i + 1}`;
    const difficulty = item.difficulty === 'hard' ? 'hard' : 'easy';
    const topic = cleanText(item.topic, 80) || 'پرسیاری مامۆستا';
    const ruleHint = cleanText(item.ruleHint, 220) || 'پرسیارێکی تایبەتی مامۆستا — بە وریایی وەڵام بدەرەوە.';
    const explanation = cleanText(item.explanation, 360) || 'ئەمە وەڵامە دروستەکەی مامۆستایە بۆ ئەم پرسیارە.';

    if (item.mode === 'mcq') {
      const prompt = cleanText(item.prompt, 260);
      const rawOpts = Array.isArray(item.options) ? item.options.map((o) => cleanText(o, 140)) : [];
      if (!prompt || rawOpts.length !== 4 || rawOpts.some((o) => o.length === 0)) continue;
      const correctIndex =
        typeof item.correctIndex === 'number' &&
        Number.isInteger(item.correctIndex) &&
        item.correctIndex >= 0 &&
        item.correctIndex < 4
          ? item.correctIndex
          : 0;
      out.push({
        id,
        mode: 'mcq',
        difficulty,
        topic,
        prompt,
        options: [rawOpts[0], rawOpts[1], rawOpts[2], rawOpts[3]],
        correctIndex,
        timeLimitSec: clampTimeLimit(item.timeLimitSec, 24),
        ruleHint,
        explanation,
      });
    } else if (item.mode === 'journal_entry') {
      const transaction = cleanText(item.transaction, 260);
      const rawAccounts = Array.isArray(item.accounts) ? item.accounts.map((a) => cleanText(a, 80)) : [];
      const correctDebit = cleanText(item.correctDebit, 80);
      const correctCredit = cleanText(item.correctCredit, 80);
      const amount =
        typeof item.amount === 'number' && Number.isFinite(item.amount) && item.amount > 0
          ? Math.round(item.amount)
          : 100000;
      const currency = cleanText(item.currency, 16) || 'دینار';
      if (
        !transaction ||
        rawAccounts.length !== 4 ||
        rawAccounts.some((a) => a.length === 0) ||
        !rawAccounts.includes(correctDebit) ||
        !rawAccounts.includes(correctCredit) ||
        correctDebit === correctCredit
      ) {
        continue;
      }
      out.push({
        id,
        mode: 'journal_entry',
        difficulty,
        topic,
        transaction,
        amount,
        currency,
        accounts: [rawAccounts[0], rawAccounts[1], rawAccounts[2], rawAccounts[3]],
        correctDebit,
        correctCredit,
        timeLimitSec: clampTimeLimit(item.timeLimitSec, 34),
        ruleHint,
        explanation,
        lesson: {
          debitAccount: correctDebit,
          creditAccount: correctCredit,
          amountLabel: `${amount.toLocaleString('en-US')} ${currency}`,
          ruleSummary: `من ${correctDebit} إلى ${correctCredit}`,
        },
      });
    } else if (item.mode === 'debit_credit') {
      const transaction = cleanText(item.transaction, 260);
      const targetAccount = cleanText(item.targetAccount, 90);
      const prompt = cleanText(item.prompt, 200) || `ئەم هەژمارە لە کام لا تۆمار دەکرێت؟`;
      const correctSide = item.correctSide === 'credit' ? 'credit' : item.correctSide === 'debit' ? 'debit' : null;
      if (!transaction || !targetAccount || !correctSide) continue;
      out.push({
        id,
        mode: 'debit_credit',
        difficulty,
        topic,
        transaction,
        targetAccount,
        prompt,
        correctSide,
        timeLimitSec: clampTimeLimit(item.timeLimitSec, 20),
        ruleHint,
        explanation,
      });
    } else if (item.mode === 'true_false') {
      const claim = cleanText(item.claim, 260);
      const ledgerRef = cleanText(item.ledgerRef, 80) || 'پرسیاری مامۆستا';
      if (!claim || typeof item.correctAnswer !== 'boolean') continue;
      out.push({
        id,
        mode: 'true_false',
        difficulty,
        topic,
        claim,
        ledgerRef,
        correctAnswer: item.correctAnswer,
        timeLimitSec: clampTimeLimit(item.timeLimitSec, 18),
        ruleHint,
        explanation,
      });
    } else if (item.mode === 'classify') {
      const prompt = cleanText(item.prompt, 240);
      const rawItems = Array.isArray(item.items) ? item.items : [];
      if (!prompt || rawItems.length !== 4) continue;
      const cleanedItems = rawItems
        .map((ci, idx) => {
          const obj = ci as Record<string, unknown>;
          const label = cleanText(obj?.label, 90);
          const bucket = VALID_BUCKETS.includes(obj?.correctBucket as LedgerBucket)
            ? (obj.correctBucket as LedgerBucket)
            : null;
          if (!label || !bucket) return null;
          return { id: cleanText(obj?.id, 24) || `ci-${idx + 1}`, label, correctBucket: bucket };
        })
        .filter((x): x is { id: string; label: string; correctBucket: LedgerBucket } => x !== null);
      if (cleanedItems.length !== 4) continue;
      out.push({
        id,
        mode: 'classify',
        difficulty,
        topic,
        prompt,
        items: [cleanedItems[0], cleanedItems[1], cleanedItems[2], cleanedItems[3]],
        timeLimitSec: clampTimeLimit(item.timeLimitSec, 34),
        ruleHint,
        explanation,
      });
    } else if (item.mode === 'equation') {
      const prompt = cleanText(item.prompt, 260);
      const formulaTitle = cleanText(item.formulaTitle, 140) || 'الموجودات = المطلوبات + رأس المال';
      const rawChoices = Array.isArray(item.choices)
        ? item.choices.filter((c): c is number => typeof c === 'number' && Number.isFinite(c))
        : [];
      const correctValue = typeof item.correctValue === 'number' ? item.correctValue : NaN;
      if (!prompt || rawChoices.length !== 4 || !rawChoices.includes(correctValue)) continue;
      const leftSide = Array.isArray(item.leftSide) ? (item.leftSide as { label: string; value: number | null }[]) : [];
      const rightSide = Array.isArray(item.rightSide) ? (item.rightSide as { label: string; value: number | null }[]) : [];
      if (leftSide.length === 0 || rightSide.length === 0) continue;
      out.push({
        id,
        mode: 'equation',
        difficulty,
        topic,
        formulaTitle,
        prompt,
        leftSide,
        rightSide,
        operatorRight: item.operatorRight === '-' ? '-' : '+',
        choices: [rawChoices[0], rawChoices[1], rawChoices[2], rawChoices[3]],
        correctValue,
        currency: cleanText(item.currency, 16) || 'دینار',
        timeLimitSec: clampTimeLimit(item.timeLimitSec, 24),
        ruleHint,
        explanation,
      });
    }
  }

  return out;
}

export function mergeCurriculumBank(
  baseBank: GameQuestion[],
  overrides: GameQuestion[]
): GameQuestion[] {
  if (overrides.length === 0) return baseBank;
  const overrideMap = new Map<string, GameQuestion>();
  for (const item of overrides) {
    overrideMap.set(item.id, item);
  }
  return baseBank.map((q) => overrideMap.get(q.id) ?? q);
}

export function createRoomState(params: {
  code: string;
  hostId: string;
  hostName: string;
  settings?: Partial<RoomSettings>;
  customQuestions?: GameQuestion[];
  curriculumOverrides?: GameQuestion[];
  hostAsSupervisor?: boolean;
}): InternalRoomState {
  const mergedSettings = normalizeSettings(params.settings);
  const sanitizedCustom = sanitizeCustomQuestions(params.customQuestions, 30);
  const sanitizedOverrides = sanitizeCustomQuestions(params.curriculumOverrides, 60);
  const teams = buildTeams(mergedSettings.teamCount);
  const isSupervisor = params.hostAsSupervisor ?? true;
  const hostPlayer: Player = {
    id: params.hostId,
    name: params.hostName,
    teamId: isSupervisor ? null : teams[0].id,
    isHost: true,
    isSupervisor,
    connected: true,
    score: 0,
    roundDelta: 0,
    streak: 0,
    correctCount: 0,
    answeredCount: 0,
  };

  return {
    code: params.code,
    phase: 'lobby',
    hostId: params.hostId,
    settings: mergedSettings,
    teams,
    players: [hostPlayer],
    currentRoundIndex: 0,
    totalRounds:
      mergedSettings.questionSource === 'custom' && sanitizedCustom.length > 0
        ? sanitizedCustom.length
        : mergedSettings.roundCount,
    roundStartedAtMs: null,
    roundEndsAtMs: null,
    lastRoundSummary: null,
    questions: [],
    customQuestions: sanitizedCustom,
    curriculumOverrides: sanitizedOverrides,
    currentAnswers: new Map(),
  };
}

export function updateRoomSettings(room: InternalRoomState, partial: Partial<RoomSettings>): void {
  if (room.phase !== 'lobby') return;
  const next = normalizeSettings({ ...room.settings, ...partial });
  room.settings = next;
  room.totalRounds =
    next.questionSource === 'custom' && room.customQuestions.length > 0
      ? room.customQuestions.length
      : next.roundCount;
  const nextTeams = buildTeams(next.teamCount);
  const validIds = new Set(nextTeams.map((t) => t.id));
  room.teams = nextTeams;

  for (const player of room.players) {
    if (player.isSupervisor) {
      player.teamId = null;
      continue;
    }
    if (!player.teamId || !validIds.has(player.teamId)) {
      player.teamId = pickBalancedTeam(room.teams, room.players.filter((p) => p.id !== player.id));
    }
  }
}

export function setRoomCustomQuestions(room: InternalRoomState, rawQuestions: unknown): number {
  if (room.phase !== 'lobby') return room.customQuestions.length;
  const sanitized = sanitizeCustomQuestions(rawQuestions, 30);
  room.customQuestions = sanitized;
  if (room.settings.questionSource === 'custom') {
    room.totalRounds = sanitized.length;
  }
  return sanitized.length;
}

export function setRoomCurriculumOverrides(room: InternalRoomState, rawOverrides: unknown): number {
  if (room.phase !== 'lobby') return room.curriculumOverrides.length;
  const sanitized = sanitizeCustomQuestions(rawOverrides, 60);
  room.curriculumOverrides = sanitized;
  return sanitized.length;
}

export function joinPlayer(
  room: InternalRoomState,
  playerId: string,
  name: string,
  preferredTeamId?: TeamId
): Player {
  const existing = room.players.find((p) => p.id === playerId);
  if (existing) {
    existing.connected = true;
    existing.name = name;
    return existing;
  }
  const validTeam =
    preferredTeamId && room.teams.some((t) => t.id === preferredTeamId)
      ? preferredTeamId
      : pickBalancedTeam(room.teams, room.players);

  const player: Player = {
    id: playerId,
    name,
    teamId: validTeam,
    isHost: false,
    isSupervisor: false,
    connected: true,
    score: 0,
    roundDelta: 0,
    streak: 0,
    correctCount: 0,
    answeredCount: 0,
  };
  room.players.push(player);
  return player;
}

export function switchPlayerTeam(room: InternalRoomState, playerId: string, teamId: TeamId): boolean {
  if (room.phase !== 'lobby') return false;
  if (room.settings.competitionMode !== 'teams') return false;
  if (!room.teams.some((t) => t.id === teamId)) return false;
  const player = room.players.find((p) => p.id === playerId);
  if (!player || player.isSupervisor) return false;
  player.teamId = teamId;
  return true;
}

function shuffleArray<T>(items: T[], rng: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

export function selectQuestionsForMatch(
  roundCount: number,
  enabledModes: GameMode[],
  rng: () => number = Math.random,
  bank: GameQuestion[] = ACCOUNTING_QUESTIONS,
  difficulty: DifficultyLevel = 'mixed'
): GameQuestion[] {
  const modes = enabledModes.length > 0 ? enabledModes : ALL_GAME_MODES;
  const difficultyBank =
    difficulty === 'mixed'
      ? bank
      : bank.filter((q) => q.difficulty === difficulty);
  const activeBank = difficultyBank.length > 0 ? difficultyBank : bank;

  const pools = new Map<GameMode, GameQuestion[]>();
  for (const mode of modes) {
    pools.set(mode, shuffleArray(activeBank.filter((q) => q.mode === mode), rng));
  }

  const ordered: GameQuestion[] = [];
  let cursor = 0;
  let guard = 0;
  const maxAttempts = roundCount * 10;

  while (ordered.length < roundCount && guard < maxAttempts) {
    const mode = modes[cursor % modes.length];
    const pool = pools.get(mode) ?? [];
    if (pool.length > 0) {
      ordered.push(pool.shift()!);
    } else {
      const refill = shuffleArray(
        activeBank.filter((q) => q.mode === mode && !ordered.some((o) => o.id === q.id)),
        rng
      );
      if (refill.length > 0) {
        pools.set(mode, refill);
        ordered.push(pools.get(mode)!.shift()!);
      }
    }
    cursor++;
    guard++;
  }

  // If a single mode ran out on long matches (e.g. 15 rounds with 1 mode), top up from same difficulty
  if (ordered.length < roundCount) {
    const remaining = shuffleArray(
      activeBank.filter((q) => modes.includes(q.mode) && !ordered.some((o) => o.id === q.id)),
      rng
    );
    while (ordered.length < roundCount && remaining.length > 0) {
      ordered.push(remaining.shift()!);
    }
  }

  return ordered;
}

export function startMatch(
  room: InternalRoomState,
  nowMs: number,
  rng: () => number = Math.random
): void {
  const useCustom =
    room.settings.questionSource === 'custom' && room.customQuestions.length > 0;
  const effectiveBank = mergeCurriculumBank(ACCOUNTING_QUESTIONS, room.curriculumOverrides);
  const selected = useCustom
    ? [...room.customQuestions]
    : selectQuestionsForMatch(
        room.settings.roundCount,
        room.settings.enabledModes,
        rng,
        effectiveBank,
        room.settings.difficulty
      );
  room.questions = selected;
  room.totalRounds = selected.length;
  room.currentRoundIndex = 0;
  room.lastRoundSummary = null;
  room.currentAnswers.clear();

  for (const team of room.teams) {
    team.score = 0;
    team.roundDelta = 0;
    team.synergyBonus = 0;
    team.correctRounds = 0;
  }
  for (const player of room.players) {
    player.score = 0;
    player.roundDelta = 0;
    player.streak = 0;
    player.correctCount = 0;
    player.answeredCount = 0;
  }

  room.phase = 'playing';
  room.roundStartedAtMs = nowMs;
  const firstQ = room.questions[0];
  room.roundEndsAtMs = nowMs + (firstQ ? firstQ.timeLimitSec * 1000 : 24_000);
}

export function evaluateAnswerAccuracy(
  question: GameQuestion,
  payload: AnswerPayload
): { isCorrect: boolean; accuracyRatio: number } {
  if (question.mode !== payload.mode) {
    return { isCorrect: false, accuracyRatio: 0 };
  }

  switch (question.mode) {
    case 'mcq': {
      const p = payload as Extract<AnswerPayload, { mode: 'mcq' }>;
      const ok = p.choiceIndex === question.correctIndex;
      return { isCorrect: ok, accuracyRatio: ok ? 1 : 0 };
    }
    case 'journal_entry': {
      const p = payload as Extract<AnswerPayload, { mode: 'journal_entry' }>;
      const debitOk = p.debitAccount === question.correctDebit;
      const creditOk = p.creditAccount === question.correctCredit;
      if (debitOk && creditOk) return { isCorrect: true, accuracyRatio: 1 };
      if (debitOk || creditOk) return { isCorrect: false, accuracyRatio: 0.5 };
      return { isCorrect: false, accuracyRatio: 0 };
    }
    case 'debit_credit': {
      const p = payload as Extract<AnswerPayload, { mode: 'debit_credit' }>;
      const ok = p.side === question.correctSide;
      return { isCorrect: ok, accuracyRatio: ok ? 1 : 0 };
    }
    case 'classify': {
      const p = payload as Extract<AnswerPayload, { mode: 'classify' }>;
      let matched = 0;
      for (const item of question.items) {
        if (p.assignments[item.id] === item.correctBucket) {
          matched++;
        }
      }
      const ratio = matched / question.items.length;
      return { isCorrect: matched === question.items.length, accuracyRatio: ratio };
    }
    case 'equation': {
      const p = payload as Extract<AnswerPayload, { mode: 'equation' }>;
      const ok = Number(p.value) === question.correctValue;
      return { isCorrect: ok, accuracyRatio: ok ? 1 : 0 };
    }
    case 'true_false': {
      const p = payload as Extract<AnswerPayload, { mode: 'true_false' }>;
      const ok = p.value === question.correctAnswer;
      return { isCorrect: ok, accuracyRatio: ok ? 1 : 0 };
    }
  }
}

export function calculateAnswerPoints(params: {
  accuracyRatio: number;
  isCorrect: boolean;
  elapsedMs: number;
  timeLimitSec: number;
  currentStreak: number;
}): { pointsEarned: number; speedBonus: number; streakBonus: number } {
  if (params.accuracyRatio <= 0) {
    return { pointsEarned: 0, speedBonus: 0, streakBonus: 0 };
  }

  const basePoints = Math.round(100 * params.accuracyRatio);
  const limitMs = Math.max(1000, params.timeLimitSec * 1000);
  const clampedElapsed = Math.max(0, Math.min(limitMs, params.elapsedMs));
  const remainingFraction = 1 - clampedElapsed / limitMs;
  const speedBonus = Math.round(50 * remainingFraction * params.accuracyRatio);
  const streakBonus = params.isCorrect ? Math.min(40, params.currentStreak * 15) : 0;

  return {
    pointsEarned: basePoints + speedBonus + streakBonus,
    speedBonus,
    streakBonus,
  };
}

export function recordPlayerAnswer(
  room: InternalRoomState,
  playerId: string,
  payload: AnswerPayload,
  nowMs: number
): SubmittedAnswer | null {
  if (room.phase !== 'playing') return null;
  if (room.currentAnswers.has(playerId)) return null;

  const player = room.players.find((p) => p.id === playerId);
  const question = room.questions[room.currentRoundIndex];
  if (!player || player.isSupervisor || !question) return null;

  const elapsedMs = Math.max(0, nowMs - (room.roundStartedAtMs ?? nowMs));
  const { isCorrect, accuracyRatio } = evaluateAnswerAccuracy(question, payload);
  const scored = calculateAnswerPoints({
    accuracyRatio,
    isCorrect,
    elapsedMs,
    timeLimitSec: question.timeLimitSec,
    currentStreak: player.streak,
  });

  const submission: SubmittedAnswer = {
    playerId,
    teamId: player.teamId,
    payload,
    submittedAtMs: nowMs,
    elapsedMs,
    isCorrect,
    accuracyRatio,
    pointsEarned: scored.pointsEarned,
    speedBonus: scored.speedBonus,
    streakBonus: scored.streakBonus,
  };

  room.currentAnswers.set(playerId, submission);
  return submission;
}

export function allConnectedPlayersAnswered(room: InternalRoomState): boolean {
  const connectedStudents = room.players.filter((p) => p.connected && !p.isSupervisor);
  if (connectedStudents.length === 0) return false;
  return connectedStudents.every((p) => room.currentAnswers.has(p.id));
}

export function finalizeCurrentRound(room: InternalRoomState): RoundSummary | null {
  if (room.phase !== 'playing') return null;
  const question = room.questions[room.currentRoundIndex];
  if (!question) return null;

  const teamDeltas: RoundSummary['teamDeltas'] = {
    gold: { points: 0, synergy: 0, correctCount: 0, totalCount: 0 },
    star: { points: 0, synergy: 0, correctCount: 0, totalCount: 0 },
    moon: { points: 0, synergy: 0, correctCount: 0, totalCount: 0 },
    sun: { points: 0, synergy: 0, correctCount: 0, totalCount: 0 },
    falcon: { points: 0, synergy: 0, correctCount: 0, totalCount: 0 },
    selver: { points: 0, synergy: 0, correctCount: 0, totalCount: 0 },
  };

  for (const player of room.players) {
    player.roundDelta = 0;
    if (player.isSupervisor) continue;

    if (player.connected && player.teamId) {
      teamDeltas[player.teamId].totalCount += 1;
    }
    const ans = room.currentAnswers.get(player.id);
    if (ans) {
      player.answeredCount += 1;
      player.score += ans.pointsEarned;
      player.roundDelta = ans.pointsEarned;
      if (ans.isCorrect) {
        player.streak += 1;
        player.correctCount += 1;
        if (player.teamId) {
          teamDeltas[player.teamId].correctCount += 1;
        }
      } else {
        player.streak = 0;
      }
      if (player.teamId) {
        teamDeltas[player.teamId].points += ans.pointsEarned;
      }
    } else if (player.connected) {
      player.streak = 0;
    }
  }

  for (const team of room.teams) {
    const delta = teamDeltas[team.id];
    let synergy = 0;
    if (room.settings.competitionMode === 'teams') {
      if (delta.totalCount >= 2 && delta.correctCount === delta.totalCount) {
        synergy = 50;
      } else if (delta.totalCount === 1 && delta.correctCount === 1) {
        synergy = 25;
      }
    }
    delta.synergy = synergy;
    const totalRoundGain = delta.points + synergy;
    team.roundDelta = totalRoundGain;
    team.synergyBonus = synergy;
    team.score += totalRoundGain;
    if (delta.correctCount > 0) {
      team.correctRounds += 1;
    }
  }

  const summary: RoundSummary = {
    questionId: question.id,
    roundIndex: room.currentRoundIndex,
    answers: Array.from(room.currentAnswers.values()),
    teamDeltas,
  };

  room.lastRoundSummary = summary;
  room.phase = 'round_result';
  room.roundEndsAtMs = null;
  return summary;
}

export function advanceToNextRound(room: InternalRoomState, nowMs: number): RoomPhase {
  if (room.phase !== 'round_result') return room.phase;
  const nextIndex = room.currentRoundIndex + 1;
  if (nextIndex >= room.questions.length) {
    room.phase = 'finished';
    room.roundStartedAtMs = null;
    room.roundEndsAtMs = null;
    return room.phase;
  }

  room.currentRoundIndex = nextIndex;
  room.currentAnswers.clear();
  room.phase = 'playing';
  room.roundStartedAtMs = nowMs;
  const nextQ = room.questions[nextIndex];
  room.roundEndsAtMs = nowMs + (nextQ ? nextQ.timeLimitSec * 1000 : 24_000);
  return room.phase;
}

export function getRankedTeams(teams: TeamState[]): TeamState[] {
  return [...teams].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.correctRounds - a.correctRounds;
  });
}

export function getRankedPlayers(players: Player[]): Player[] {
  return players
    .filter((p) => !p.isSupervisor)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.correctCount - a.correctCount;
    });
}

export function getMvpPlayer(players: Player[]): Player | null {
  const ranked = getRankedPlayers(players);
  return ranked[0] ?? null;
}

export function toPublicRoomState(room: InternalRoomState, nowMs: number): PublicRoomState {
  const currentQuestion =
    room.phase === 'playing' || room.phase === 'round_result'
      ? room.questions[room.currentRoundIndex] ?? null
      : null;

  return {
    code: room.code,
    phase: room.phase,
    hostId: room.hostId,
    settings: room.settings,
    customQuestionCount: room.customQuestions.length,
    curriculumOverrideCount: room.curriculumOverrides.length,
    teams: room.teams,
    players: room.players,
    currentRoundIndex: room.currentRoundIndex,
    totalRounds: room.totalRounds,
    currentQuestion,
    roundStartedAtMs: room.roundStartedAtMs,
    roundEndsAtMs: room.roundEndsAtMs,
    answeredPlayerIds: Array.from(room.currentAnswers.keys()),
    lastRoundSummary: room.lastRoundSummary,
    serverNowMs: nowMs,
  };
}
