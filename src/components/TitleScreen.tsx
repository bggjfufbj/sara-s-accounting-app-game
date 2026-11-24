import { useEffect, useState } from 'react';
import { BookOpen, Cloud, Edit3, GraduationCap, Sparkles, User, Users, Volume2, VolumeX } from 'lucide-react';
import { ALL_GAME_MODES, validatePlayerName, validateRoomCode } from '../game/engine';
import { DIFFICULTY_LABELS, GAME_MODE_LABELS, QUESTION_SOURCE_LABELS } from '../game/questions';
import type { CompetitionMode, DifficultyLevel, QuestionSource } from '../game/types';
import { soundFx } from '../utils/sound';
import { BrassScaleCenterpiece, TitleLockupEmblem } from './BrassEmblem';

export function TitleScreen({
  muted,
  onToggleMute,
  onOpenGuide,
  customQuestionCount,
  curriculumOverrideCount,
  cloudUserEmail,
  onCloudSignIn,
  onCloudSignOut,
  onOpenCustomBuilder,
  onOpenCurriculumEditor,
  onCreateRoom,
  onStartSoloLearning,
  onJoinByCode,
  serverError,
  connecting,
}: {
  muted: boolean;
  onToggleMute: () => void;
  onOpenGuide: () => void;
  customQuestionCount: number;
  curriculumOverrideCount: number;
  cloudUserEmail: string | null;
  onCloudSignIn: () => void;
  onCloudSignOut: () => void;
  onOpenCustomBuilder: () => void;
  onOpenCurriculumEditor: () => void;
  onCreateRoom: (
    playerName: string,
    competitionMode: CompetitionMode,
    difficulty: DifficultyLevel,
    questionSource: QuestionSource
  ) => void;
  onStartSoloLearning: (
    playerName: string,
    difficulty: DifficultyLevel,
    questionSource: QuestionSource
  ) => void;
  onJoinByCode: (code: string, playerName: string) => void;
  serverError: string | null;
  connecting: boolean;
}) {
  const [playerName, setPlayerName] = useState('مامۆستا');
  const [competitionMode, setCompetitionMode] = useState<CompetitionMode>('teams');
  const [questionSource, setQuestionSource] = useState<QuestionSource>('auto');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('mixed');
  const [joinOpen, setJoinOpen] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [scaleTilt, setScaleTilt] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const ratio = (e.clientX / Math.max(1, window.innerWidth) - 0.5) * 2;
    setScaleTilt(ratio * -9);
  };

  const handleCreate = (e?: React.FormEvent) => {
    e?.preventDefault();
    const res = validatePlayerName(playerName);
    if (!res.ok) {
      setFormError(res.error);
      return;
    }
    setFormError(null);
    soundFx.click();
    onCreateRoom(res.value, competitionMode, difficulty, questionSource);
  };

  const handleSolo = () => {
    const res = validatePlayerName(playerName);
    if (!res.ok) {
      setFormError(res.error);
      return;
    }
    if (questionSource === 'custom' && customQuestionCount === 0) {
      setFormError('تکایە سەرەتا لانیکەم ١ پرسیار دابنێ یان پرسیاری خۆکار (Auto) هەڵبژێرە.');
      onOpenCustomBuilder();
      return;
    }
    setFormError(null);
    soundFx.click();
    onStartSoloLearning(res.value, difficulty, questionSource);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const nameRes = validatePlayerName(playerName);
    if (!nameRes.ok) {
      setFormError(nameRes.error);
      return;
    }
    const codeRes = validateRoomCode(roomCode);
    if (!codeRes.ok) {
      setFormError(codeRes.error);
      return;
    }
    setFormError(null);
    soundFx.click();
    onJoinByCode(codeRes.value, nameRes.value);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLButtonElement
      ) {
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleCreate();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [playerName, competitionMode, difficulty, questionSource]);

  const activeError = formError || serverError;

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setScaleTilt(0)}
      className="safe-area-shell w-full felt-table-surface mahogany-frame flex flex-col justify-between px-4 sm:px-10 lg:px-16 py-4 sm:py-5 relative overflow-x-clip"
    >
      {/* Minimal corner utility buttons (Cloud Save + Guide + Mute) */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            soundFx.click();
            if (cloudUserEmail) {
              onCloudSignOut();
            } else {
              onCloudSignIn();
            }
          }}
          title={
            cloudUserEmail
              ? `پاشەکەوتی هەور چالاکە (${cloudUserEmail}) — کلیک بکە بۆ دەرچوون`
              : 'چوونەژوورەوە بە Google بۆ پاشەکەوتکردنی هەمیشەیی پرسیارەکان'
          }
          className={`min-h-[42px] px-3.5 py-2 rounded-lg border text-xs sm:text-sm font-bold inline-flex items-center gap-2 transition-colors cursor-pointer ${
            cloudUserEmail
              ? 'bg-[#0F3829] border-[#6EE7B7]/45 text-[#A7F3D0] hover:border-[#6EE7B7]'
              : 'bg-[#0A271D] border-[#D4A243]/35 text-[#F2D28B] hover:border-[#F2D28B]'
          }`}
        >
          <Cloud className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{cloudUserEmail ? 'پاشەکەوتی هەور ✓' : 'پاشەکەوتی هەور'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            soundFx.click();
            onOpenGuide();
          }}
          className="min-h-[42px] px-4 py-2 rounded-lg bg-[#0A271D] border border-[#D4A243]/35 text-[#F2D28B] hover:border-[#F2D28B] text-sm font-bold inline-flex items-center gap-2 transition-colors cursor-pointer"
        >
          <BookOpen className="w-4 h-4" aria-hidden="true" />
          ڕێبەری فێربوون
        </button>

        <button
          type="button"
          data-mute-toggle="true"
          tabIndex={-1}
          onClick={(e) => {
            e.currentTarget.blur();
            onToggleMute();
          }}
          aria-label={muted ? 'چالاککردنی دەنگ و میوزیک' : 'بێدەنگکردنی دەنگ و میوزیک'}
          title={muted ? 'چالاککردنی دەنگ و میوزیک' : 'بێدەنگکردنی دەنگ و میوزیک'}
          className="w-11 h-11 rounded-lg bg-[#0A271D] border border-[#D4A243]/35 text-[#F2D28B] hover:border-[#F2D28B] flex items-center justify-center transition-colors cursor-pointer"
        >
          {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
      </div>

      {/* Main Two-Region Stage Composition */}
      <main className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1.18fr_0.82fr] gap-8 lg:gap-12 items-center my-auto py-3">
        {/* Primary Anchor (RTL): Title Lockup + Interactive Entry */}
        <section className="flex flex-col gap-5 max-w-xl">
          <TitleLockupEmblem />

          <p className="text-base sm:text-lg text-[#D7E6DC] leading-relaxed">
            پلاتفۆرمی فێربوون و پێشبڕکێی ئۆنلاین لە  (بنەماکانی ژمێریاری) — بە شێوازی تیم یان تاکەکەسی فێری القيد اليومي، المدين والدائن و المعادلة المحاسبية ببە.
          </p>

          {/* Clean unboxed game modes list */}
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs sm:text-sm text-[#E4C57A]">
            {ALL_GAME_MODES.map((mode, idx) => (
              <span key={mode} className="inline-flex items-center gap-2.5">
                <span>{GAME_MODE_LABELS[mode].title}</span>
                {idx < ALL_GAME_MODES.length - 1 && (
                  <span aria-hidden="true" className="text-[#D4A243]/50">·</span>
                )}
              </span>
            ))}
          </div>

          {/* Interactive Entry Panel */}
          <div className="bg-[#0A281E]/90 border border-[#D4A243]/30 rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="title-player-name" className="text-sm font-semibold text-[#E8D5A9]">
                ناوی تۆ (مامۆستا یان قوتابی)
              </label>
              <input
                id="title-player-name"
                type="text"
                value={playerName}
                onChange={(e) => {
                  setPlayerName(e.target.value);
                  if (formError) setFormError(null);
                }}
                maxLength={24}
                placeholder="بۆ نموونە: مامۆستا ڕەوەند یان ئارام"
                className="min-h-[46px] px-4 rounded-xl bg-[#071D15] border border-[#D4A243]/35 text-[#FAF5EA] placeholder-[#7FA090] text-base focus-visible:outline-2 focus-visible:outline-[#F2D28B]"
              />
            </div>

            {/* Mode Selector: Teams vs Individual */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-[#E8D5A9]">شێوازی پێشبڕکێی ژوور</span>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    soundFx.click();
                    setCompetitionMode('teams');
                  }}
                  className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                    competitionMode === 'teams'
                      ? 'bg-[#174E3B] border-[#F2D28B] text-[#FAF5EA]'
                      : 'bg-[#081F17] border-[#D4A243]/25 text-[#B4CCBE] hover:border-[#D4A243]/55'
                  }`}
                >
                  <Users className="w-4 h-4 text-[#F2D28B]" aria-hidden="true" />
                  شێوازی تیم (گروپ)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundFx.click();
                    setCompetitionMode('individual');
                  }}
                  className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                    competitionMode === 'individual'
                      ? 'bg-[#174E3B] border-[#F2D28B] text-[#FAF5EA]'
                      : 'bg-[#081F17] border-[#D4A243]/25 text-[#B4CCBE] hover:border-[#D4A243]/55'
                  }`}
                >
                  <User className="w-4 h-4 text-[#F2D28B]" aria-hidden="true" />
                  شێوازی تاکەکەسی
                </button>
              </div>
            </div>

            {/* Question Source Selector: Auto (Curriculum) vs Teacher Custom Questions */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-[#E8D5A9]">سەرچاوەی پرسیارەکان</span>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setQuestionSource('auto');
                    setFormError(null);
                  }}
                  className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    questionSource === 'auto'
                      ? 'bg-[#174E3B] border-[#F2D28B] text-[#FAF5EA]'
                      : 'bg-[#081F17] border-[#D4A243]/25 text-[#B4CCBE] hover:border-[#D4A243]/55'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-[#F2D28B] shrink-0" aria-hidden="true" />
                  {QUESTION_SOURCE_LABELS.auto.shortTitle}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQuestionSource('custom');
                    setFormError(null);
                  }}
                  className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    questionSource === 'custom'
                      ? 'bg-[#174E3B] border-[#F2D28B] text-[#FAF5EA]'
                      : 'bg-[#081F17] border-[#D4A243]/25 text-[#B4CCBE] hover:border-[#D4A243]/55'
                  }`}
                >
                  <Edit3 className="w-4 h-4 text-[#F2D28B] shrink-0" aria-hidden="true" />
                  {QUESTION_SOURCE_LABELS.custom.title}
                </button>
              </div>
            </div>

            {questionSource === 'auto' ? (
              /* Difficulty Selector: Beginner (Easy) vs Mixed vs Hard */
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#E8D5A9] inline-flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-[#F2D28B]" aria-hidden="true" />
                    ئاستی پرسیارەکان شێوازی
                  </span>
                  <span className="text-[11px] text-[#A9C2B3] truncate">
                    {DIFFICULTY_LABELS[difficulty].shortTitle}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(['easy', 'mixed', 'hard'] as const).map((lvl) => {
                    const active = difficulty === lvl;
                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setDifficulty(lvl)}
                        className={`min-h-[40px] px-2.5 py-1.5 rounded-xl border text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#174E3B] border-[#F2D28B] text-[#FAF5EA]'
                            : 'bg-[#081F17] border-[#D4A243]/25 text-[#B4CCBE] hover:border-[#D4A243]/55'
                        }`}
                      >
                        {DIFFICULTY_LABELS[lvl].shortTitle}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={onOpenCurriculumEditor}
                  className="mt-1 min-h-[38px] px-3 py-1.5 rounded-xl bg-[#0D3225] hover:bg-[#144735] border border-[#D4A243]/40 text-[#F4D891] font-bold text-xs inline-flex items-center justify-between gap-2 transition-colors cursor-pointer"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    بینین و دەستکاریکردنی پرسیارەکانی مەنهەج
                  </span>
                  {curriculumOverrideCount > 0 && (
                    <span className="font-numeric text-[11px] font-extrabold text-[#17120A] bg-[#D4A243] px-2 py-0.5 rounded">
                      {curriculumOverrideCount} دەستکاریکراو
                    </span>
                  )}
                </button>
              </div>
            ) : (
              /* Teacher Custom Question Summary + Open Builder CTA */
              <div className="rounded-xl bg-[#0D3225] border border-[#D4A243]/40 p-3 flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-xs sm:text-sm font-bold text-[#FAF5EA]">
                    {customQuestionCount > 0
                      ? `${customQuestionCount} پرسیاری تایبەتت ئامادە کردووە`
                      : 'هێشتا هیچ پرسیارێکت دانەناوە'}
                  </span>
                  <span className="text-[11px] text-[#B8D0C2]">
                    کلیک لە دوگمەی تەنیشت بکە بۆ دانان یان دەستکاریکردنی پرسیارەکان
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onOpenCustomBuilder}
                  className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-[#D4A243] hover:bg-[#E2B55A] text-[#17120A] font-extrabold text-xs inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                  {customQuestionCount > 0 ? 'دەستکاریکردنی پرسیارەکان' : 'دانانی پرسیارەکان'}
                </button>
              </div>
            )}

            {joinOpen && (
              <form onSubmit={handleJoin} className="flex flex-col sm:flex-row gap-3 pt-1">
                <div className="flex-1 flex flex-col gap-1.5">
                  <label htmlFor="title-room-code" className="text-sm font-semibold text-[#E8D5A9]">
                    کۆدی ژوور (٤ پیت)
                  </label>
                  <input
                    id="title-room-code"
                    type="text"
                    inputMode="text"
                    autoCapitalize="characters"
                    value={roomCode}
                    onChange={(e) => {
                      setRoomCode(e.target.value.toUpperCase());
                      if (formError) setFormError(null);
                    }}
                    maxLength={4}
                    placeholder="KRD4"
                    className="font-numeric uppercase tracking-widest min-h-[46px] px-4 rounded-xl bg-[#071D15] border border-[#D4A243]/35 text-[#FAF5EA] placeholder-[#7FA090] text-base sm:text-lg text-center focus-visible:outline-2 focus-visible:outline-[#F2D28B]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={connecting}
                  className="sm:self-end min-h-[46px] px-6 py-2.5 rounded-xl bg-[#1F7F5B] hover:bg-[#26986D] text-[#FAF5EA] font-bold text-base transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  چوونە ژوورەوە
                </button>
              </form>
            )}

            {activeError && (
              <p role="alert" className="text-sm font-semibold text-[#FCA5A5]">
                {activeError}
              </p>
            )}

            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5 pt-1">
              <button
                type="button"
                data-start="true"
                disabled={connecting}
                onClick={() => handleCreate()}
                className="flex-1 min-w-[190px] min-h-[50px] px-5 py-2.5 rounded-xl bg-[#D4A243] hover:bg-[#E2B55A] active:scale-[0.99] text-[#17120A] font-extrabold text-base transition-all cursor-pointer shadow-lg whitespace-nowrap"
              >
                {connecting ? 'پەیوەندیکردن...' : 'درووستکردنی ژووری ئۆنلاین'}
              </button>

              <div className="grid grid-cols-2 sm:flex gap-2.5">
                <button
                  type="button"
                  disabled={connecting}
                  onClick={handleSolo}
                  className="min-h-[48px] px-3.5 sm:px-4 py-2 rounded-xl bg-[#17573F] hover:bg-[#1E6B4F] text-[#FAF5EA] border border-[#6EE7B7]/35 font-bold text-xs sm:text-sm transition-colors cursor-pointer whitespace-nowrap"
                >
                  یاری تاکەکەسی خێرا
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setJoinOpen((v) => !v);
                    setFormError(null);
                  }}
                  className="min-h-[48px] px-3.5 sm:px-4 py-2 rounded-xl bg-[#123E2F] hover:bg-[#184F3C] text-[#FAF5EA] border border-[#D4A243]/35 font-bold text-xs sm:text-sm transition-colors cursor-pointer whitespace-nowrap"
                >
                  {joinOpen ? 'داخستن' : 'چوونە ژوور بە کۆد'}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Complementary Region: Interactive Antique Brass Balance Scale Centerpiece */}
        <aside className="hidden lg:flex flex-col items-center justify-center py-2">
          <div className="animate-float-gentle w-full flex items-center justify-center">
            <BrassScaleCenterpiece
              tiltDeg={scaleTilt}
              rightLabel="الموجودات"
              leftLabel="المطلوبات + رأس المال"
            />
          </div>
        </aside>
      </main>

      {/* Single Flat Borderless Control Hint Line */}
      <footer className="w-full max-w-6xl mx-auto pt-3 flex items-center justify-center text-xs sm:text-sm text-[#A8C2B3]">
        <span>Enter دەستپێکردن · 1–4 هەڵبژاردنی وەڵام · P وەستان · M بێدەنگکردن</span>
      </footer>
    </div>
  );
}
