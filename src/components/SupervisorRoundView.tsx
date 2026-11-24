import { CheckCircle2, Clock, Eye, ShieldCheck, Users } from 'lucide-react';
import { GAME_MODE_LABELS, LEDGER_BUCKET_LABELS } from '../game/questions';
import type { GameQuestion, PublicRoomState } from '../game/types';

const OPTION_LETTERS = ['أ', 'ب', 'ج', 'د'];

function renderQuestionPreview(question: GameQuestion) {
  switch (question.mode) {
    case 'mcq':
      return (
        <div className="flex flex-col gap-4">
          <h2 className="text-xl sm:text-2xl font-bold text-[#1B1712] leading-relaxed">
            {question.prompt}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {question.options.map((opt, idx) => (
              <div
                key={idx}
                className="rounded-xl bg-[#EFE6D2] border border-[#8B6B34]/25 px-4 py-3 flex items-center gap-3"
              >
                <span className="w-8 h-8 rounded-lg bg-[#0D3829] text-[#F4D891] font-bold text-sm flex items-center justify-center shrink-0">
                  {OPTION_LETTERS[idx]}
                </span>
                <span className="text-sm sm:text-base font-bold text-[#1B1712]">{opt}</span>
              </div>
            ))}
          </div>
        </div>
      );

    case 'journal_entry':
      return (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-[#6F582C]">
            <span>{question.topic} · سجل اليومية</span>
            <span className="font-numeric text-sm text-[#0E4A35]">
              {question.amount.toLocaleString('en-US')} {question.currency}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#1B1712] leading-relaxed">
            {question.transaction}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {question.accounts.map((acc) => (
              <div
                key={acc}
                className="rounded-xl bg-[#EFE6D2] border border-[#8B6B34]/25 px-3 py-2.5 text-center font-bold text-sm text-[#1B1712]"
              >
                {acc}
              </div>
            ))}
          </div>
        </div>
      );

    case 'debit_credit':
      return (
        <div className="flex flex-col gap-3">
          <div className="text-sm text-[#5A482B] font-semibold">{question.transaction}</div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#1B1712] leading-relaxed">
            {question.prompt}
          </h2>
          <div className="inline-flex items-center gap-2 text-sm font-extrabold text-[#0E4A35] bg-[#EFE6D2] border border-[#8B6B34]/25 rounded-xl px-4 py-2 w-fit">
            <span>الحساب المطلوب:</span>
            <span>{question.targetAccount}</span>
          </div>
        </div>
      );

    case 'classify':
      return (
        <div className="flex flex-col gap-4">
          <h2 className="text-xl sm:text-2xl font-bold text-[#1B1712] leading-relaxed">
            {question.prompt}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {question.items.map((item) => (
              <div
                key={item.id}
                className="rounded-xl bg-[#EFE6D2] border border-[#8B6B34]/25 px-3 py-2.5 text-center font-bold text-sm text-[#1B1712]"
              >
                {item.label}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-[#6F582C] font-semibold">
            {(['assets', 'liabilities_equity', 'revenue', 'expenses'] as const).map((b) => (
              <span key={b} className="px-2.5 py-1 rounded-md bg-[#F3ECDC] border border-[#8B6B34]/20">
                {LEDGER_BUCKET_LABELS[b].title}
              </span>
            ))}
          </div>
        </div>
      );

    case 'equation':
      return (
        <div className="flex flex-col gap-4">
          <div className="text-xs font-bold text-[#6F582C]">{question.formulaTitle}</div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#1B1712] leading-relaxed">
            {question.prompt}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {question.choices.map((val) => (
              <div
                key={val}
                className="rounded-xl bg-[#EFE6D2] border border-[#8B6B34]/25 px-3 py-2.5 text-center font-numeric font-extrabold text-base text-[#1B1712]"
              >
                {val.toLocaleString('en-US')} {question.currency}
              </div>
            ))}
          </div>
        </div>
      );

    case 'true_false':
      return (
        <div className="flex flex-col gap-3">
          <div className="text-xs font-bold text-[#6F582C]">{question.ledgerRef}</div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#1B1712] leading-relaxed">
            {question.claim}
          </h2>
        </div>
      );
  }
}

export function SupervisorRoundView({
  room,
  onEndRoundNow,
}: {
  room: PublicRoomState;
  onEndRoundNow: () => void;
}) {
  const question = room.currentQuestion;
  if (!question) return null;

  const students = room.players.filter((p) => !p.isSupervisor && p.connected);
  const answeredSet = new Set(room.answeredPlayerIds);
  const answeredCount = students.filter((s) => answeredSet.has(s.id)).length;
  const modeInfo = GAME_MODE_LABELS[question.mode];

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-5 animate-settle">
      {/* Projector Question Preview Card */}
      <section className="ledger-paper rounded-2xl p-6 sm:p-7 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#8B6B34]/20 pb-3">
          <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-extrabold text-[#0E4A35]">
            <ShieldCheck className="w-4 h-4 text-[#B6811E]" aria-hidden="true" />
            <span>پانێڵی سەرپەرشتیار (مامۆستا) — {modeInfo.title}</span>
          </div>
          <span className="text-xs font-semibold text-[#6F582C]">{question.topic}</span>
        </div>

        {renderQuestionPreview(question)}
      </section>

      {/* Live Student Response Tracker & Moderator Controls */}
      <section className="bg-[#0A271D]/92 border border-[#D4A243]/30 rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-[#F2D28B]" aria-hidden="true" />
            <h3 className="text-base font-bold text-[#FAF5EA]">
              وەڵامدانەوەی قوتابیان ({answeredCount}/{students.length})
            </h3>
          </div>

          <button
            type="button"
            onClick={onEndRoundNow}
            className="min-h-[44px] px-5 py-2 rounded-xl bg-[#D4A243] hover:bg-[#E2B55A] text-[#17120A] font-extrabold text-sm inline-flex items-center gap-2 cursor-pointer shadow-md transition-colors"
          >
            <Eye className="w-4 h-4" aria-hidden="true" />
            تەواوکردنی گەڕ و پیشاندانی وەڵام
          </button>
        </div>

        {students.length === 0 ? (
          <div className="rounded-xl bg-[#071D15] border border-[#D4A243]/20 px-4 py-3 text-sm text-[#CBE0D3]">
            هیچ قوتابییەک بەشدار نییە — تۆ وەک سەرپەرشتیار دەتوانیت کەی بتەوێت کلیک لە «تەواوکردنی گەڕ و پیشاندانی وەڵام» بکەیت بۆ شیکردنەوەی وانەکە.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {students.map((student) => {
              const done = answeredSet.has(student.id);
              const teamName =
                room.settings.competitionMode === 'teams'
                  ? room.teams.find((t) => t.id === student.teamId)?.name
                  : null;
              return (
                <div
                  key={student.id}
                  className={`px-3 py-1.5 rounded-lg border text-xs sm:text-sm font-bold inline-flex items-center gap-2 ${
                    done
                      ? 'bg-[#144434] border-[#6EE7B7]/60 text-[#FAF5EA]'
                      : 'bg-[#081F17] border-[#D4A243]/20 text-[#B8D0C2]'
                  }`}
                >
                  {done ? (
                    <CheckCircle2 className="w-4 h-4 text-[#6EE7B7] shrink-0" aria-hidden="true" />
                  ) : (
                    <Clock className="w-4 h-4 text-[#D4A243]/70 shrink-0" aria-hidden="true" />
                  )}
                  <span>{student.name}</span>
                  {teamName && <span className="text-xs font-medium text-[#A9C2B3]">· {teamName}</span>}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
