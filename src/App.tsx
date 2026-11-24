import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccountingGuideModal } from './components/AccountingGuideModal';
import { CustomQuestionBuilderModal } from './components/CustomQuestionBuilderModal';
import { GameHud } from './components/GameHud';
import { JoinScreen } from './components/JoinScreen';
import { LobbyScreen } from './components/LobbyScreen';
import { ParticleBurst } from './components/ParticleBurst';
import { PauseModal } from './components/PauseModal';
import { RoundReveal } from './components/RoundReveal';
import { SupervisorRoundView } from './components/SupervisorRoundView';
import { TitleScreen } from './components/TitleScreen';
import { VictoryPodium } from './components/VictoryPodium';
import { ClassifyRound } from './components/games/ClassifyRound';
import { DebitCreditRound } from './components/games/DebitCreditRound';
import { EquationRound } from './components/games/EquationRound';
import { JournalEntryRound } from './components/games/JournalEntryRound';
import { McqRound } from './components/games/McqRound';
import { TrueFalseRound } from './components/games/TrueFalseRound';
import type {
  AnswerPayload,
  CompetitionMode,
  DifficultyLevel,
  GameQuestion,
  PublicRoomState,
  QuestionSource,
  RoomSettings,
  TeamId,
} from './game/types';
import { auth, googleProvider } from './firebase/client';
import {
  deleteCurriculumOverrideFromCloud,
  loadPublishedCurriculumOverrides,
  loadTeacherCustomQuestions,
  loadTeacherPrivateOverrides,
  saveCurriculumOverrideToCloud,
  syncCustomQuestionsToCloud,
} from './firebase/questionStore';
import { arenaSocket } from './utils/socket';
import { soundFx } from './utils/sound';

const CUSTOM_QUESTIONS_STORAGE_KEY = 'tarazu_custom_questions_v1';
const CURRICULUM_OVERRIDES_STORAGE_KEY = 'tarazu_curriculum_overrides_v1';

function loadStoredCustomQuestions(): GameQuestion[] {
  try {
    const raw = window.localStorage.getItem(CUSTOM_QUESTIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as GameQuestion[]) : [];
  } catch {
    return [];
  }
}

function loadStoredCurriculumOverrides(): Record<string, GameQuestion> {
  try {
    const raw = window.localStorage.getItem(CURRICULUM_OVERRIDES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as Record<string, GameQuestion>;
  } catch {
    return {};
  }
}

function sanitizeRoomParam(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  return cleaned.length > 0 ? cleaned : null;
}

function readInitialQuery() {
  const params = new URLSearchParams(window.location.search);
  let room = sanitizeRoomParam(params.get('room'));

  if (!room) {
    const pathMatch = window.location.pathname.match(/\/room\/([A-Za-z0-9]+)/i);
    if (pathMatch) {
      room = sanitizeRoomParam(pathMatch[1]);
    }
  }

  if (!room && window.location.hash) {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    room = sanitizeRoomParam(hashParams.get('room'));
  }

  const autostart = params.get('autostart') === '1';
  return { room, autostart };
}

export default function App() {
  const initialQuery = useRef(readInitialQuery());
  const [joinLinkCode, setJoinLinkCode] = useState<string | null>(initialQuery.current.room);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [room, setRoom] = useState<PublicRoomState | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [muted, setMuted] = useState(() => soundFx.isMuted());
  const [paused, setPaused] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [customBuilderOpen, setCustomBuilderOpen] = useState(false);
  const [builderInitialTab, setBuilderInitialTab] = useState<'write' | 'bank'>('write');
  const [customQuestions, setCustomQuestions] = useState<GameQuestion[]>(() =>
    loadStoredCustomQuestions()
  );
  const [curriculumOverrides, setCurriculumOverrides] = useState<Record<string, GameQuestion>>(() =>
    loadStoredCurriculumOverrides()
  );
  const [cloudUser, setCloudUser] = useState<User | null>(null);
  const [cloudSyncState, setCloudSyncState] = useState<'idle' | 'syncing' | 'saved' | 'error'>('idle');
  const [cloudNotice, setCloudNotice] = useState<string | null>(null);
  const [particleKey, setParticleKey] = useState(0);

  const curriculumOverridesRef = useRef(curriculumOverrides);
  curriculumOverridesRef.current = curriculumOverrides;
  const customQuestionsRef = useRef(customQuestions);
  customQuestionsRef.current = customQuestions;
  const roomRef = useRef(room);
  roomRef.current = room;
  const playerIdRef = useRef(playerId);
  playerIdRef.current = playerId;

  // Server-synced countdown timer state
  const clockOffsetRef = useRef(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const lastWarnSecRef = useRef<number | null>(null);
  const prevPhaseRef = useRef<string | null>(null);

  // Subscribe to real-time WebSocket messages
  useEffect(() => {
    arenaSocket.connect();

    const unsubMsg = arenaSocket.onMessage((msg) => {
      if (msg.type === 'welcome') {
        clockOffsetRef.current = msg.room.serverNowMs - Date.now();
        setPlayerId(msg.playerId);
        setRoom(msg.room);
        setJoinLinkCode(null);
        setServerError(null);
        setConnecting(false);
        setPaused(false);
        const targetUrl = `${window.location.pathname}?room=${msg.room.code}`;
        window.history.replaceState({}, '', targetUrl);
      } else if (msg.type === 'room_state') {
        clockOffsetRef.current = msg.room.serverNowMs - Date.now();
        setRoom(msg.room);
        setServerError(null);
      } else if (msg.type === 'answer_ack') {
        if (msg.answer.isCorrect) {
          soundFx.correct();
          setParticleKey((k) => k + 1);
        } else if (msg.answer.accuracyRatio > 0) {
          soundFx.partial();
        } else {
          soundFx.wrong();
        }
      } else if (msg.type === 'error') {
        setServerError(msg.message);
        setConnecting(false);
      }
    });

    return () => {
      unsubMsg();
    };
  }, []);

  // Attach global tactile button clicks + start calm ambient music on first interaction
  useEffect(() => {
    return soundFx.attachGlobalInteractionAudio();
  }, []);

  // Load permanently saved curriculum edits from Firestore on boot & sync when teacher signs in
  useEffect(() => {
    let active = true;

    const persistLocalOverrides = (map: Record<string, GameQuestion>) => {
      try {
        window.localStorage.setItem(CURRICULUM_OVERRIDES_STORAGE_KEY, JSON.stringify(map));
      } catch {
        // Ignore storage quota errors
      }
      const curRoom = roomRef.current;
      if (curRoom && curRoom.phase === 'lobby' && curRoom.hostId === playerIdRef.current) {
        arenaSocket.send({
          type: 'set_curriculum_overrides',
          overrides: Object.values(map),
        });
      }
    };

    const persistLocalCustom = (list: GameQuestion[]) => {
      try {
        window.localStorage.setItem(CUSTOM_QUESTIONS_STORAGE_KEY, JSON.stringify(list));
      } catch {
        // Ignore storage quota errors
      }
      const curRoom = roomRef.current;
      if (curRoom && curRoom.phase === 'lobby' && curRoom.hostId === playerIdRef.current) {
        arenaSocket.send({ type: 'set_custom_questions', questions: list });
      }
    };

    // 1. Immediately hydrate published curriculum overrides from Firestore (works on any device/reload)
    void loadPublishedCurriculumOverrides()
      .then((published) => {
        if (!active || Object.keys(published).length === 0) return;
        setCurriculumOverrides((prev) => {
          const merged = { ...published, ...prev };
          persistLocalOverrides(merged);
          return merged;
        });
      })
      .catch(() => {
        // Offline or rules error already logged by handleFirestoreError; local cache still works
      });

    // 2. Track Firebase Google Auth state for permanent teacher cloud writes & cross-device sync
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (!active) return;
      setCloudUser(user);
      setCloudNotice(null);
      if (!user) {
        setCloudSyncState('idle');
        return;
      }
      if (!user.emailVerified) {
        setCloudSyncState('error');
        setCloudNotice('تکایە هەژمارێکی Googleـی پشتڕاستکراو بەکاربهێنە.');
        return;
      }

      setCloudSyncState('syncing');
      try {
        const [published, privateOverrides, cloudCustom] = await Promise.all([
          loadPublishedCurriculumOverrides().catch(() => ({} as Record<string, GameQuestion>)),
          loadTeacherPrivateOverrides(user.uid).catch(() => ({} as Record<string, GameQuestion>)),
          loadTeacherCustomQuestions(user.uid).catch(() => [] as GameQuestion[]),
        ]);
        if (!active) return;

        const cloudOverrides = { ...published, ...privateOverrides };
        const localOverrides = curriculumOverridesRef.current;

        // Upload any local edits that were made before signing in
        const unsyncedLocal = Object.values(localOverrides).filter((q) => !(q.id in cloudOverrides));
        for (const item of unsyncedLocal) {
          await saveCurriculumOverrideToCloud(user, item);
        }

        const mergedOverrides = { ...cloudOverrides, ...localOverrides };
        setCurriculumOverrides(mergedOverrides);
        persistLocalOverrides(mergedOverrides);

        // Sync custom questions bidirectionally
        const localCustom = customQuestionsRef.current;
        if (cloudCustom.length > 0) {
          setCustomQuestions(cloudCustom);
          persistLocalCustom(cloudCustom);
        } else if (localCustom.length > 0) {
          await syncCustomQuestionsToCloud(user, localCustom);
        }

        if (active) {
          setCloudSyncState('saved');
        }
      } catch {
        if (active) {
          setCloudSyncState('error');
          setCloudNotice('نەتوانرا داتاکان لەگەڵ هەور هاوکات بکرێن — دڵنیابە لە ئینتەرنێت.');
        }
      }
    });

    return () => {
      active = false;
      unsubAuth();
    };
  }, []);

  // Support ?autostart=1 to boot straight into an active playable match
  useEffect(() => {
    if (initialQuery.current.autostart && !initialQuery.current.room) {
      setConnecting(true);
      arenaSocket.send({
        type: 'create_room',
        playerName: 'قوتابی تاقیکردنەوە',
        settings: { competitionMode: 'teams', teamCount: 6, roundCount: 6 },
        autoStart: true,
        hostAsSupervisor: false,
      });
    }
  }, []);

  // Trigger victory sound & confetti when entering finished phase
  useEffect(() => {
    const phase = room?.phase ?? null;
    if (phase === 'finished' && prevPhaseRef.current !== 'finished') {
      soundFx.victory();
      setParticleKey((k) => k + 1);
    }
    prevPhaseRef.current = phase;
  }, [room?.phase]);

  // Synchronize document.body.dataset.state cleanly
  useEffect(() => {
    let state = 'title';
    if (paused) {
      state = 'paused';
    } else if (room) {
      if (room.phase === 'lobby') state = 'lobby';
      else if (room.phase === 'playing' || room.phase === 'round_result') state = 'playing';
      else if (room.phase === 'finished') state = 'gameover';
    } else if (joinLinkCode) {
      state = 'title';
    }
    document.body.dataset.state = state;
  }, [room, paused, joinLinkCode]);

  // Smooth countdown ticker for active question round
  useEffect(() => {
    if (!room || room.phase !== 'playing' || !room.roundEndsAtMs) {
      setSecondsLeft(0);
      lastWarnSecRef.current = null;
      return;
    }

    const updateTimer = () => {
      const serverNow = Date.now() + clockOffsetRef.current;
      const rem = Math.max(0, (room.roundEndsAtMs! - serverNow) / 1000);
      setSecondsLeft(rem);
      const ceilSec = Math.ceil(rem);
      if (ceilSec > 0 && ceilSec <= 5 && lastWarnSecRef.current !== ceilSec) {
        lastWarnSecRef.current = ceilSec;
        soundFx.tickWarning();
      }
    };

    updateTimer();
    const id = setInterval(updateTimer, 120);
    return () => clearInterval(id);
  }, [room?.phase, room?.roundEndsAtMs, room?.currentRoundIndex]);

  const handleToggleMute = useCallback(() => {
    const next = soundFx.toggleMute();
    setMuted(next);
  }, []);

  // Global keyboard shortcuts (M mute, P/Escape pause during gameplay)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'm' || e.key === 'M') {
        handleToggleMute();
        return;
      }
      if (room && (room.phase === 'playing' || room.phase === 'round_result')) {
        if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
          e.preventDefault();
          setPaused((prev) => !prev);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [room, handleToggleMute]);

  const handleCloudSignIn = useCallback(async () => {
    setCloudNotice(null);
    setCloudSyncState('syncing');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      setCloudSyncState('error');
      const code = (error as { code?: string })?.code ?? '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setCloudSyncState('idle');
      } else {
        setCloudNotice('نەتوانرا بە Google بچیتە ژوورەوە — دووبارە هەوڵ بدەرەوە.');
      }
    }
  }, []);

  const handleCloudSignOut = useCallback(async () => {
    setCloudNotice(null);
    try {
      await signOut(auth);
      setCloudSyncState('idle');
    } catch {
      // Ignore sign out error
    }
  }, []);

  const handleUpdateCustomQuestions = useCallback(
    (next: GameQuestion[]) => {
      setCustomQuestions(next);
      try {
        window.localStorage.setItem(CUSTOM_QUESTIONS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage quota errors
      }
      if (room && room.phase === 'lobby' && room.hostId === playerId) {
        arenaSocket.send({ type: 'set_custom_questions', questions: next });
      }
      if (cloudUser && cloudUser.emailVerified) {
        setCloudSyncState('syncing');
        void syncCustomQuestionsToCloud(cloudUser, next)
          .then(() => setCloudSyncState('saved'))
          .catch(() => {
            setCloudSyncState('error');
            setCloudNotice('پرسیارەکان لەم ئامێرە پاشەکەوت بوون بەڵام هاوکاتکردن لەگەڵ هەور سەرکەوتوو نەبوو.');
          });
      }
    },
    [room, playerId, cloudUser]
  );

  const syncCurriculumOverrides = useCallback(
    (nextMap: Record<string, GameQuestion>) => {
      try {
        window.localStorage.setItem(CURRICULUM_OVERRIDES_STORAGE_KEY, JSON.stringify(nextMap));
      } catch {
        // Ignore storage quota errors
      }
      if (room && room.phase === 'lobby' && room.hostId === playerId) {
        arenaSocket.send({
          type: 'set_curriculum_overrides',
          overrides: Object.values(nextMap),
        });
      }
    },
    [room, playerId]
  );

  const handleSaveCurriculumOverride = useCallback(
    (edited: GameQuestion) => {
      setCurriculumOverrides((prev) => {
        const nextMap = { ...prev, [edited.id]: edited };
        syncCurriculumOverrides(nextMap);
        return nextMap;
      });
      if (cloudUser && cloudUser.emailVerified) {
        setCloudSyncState('syncing');
        setCloudNotice(null);
        void saveCurriculumOverrideToCloud(cloudUser, edited)
          .then(() => setCloudSyncState('saved'))
          .catch(() => {
            setCloudSyncState('error');
            setCloudNotice('گۆڕانکارییەکە لەم ئامێرە پاشەکەوت بوو بەڵام پاشەکەوتی هەور سەرکەوتوو نەبوو.');
          });
      }
    },
    [syncCurriculumOverrides, cloudUser]
  );

  const handleResetCurriculumOverride = useCallback(
    (id: string) => {
      setCurriculumOverrides((prev) => {
        if (!(id in prev)) return prev;
        const nextMap = { ...prev };
        delete nextMap[id];
        syncCurriculumOverrides(nextMap);
        return nextMap;
      });
      if (cloudUser && cloudUser.emailVerified) {
        setCloudSyncState('syncing');
        setCloudNotice(null);
        void deleteCurriculumOverrideFromCloud(cloudUser, id)
          .then(() => setCloudSyncState('saved'))
          .catch(() => {
            setCloudSyncState('error');
            setCloudNotice('گەڕاندنەوەکە لەم ئامێرە کرا بەڵام سڕینەوە لە هەور سەرکەوتوو نەبوو.');
          });
      }
    },
    [syncCurriculumOverrides, cloudUser]
  );

  const openQuestionBuilder = useCallback((tab: 'write' | 'bank') => {
    setBuilderInitialTab(tab);
    setCustomBuilderOpen(true);
  }, []);

  const handleCreateRoom = (
    playerName: string,
    competitionMode: CompetitionMode = 'teams',
    difficulty: DifficultyLevel = 'mixed',
    questionSource: QuestionSource = 'auto'
  ) => {
    setConnecting(true);
    setServerError(null);
    const overridesList = Object.values(curriculumOverrides);
    arenaSocket.send({
      type: 'create_room',
      playerName,
      settings: { competitionMode, difficulty, questionSource },
      customQuestions: customQuestions.length > 0 ? customQuestions : undefined,
      curriculumOverrides: overridesList.length > 0 ? overridesList : undefined,
      hostAsSupervisor: true,
    });
  };

  const handleStartSoloLearning = (
    playerName: string,
    difficulty: DifficultyLevel = 'mixed',
    questionSource: QuestionSource = 'auto'
  ) => {
    setConnecting(true);
    setServerError(null);
    const overridesList = Object.values(curriculumOverrides);
    arenaSocket.send({
      type: 'create_room',
      playerName,
      settings: { competitionMode: 'individual', difficulty, questionSource, roundCount: 6 },
      customQuestions: questionSource === 'custom' ? customQuestions : undefined,
      curriculumOverrides: overridesList.length > 0 ? overridesList : undefined,
      autoStart: true,
      hostAsSupervisor: false,
    });
  };

  const handleJoinRoom = (code: string, playerName: string, teamId?: TeamId) => {
    setConnecting(true);
    setServerError(null);
    arenaSocket.send({ type: 'join_room', code, playerName, teamId });
  };

  const handleLeaveToTitle = () => {
    arenaSocket.send({ type: 'leave_room' });
    setRoom(null);
    setPlayerId(null);
    setJoinLinkCode(null);
    setPaused(false);
    setServerError(null);
    window.history.replaceState({}, '', window.location.pathname);
  };

  const handleSubmitAnswer = (payload: AnswerPayload) => {
    arenaSocket.send({ type: 'submit_answer', payload });
  };

  const handleEndRoundNow = () => {
    arenaSocket.send({ type: 'end_round_now' });
  };

  const handleSwitchTeam = (teamId: TeamId) => {
    arenaSocket.send({ type: 'switch_team', teamId });
  };

  const handleUpdateSettings = (settings: Partial<RoomSettings>) => {
    arenaSocket.send({ type: 'update_settings', settings });
  };

  const handleStartMatch = () => {
    arenaSocket.send({ type: 'start_match' });
  };

  const handleNextRound = () => {
    arenaSocket.send({ type: 'next_round' });
  };

  const handleRestartMatch = () => {
    setPaused(false);
    arenaSocket.send({ type: 'restart_match' });
  };

  // 1. Direct Student Link Join Screen (/?room=XXXX)
  if (!room && joinLinkCode) {
    return (
      <>
        <JoinScreen
          roomCode={joinLinkCode}
          muted={muted}
          onToggleMute={handleToggleMute}
          onJoin={handleJoinRoom}
          onBackToTitle={() => {
            setJoinLinkCode(null);
            setServerError(null);
            window.history.replaceState({}, '', window.location.pathname);
          }}
          serverError={serverError}
        />
      </>
    );
  }

  // 2. Title Screen
  if (!room || !playerId) {
    return (
      <>
        <TitleScreen
          muted={muted}
          onToggleMute={handleToggleMute}
          onOpenGuide={() => setGuideOpen(true)}
          customQuestionCount={customQuestions.length}
          curriculumOverrideCount={Object.keys(curriculumOverrides).length}
          cloudUserEmail={cloudUser?.email ?? null}
          onCloudSignIn={handleCloudSignIn}
          onCloudSignOut={handleCloudSignOut}
          onOpenCustomBuilder={() => openQuestionBuilder('write')}
          onOpenCurriculumEditor={() => openQuestionBuilder('bank')}
          onCreateRoom={handleCreateRoom}
          onStartSoloLearning={handleStartSoloLearning}
          onJoinByCode={(code, name) => handleJoinRoom(code, name)}
          serverError={serverError}
          connecting={connecting}
        />
        {guideOpen && <AccountingGuideModal onClose={() => setGuideOpen(false)} />}
        {customBuilderOpen && (
          <CustomQuestionBuilderModal
            initialTab={builderInitialTab}
            questions={customQuestions}
            curriculumOverrides={curriculumOverrides}
            cloudUser={
              cloudUser
                ? { displayName: cloudUser.displayName, email: cloudUser.email }
                : null
            }
            cloudSyncState={cloudSyncState}
            cloudNotice={cloudNotice}
            onCloudSignIn={handleCloudSignIn}
            onCloudSignOut={handleCloudSignOut}
            onChange={handleUpdateCustomQuestions}
            onSaveCurriculumOverride={handleSaveCurriculumOverride}
            onResetCurriculumOverride={handleResetCurriculumOverride}
            onClose={() => setCustomBuilderOpen(false)}
          />
        )}
      </>
    );
  }

  // 3. Lobby Screen
  if (room.phase === 'lobby') {
    return (
      <>
        <LobbyScreen
          room={room}
          playerId={playerId}
          muted={muted}
          serverError={serverError}
          onToggleMute={handleToggleMute}
          onSwitchTeam={handleSwitchTeam}
          onUpdateSettings={handleUpdateSettings}
          onOpenCustomBuilder={() => openQuestionBuilder('write')}
          onStartMatch={handleStartMatch}
          onOpenGuide={() => setGuideOpen(true)}
          onLeaveRoom={handleLeaveToTitle}
        />
        {guideOpen && <AccountingGuideModal onClose={() => setGuideOpen(false)} />}
        {customBuilderOpen && (
          <CustomQuestionBuilderModal
            initialTab={builderInitialTab}
            questions={customQuestions}
            curriculumOverrides={curriculumOverrides}
            cloudUser={
              cloudUser
                ? { displayName: cloudUser.displayName, email: cloudUser.email }
                : null
            }
            cloudSyncState={cloudSyncState}
            cloudNotice={cloudNotice}
            onCloudSignIn={handleCloudSignIn}
            onCloudSignOut={handleCloudSignOut}
            onChange={handleUpdateCustomQuestions}
            onSaveCurriculumOverride={handleSaveCurriculumOverride}
            onResetCurriculumOverride={handleResetCurriculumOverride}
            onClose={() => setCustomBuilderOpen(false)}
          />
        )}
      </>
    );
  }

  // 4. Victory Podium Screen
  if (room.phase === 'finished') {
    return (
      <>
        <ParticleBurst triggerKey={particleKey} />
        <VictoryPodium
          room={room}
          playerId={playerId}
          onRestart={handleRestartMatch}
          onReturnTitle={handleLeaveToTitle}
        />
      </>
    );
  }

  // 5. Active Gameplay & Round Reveal Arena
  const me = room.players.find((p) => p.id === playerId);
  const isSupervisor = Boolean(me?.isSupervisor);
  const hasAnswered = room.answeredPlayerIds.includes(playerId);
  const currentQuestion = room.currentQuestion;
  const totalSeconds = currentQuestion?.timeLimitSec ?? 20;
  const isHost = room.hostId === playerId;

  return (
    <div className="safe-area-shell w-full felt-table-surface mahogany-frame px-3 sm:px-8 py-2.5 sm:py-5 flex flex-col gap-2.5 sm:gap-5 relative">
      <ParticleBurst triggerKey={particleKey} />

      <GameHud
        room={room}
        playerId={playerId}
        secondsLeft={secondsLeft}
        totalSeconds={totalSeconds}
        muted={muted}
        onToggleMute={handleToggleMute}
        onOpenPause={() => setPaused(true)}
      />

      <main className="w-full flex-1 flex flex-col justify-start sm:justify-center py-2">
        {room.phase === 'playing' && currentQuestion && isSupervisor && (
          <SupervisorRoundView room={room} onEndRoundNow={handleEndRoundNow} />
        )}

        {room.phase === 'playing' && currentQuestion && !isSupervisor && (
          <div className="flex flex-col gap-4">
            {currentQuestion.mode === 'mcq' && (
              <McqRound
                question={currentQuestion}
                locked={hasAnswered}
                onSubmit={handleSubmitAnswer}
              />
            )}
            {currentQuestion.mode === 'journal_entry' && (
              <JournalEntryRound
                question={currentQuestion}
                locked={hasAnswered}
                onSubmit={handleSubmitAnswer}
              />
            )}
            {currentQuestion.mode === 'debit_credit' && (
              <DebitCreditRound
                question={currentQuestion}
                locked={hasAnswered}
                onSubmit={handleSubmitAnswer}
              />
            )}
            {currentQuestion.mode === 'classify' && (
              <ClassifyRound
                question={currentQuestion}
                locked={hasAnswered}
                onSubmit={handleSubmitAnswer}
              />
            )}
            {currentQuestion.mode === 'equation' && (
              <EquationRound
                question={currentQuestion}
                locked={hasAnswered}
                onSubmit={handleSubmitAnswer}
              />
            )}
            {currentQuestion.mode === 'true_false' && (
              <TrueFalseRound
                question={currentQuestion}
                locked={hasAnswered}
                onSubmit={handleSubmitAnswer}
              />
            )}

            {hasAnswered && (
              <div
                role="status"
                className="text-center text-sm font-bold text-[#F4D891] pt-1"
              >
                وەڵامەکەت تۆمارکرا — چاوەڕوانی تەواوبوونی قوتابیانی تر...
              </div>
            )}
          </div>
        )}

        {room.phase === 'round_result' && (
          <RoundReveal
            room={room}
            playerId={playerId}
            onNextRound={handleNextRound}
          />
        )}
      </main>

      {paused && (
        <PauseModal
          isHost={isHost}
          onResume={() => setPaused(false)}
          onRestart={handleRestartMatch}
          onExit={handleLeaveToTitle}
        />
      )}
    </div>
  );
}
