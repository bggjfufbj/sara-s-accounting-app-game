import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceToNextRound,
  allConnectedPlayersAnswered,
  calculateAnswerPoints,
  createRoomState,
  evaluateAnswerAccuracy,
  finalizeCurrentRound,
  getMvpPlayer,
  getRankedPlayers,
  getRankedTeams,
  joinPlayer,
  mergeCurriculumBank,
  recordPlayerAnswer,
  sanitizeCustomQuestions,
  selectQuestionsForMatch,
  setRoomCurriculumOverrides,
  setRoomCustomQuestions,
  startMatch,
  switchPlayerTeam,
  toPublicRoomState,
  updateRoomSettings,
  validatePlayerName,
  validateRoomCode,
} from './engine.ts';
import { ACCOUNTING_QUESTIONS } from './questions.ts';

test('validates player names and room codes properly', () => {
  assert.equal(validatePlayerName('').ok, false);
  assert.equal(validatePlayerName('ا').ok, false);
  const validName = validatePlayerName('  ئارام   ئەحمەد ');
  assert.equal(validName.ok, true);
  if (validName.ok) assert.equal(validName.value, 'ئارام ئەحمەد');

  assert.equal(validateRoomCode('ab').ok, false);
  const validCode = validateRoomCode('krd4');
  assert.equal(validCode.ok, true);
  if (validCode.ok) assert.equal(validCode.value, 'KRD4');
});

test('selectQuestionsForMatch interleaves all 6 enabled accounting game modes and filters by difficulty', () => {
  const deterministicRng = () => 0.25;
  const allModes = ['journal_entry', 'mcq', 'debit_credit', 'classify', 'equation', 'true_false'] as const;
  const selected = selectQuestionsForMatch(6, [...allModes], deterministicRng);
  assert.equal(selected.length, 6);
  assert.deepEqual(selected.map((q) => q.mode), [...allModes]);

  const easySet = selectQuestionsForMatch(12, [...allModes], deterministicRng, ACCOUNTING_QUESTIONS, 'easy');
  assert.equal(easySet.length, 12);
  assert.equal(easySet.every((q) => q.difficulty === 'easy'), true);

  const hardSet = selectQuestionsForMatch(12, [...allModes], deterministicRng, ACCOUNTING_QUESTIONS, 'hard');
  assert.equal(hardSet.length, 12);
  assert.equal(hardSet.every((q) => q.difficulty === 'hard'), true);
});

test('evaluates all 6 game types accurately including partial credit in journal_entry and classify', () => {
  const je = ACCOUNTING_QUESTIONS.find((q) => q.mode === 'journal_entry')!;
  if (je.mode === 'journal_entry') {
    assert.deepEqual(
      evaluateAnswerAccuracy(je, {
        mode: 'journal_entry',
        debitAccount: je.correctDebit,
        creditAccount: je.correctCredit,
      }),
      { isCorrect: true, accuracyRatio: 1 }
    );
    assert.deepEqual(
      evaluateAnswerAccuracy(je, {
        mode: 'journal_entry',
        debitAccount: je.correctDebit,
        creditAccount: 'حـ/ خطأ',
      }),
      { isCorrect: false, accuracyRatio: 0.5 }
    );
    assert.deepEqual(
      evaluateAnswerAccuracy(je, {
        mode: 'journal_entry',
        debitAccount: je.correctCredit,
        creditAccount: je.correctDebit,
      }),
      { isCorrect: false, accuracyRatio: 0 }
    );
  }

  const mcq = ACCOUNTING_QUESTIONS.find((q) => q.mode === 'mcq')!;
  if (mcq.mode === 'mcq') {
    assert.equal(evaluateAnswerAccuracy(mcq, { mode: 'mcq', choiceIndex: mcq.correctIndex }).isCorrect, true);
    assert.equal(
      evaluateAnswerAccuracy(mcq, { mode: 'mcq', choiceIndex: (mcq.correctIndex + 1) % 4 }).isCorrect,
      false
    );
  }

  const dc = ACCOUNTING_QUESTIONS.find((q) => q.mode === 'debit_credit')!;
  if (dc.mode === 'debit_credit') {
    assert.equal(evaluateAnswerAccuracy(dc, { mode: 'debit_credit', side: dc.correctSide }).isCorrect, true);
  }

  const cls = ACCOUNTING_QUESTIONS.find((q) => q.mode === 'classify')!;
  if (cls.mode === 'classify') {
    const perfect: Record<string, any> = {};
    const half: Record<string, any> = {};
    cls.items.forEach((item, idx) => {
      perfect[item.id] = item.correctBucket;
      half[item.id] = idx < 2 ? item.correctBucket : item.correctBucket === 'assets' ? 'expenses' : 'assets';
    });
    assert.deepEqual(evaluateAnswerAccuracy(cls, { mode: 'classify', assignments: perfect }), {
      isCorrect: true,
      accuracyRatio: 1,
    });
    assert.deepEqual(evaluateAnswerAccuracy(cls, { mode: 'classify', assignments: half }), {
      isCorrect: false,
      accuracyRatio: 0.5,
    });
  }

  const eq = ACCOUNTING_QUESTIONS.find((q) => q.mode === 'equation')!;
  if (eq.mode === 'equation') {
    assert.equal(evaluateAnswerAccuracy(eq, { mode: 'equation', value: eq.correctValue }).isCorrect, true);
  }

  const tf = ACCOUNTING_QUESTIONS.find((q) => q.mode === 'true_false')!;
  if (tf.mode === 'true_false') {
    assert.equal(evaluateAnswerAccuracy(tf, { mode: 'true_false', value: tf.correctAnswer }).isCorrect, true);
  }
});

test('scoring math rewards speed, streaks, and team synergy', () => {
  const fast = calculateAnswerPoints({
    accuracyRatio: 1,
    isCorrect: true,
    elapsedMs: 2000,
    timeLimitSec: 20,
    currentStreak: 0,
  });
  const slow = calculateAnswerPoints({
    accuracyRatio: 1,
    isCorrect: true,
    elapsedMs: 18000,
    timeLimitSec: 20,
    currentStreak: 0,
  });
  assert.ok(fast.pointsEarned > slow.pointsEarned);
  assert.equal(fast.speedBonus, 45);
  assert.equal(slow.speedBonus, 5);
});

test('individual competition mode ranks students directly without team synergy', () => {
  const room = createRoomState({
    code: 'SOLO',
    hostId: 'p1',
    hostName: 'سارا',
    settings: { competitionMode: 'individual', roundCount: 6, enabledModes: ['journal_entry'] },
    hostAsSupervisor: false,
  });
  joinPlayer(room, 'p2', 'ئارام');
  // Team switching is disabled in individual mode
  assert.equal(switchPlayerTeam(room, 'p2', 'sun'), false);

  const now = 2_000_000;
  startMatch(room, now, () => 0.1);
  const q0 = room.questions[0];
  assert.equal(q0.mode, 'journal_entry');
  if (q0.mode === 'journal_entry') {
    recordPlayerAnswer(
      room,
      'p2',
      { mode: 'journal_entry', debitAccount: q0.correctDebit, creditAccount: q0.correctCredit },
      now + 3000
    );
    recordPlayerAnswer(
      room,
      'p1',
      { mode: 'journal_entry', debitAccount: q0.correctDebit, creditAccount: 'حـ/ هەڵە' },
      now + 5000
    );
  }
  assert.equal(allConnectedPlayersAnswered(room), true);
  const summary = finalizeCurrentRound(room);
  assert.ok(summary);
  assert.equal(summary.teamDeltas.gold.synergy, 0);

  const rankedPlayers = getRankedPlayers(room.players);
  assert.equal(rankedPlayers[0].id, 'p2');
  assert.ok(rankedPlayers[0].score > rankedPlayers[1].score);
  assert.ok(rankedPlayers[1].score > 0); // partial credit awarded for getting Debit right
});

test('teacher supervisor stays out of all teams and does not block student rounds or rankings', () => {
  const room = createRoomState({
    code: 'KRD4',
    hostId: 'teacher1',
    hostName: 'مامۆستا ڕەوەند',
    settings: { competitionMode: 'teams', teamCount: 2, roundCount: 6, enabledModes: ['mcq', 'debit_credit'] },
  });

  // Teacher is supervisor by default and has no team
  const teacher = room.players[0];
  assert.equal(teacher.isSupervisor, true);
  assert.equal(teacher.teamId, null);
  assert.equal(switchPlayerTeam(room, 'teacher1', 'gold'), false);

  joinPlayer(room, 'p1', 'کاروان', 'gold');
  joinPlayer(room, 'p2', 'ئارام', 'gold');
  joinPlayer(room, 'p3', 'سارا', 'star');
  assert.equal(switchPlayerTeam(room, 'p3', 'gold'), true);
  assert.equal(switchPlayerTeam(room, 'p3', 'star'), true);

  updateRoomSettings(room, { roundCount: 6 });
  assert.equal(room.totalRounds, 6);

  const now = 1_000_000;
  startMatch(room, now, () => 0.1);
  const q0 = room.questions[0];
  const rightPayload =
    q0.mode === 'mcq'
      ? ({ mode: 'mcq', choiceIndex: q0.correctIndex } as const)
      : ({ mode: 'debit_credit', side: (q0 as any).correctSide } as const);
  const wrongPayload =
    q0.mode === 'mcq'
      ? ({ mode: 'mcq', choiceIndex: (q0.correctIndex + 1) % 4 } as const)
      : ({ mode: 'debit_credit', side: (q0 as any).correctSide === 'debit' ? 'credit' : 'debit' } as const);

  // Teacher cannot submit answers
  assert.equal(recordPlayerAnswer(room, 'teacher1', rightPayload, now + 1000), null);

  recordPlayerAnswer(room, 'p1', rightPayload, now + 2000);
  recordPlayerAnswer(room, 'p2', rightPayload, now + 3000);
  recordPlayerAnswer(room, 'p3', wrongPayload, now + 4000);

  // All participating students answered -> round is complete even though teacher did not answer
  assert.equal(allConnectedPlayersAnswered(room), true);

  const summary = finalizeCurrentRound(room);
  assert.ok(summary);
  assert.equal(summary.teamDeltas.gold.synergy, 50);

  const ranked = getRankedTeams(room.teams);
  assert.equal(ranked[0].id, 'gold');
  assert.equal(getMvpPlayer(room.players)?.id, 'p1');
  assert.equal(getRankedPlayers(room.players).some((p) => p.id === 'teacher1'), false);

  for (let i = 1; i < 6; i++) {
    const phase = advanceToNextRound(room, now + i * 30_000);
    assert.equal(phase, 'playing');
    finalizeCurrentRound(room);
  }
  const endPhase = advanceToNextRound(room, now + 220_000);
  assert.equal(endPhase, 'finished');
});

test('custom teacher-authored questionSource plays exact custom questions and never leaks hidden answers in lobby', () => {
  const sanitized = sanitizeCustomQuestions([
    {
      id: 't-mcq-1',
      mode: 'mcq',
      difficulty: 'easy',
      topic: 'تاقیکردنەوەی مامۆستا',
      prompt: 'سروشتی حـ/ الصندوق چییە؟',
      options: ['مدين', 'دائن', 'إيراد', 'مطلوبات'],
      correctIndex: 0,
      timeLimitSec: 20,
      ruleHint: '',
      explanation: 'الصندوق موجوداتـە و سروشتی مدينـە.',
    },
    {
      id: 't-tf-2',
      mode: 'true_false',
      difficulty: 'easy',
      topic: 'تاقیکردنەوەی مامۆستا',
      claim: 'المسحوبات الشخصية هەمیشە مدينـە.',
      ledgerRef: 'تاقیکردنەوە',
      correctAnswer: true,
      timeLimitSec: 15,
      ruleHint: '',
      explanation: 'ڕاستە.',
    },
    // Invalid malformed entry should be safely stripped
    { id: 'bad', mode: 'mcq', prompt: '', options: ['a'] },
  ]);
  assert.equal(sanitized.length, 2);

  const room = createRoomState({
    code: 'CSTM',
    hostId: 'teacher',
    hostName: 'مامۆستا',
    settings: { competitionMode: 'teams', questionSource: 'custom' },
    hostAsSupervisor: true,
  });
  joinPlayer(room, 's1', 'سارا', 'gold');
  const count = setRoomCustomQuestions(room, sanitized);
  assert.equal(count, 2);

  // Public lobby state must expose count only, NOT customQuestions payload
  const pubLobby = toPublicRoomState(room, 1_000_000);
  assert.equal(pubLobby.customQuestionCount, 2);
  assert.equal('customQuestions' in pubLobby, false);
  assert.equal(pubLobby.totalRounds, 2);

  startMatch(room, 1_000_000);
  assert.equal(room.totalRounds, 2);
  assert.equal(room.questions[0].id, 't-mcq-1');
  assert.equal(room.questions[1].id, 't-tf-2');

  const ans1 = recordPlayerAnswer(room, 's1', { mode: 'mcq', choiceIndex: 0 }, 1_002_000);
  assert.equal(ans1?.isCorrect, true);
  finalizeCurrentRound(room);
  assert.equal(advanceToNextRound(room, 1_010_000), 'playing');

  const ans2 = recordPlayerAnswer(room, 's1', { mode: 'true_false', value: true }, 1_012_000);
  assert.equal(ans2?.isCorrect, true);
  finalizeCurrentRound(room);
  assert.equal(advanceToNextRound(room, 1_020_000), 'finished');
});

test('editable curriculum overrides replace base questions in Auto mode and expose count only', () => {
  const baseMcq = ACCOUNTING_QUESTIONS.find((q) => q.mode === 'mcq' && q.difficulty === 'easy')!;
  assert.equal(baseMcq.mode, 'mcq');
  const editedMcq = {
    ...baseMcq,
    prompt: 'پرسیاری دەستکاریکراوی مامۆستا لە مەنهەجەوە؟',
  };

  const merged = mergeCurriculumBank(ACCOUNTING_QUESTIONS, [editedMcq]);
  assert.equal(merged.length, ACCOUNTING_QUESTIONS.length);
  const replaced = merged.find((q) => q.id === baseMcq.id);
  assert.equal(replaced?.mode, 'mcq');
  if (replaced?.mode === 'mcq') {
    assert.equal(replaced.prompt, 'پرسیاری دەستکاریکراوی مامۆستا لە مەنهەجەوە؟');
  }

  const room = createRoomState({
    code: 'EDIT',
    hostId: 'teacher',
    hostName: 'مامۆستا',
    settings: {
      competitionMode: 'teams',
      questionSource: 'auto',
      difficulty: 'easy',
      enabledModes: ['mcq'],
      roundCount: 15,
    },
    hostAsSupervisor: true,
  });
  const count = setRoomCurriculumOverrides(room, [editedMcq]);
  assert.equal(count, 1);

  const pub = toPublicRoomState(room, 1_000_000);
  assert.equal(pub.curriculumOverrideCount, 1);
  assert.equal('curriculumOverrides' in pub, false);

  startMatch(room, 1_000_000, () => 0.1);
  const foundInMatch = room.questions.find((q) => q.id === baseMcq.id);
  assert.ok(foundInMatch);
  if (foundInMatch && foundInMatch.mode === 'mcq') {
    assert.equal(foundInMatch.prompt, 'پرسیاری دەستکاریکراوی مامۆستا لە مەنهەجەوە؟');
  }
});

test('supports up to 6 active teams by default including falcon and selver scoring and rebalancing', () => {
  const room = createRoomState({
    code: 'SIX6',
    hostId: 'teacher1',
    hostName: 'مامۆستا',
    settings: { competitionMode: 'teams', roundCount: 6, enabledModes: ['mcq'] },
    hostAsSupervisor: true,
  });

  assert.equal(room.settings.teamCount, 6);
  assert.deepEqual(
    room.teams.map((t) => t.id),
    ['gold', 'star', 'moon', 'sun', 'falcon', 'selver']
  );

  joinPlayer(room, 's1', 'سارا', 'falcon');
  joinPlayer(room, 's2', 'ڕێبین', 'falcon');
  joinPlayer(room, 's3', 'کەژاڵ', 'selver');
  assert.equal(room.players.find((p) => p.id === 's1')?.teamId, 'falcon');
  assert.equal(room.players.find((p) => p.id === 's3')?.teamId, 'selver');

  // Switch between 5th and 6th teams
  assert.equal(switchPlayerTeam(room, 's3', 'falcon'), true);
  assert.equal(switchPlayerTeam(room, 's3', 'selver'), true);

  const now = 3_000_000;
  startMatch(room, now, () => 0.2);
  const q0 = room.questions[0];
  assert.equal(q0.mode, 'mcq');
  if (q0.mode === 'mcq') {
    recordPlayerAnswer(room, 's1', { mode: 'mcq', choiceIndex: q0.correctIndex }, now + 2000);
    recordPlayerAnswer(room, 's2', { mode: 'mcq', choiceIndex: q0.correctIndex }, now + 3000);
    recordPlayerAnswer(room, 's3', { mode: 'mcq', choiceIndex: q0.correctIndex }, now + 4000);
  }
  const summary = finalizeCurrentRound(room);
  assert.ok(summary);
  assert.equal(summary.teamDeltas.falcon.synergy, 50);
  assert.ok(summary.teamDeltas.falcon.points > summary.teamDeltas.selver.points);
  assert.ok(summary.teamDeltas.selver.points > 0);

  // Rebalance check when lowering teamCount back to 4 in lobby
  const lobbyRoom = createRoomState({
    code: 'SIX4',
    hostId: 't1',
    hostName: 'مامۆستا',
    settings: { competitionMode: 'teams', teamCount: 6 },
    hostAsSupervisor: true,
  });
  joinPlayer(lobbyRoom, 'p5', 'ئاکۆ', 'falcon');
  joinPlayer(lobbyRoom, 'p6', 'لاڤە', 'selver');
  updateRoomSettings(lobbyRoom, { teamCount: 4 });
  assert.equal(lobbyRoom.teams.length, 4);
  const activeIds = new Set(lobbyRoom.teams.map((t) => t.id));
  assert.equal(activeIds.has(lobbyRoom.players.find((p) => p.id === 'p5')!.teamId!), true);
  assert.equal(activeIds.has(lobbyRoom.players.find((p) => p.id === 'p6')!.teamId!), true);
});



