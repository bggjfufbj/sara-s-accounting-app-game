export type GameMode =
  | 'mcq'
  | 'journal_entry'
  | 'debit_credit'
  | 'classify'
  | 'equation'
  | 'true_false';

export type CompetitionMode = 'teams' | 'individual';

export type QuestionDifficulty = 'easy' | 'hard';
export type DifficultyLevel = 'easy' | 'mixed' | 'hard';
export type QuestionSource = 'auto' | 'custom';

export type LedgerBucket =
  | 'assets'
  | 'liabilities_equity'
  | 'revenue'
  | 'expenses';

export type TeamId = 'gold' | 'star' | 'moon' | 'sun' | 'falcon' | 'selver';

export interface TeamMeta {
  id: TeamId;
  name: string;
  subtitle: string;
  crest: 'gold' | 'star' | 'moon' | 'sun' | 'falcon' | 'silver';
  accent: string;
  surface: string;
  textOnAccent: string;
}

export interface JournalVisualLesson {
  debitAccount: string;
  creditAccount: string;
  amountLabel?: string;
  ruleSummary: string;
}

export interface McqQuestion {
  id: string;
  mode: 'mcq';
  difficulty: QuestionDifficulty;
  topic: string;
  prompt: string;
  options: [string, string, string, string];
  correctIndex: number;
  timeLimitSec: number;
  ruleHint: string;
  explanation: string;
  lesson?: JournalVisualLesson;
}

export interface JournalEntryQuestion {
  id: string;
  mode: 'journal_entry';
  difficulty: QuestionDifficulty;
  topic: string;
  transaction: string;
  amount: number;
  currency: string;
  accounts: [string, string, string, string];
  correctDebit: string;
  correctCredit: string;
  timeLimitSec: number;
  ruleHint: string;
  explanation: string;
  lesson: JournalVisualLesson;
}

export interface DebitCreditQuestion {
  id: string;
  mode: 'debit_credit';
  difficulty: QuestionDifficulty;
  topic: string;
  transaction: string;
  targetAccount: string;
  prompt: string;
  correctSide: 'debit' | 'credit';
  timeLimitSec: number;
  ruleHint: string;
  explanation: string;
  lesson?: JournalVisualLesson;
}

export interface ClassifyItem {
  id: string;
  label: string;
  correctBucket: LedgerBucket;
}

export interface ClassifyQuestion {
  id: string;
  mode: 'classify';
  difficulty: QuestionDifficulty;
  topic: string;
  prompt: string;
  items: [ClassifyItem, ClassifyItem, ClassifyItem, ClassifyItem];
  timeLimitSec: number;
  ruleHint: string;
  explanation: string;
}

export interface EquationSlot {
  label: string;
  value: number | null;
}

export interface EquationQuestion {
  id: string;
  mode: 'equation';
  difficulty: QuestionDifficulty;
  topic: string;
  formulaTitle: string;
  prompt: string;
  leftSide: EquationSlot[];
  rightSide: EquationSlot[];
  operatorRight: '+' | '-';
  choices: [number, number, number, number];
  correctValue: number;
  currency: string;
  timeLimitSec: number;
  ruleHint: string;
  explanation: string;
}

export interface TrueFalseQuestion {
  id: string;
  mode: 'true_false';
  difficulty: QuestionDifficulty;
  topic: string;
  claim: string;
  ledgerRef: string;
  correctAnswer: boolean;
  timeLimitSec: number;
  ruleHint: string;
  explanation: string;
}

export type GameQuestion =
  | McqQuestion
  | JournalEntryQuestion
  | DebitCreditQuestion
  | ClassifyQuestion
  | EquationQuestion
  | TrueFalseQuestion;

export type AnswerPayload =
  | { mode: 'mcq'; choiceIndex: number }
  | { mode: 'journal_entry'; debitAccount: string; creditAccount: string }
  | { mode: 'debit_credit'; side: 'debit' | 'credit' }
  | { mode: 'classify'; assignments: Record<string, LedgerBucket> }
  | { mode: 'equation'; value: number }
  | { mode: 'true_false'; value: boolean };

export interface SubmittedAnswer {
  playerId: string;
  teamId: TeamId | null;
  payload: AnswerPayload;
  submittedAtMs: number;
  elapsedMs: number;
  isCorrect: boolean;
  accuracyRatio: number;
  pointsEarned: number;
  speedBonus: number;
  streakBonus: number;
}

export interface Player {
  id: string;
  name: string;
  teamId: TeamId | null;
  isHost: boolean;
  isSupervisor: boolean;
  connected: boolean;
  score: number;
  roundDelta: number;
  streak: number;
  correctCount: number;
  answeredCount: number;
}

export interface TeamState {
  id: TeamId;
  name: string;
  subtitle: string;
  crest: TeamMeta['crest'];
  accent: string;
  surface: string;
  textOnAccent: string;
  score: number;
  roundDelta: number;
  synergyBonus: number;
  correctRounds: number;
}

export type RoomPhase = 'lobby' | 'playing' | 'round_result' | 'finished';

export interface RoomSettings {
  competitionMode: CompetitionMode;
  questionSource: QuestionSource;
  difficulty: DifficultyLevel;
  teamCount: 2 | 3 | 4 | 5 | 6;
  roundCount: 6 | 10 | 15;
  enabledModes: GameMode[];
}

export interface RoundSummary {
  questionId: string;
  roundIndex: number;
  answers: SubmittedAnswer[];
  teamDeltas: Record<TeamId, { points: number; synergy: number; correctCount: number; totalCount: number }>;
}

export interface PublicRoomState {
  code: string;
  phase: RoomPhase;
  hostId: string;
  settings: RoomSettings;
  customQuestionCount: number;
  curriculumOverrideCount: number;
  teams: TeamState[];
  players: Player[];
  currentRoundIndex: number;
  totalRounds: number;
  currentQuestion: GameQuestion | null;
  roundStartedAtMs: number | null;
  roundEndsAtMs: number | null;
  answeredPlayerIds: string[];
  lastRoundSummary: RoundSummary | null;
  serverNowMs: number;
}

export interface InternalRoomState
  extends Omit<
    PublicRoomState,
    'currentQuestion' | 'answeredPlayerIds' | 'serverNowMs' | 'customQuestionCount' | 'curriculumOverrideCount'
  > {
  questions: GameQuestion[];
  customQuestions: GameQuestion[];
  curriculumOverrides: GameQuestion[];
  currentAnswers: Map<string, SubmittedAnswer>;
}

export type ClientMessage =
  | {
      type: 'create_room';
      playerName: string;
      settings?: Partial<RoomSettings>;
      customQuestions?: GameQuestion[];
      curriculumOverrides?: GameQuestion[];
      autoStart?: boolean;
      hostAsSupervisor?: boolean;
    }
  | { type: 'join_room'; code: string; playerName: string; teamId?: TeamId }
  | { type: 'switch_team'; teamId: TeamId }
  | { type: 'update_settings'; settings: Partial<RoomSettings> }
  | { type: 'set_custom_questions'; questions: GameQuestion[] }
  | { type: 'set_curriculum_overrides'; overrides: GameQuestion[] }
  | { type: 'start_match' }
  | { type: 'submit_answer'; payload: AnswerPayload }
  | { type: 'end_round_now' }
  | { type: 'next_round' }
  | { type: 'restart_match' }
  | { type: 'leave_room' };

export type ServerMessage =
  | { type: 'welcome'; playerId: string; room: PublicRoomState }
  | { type: 'room_state'; room: PublicRoomState }
  | { type: 'answer_ack'; answer: SubmittedAnswer }
  | { type: 'error'; message: string };
