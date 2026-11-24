import { ArrowLeft, BookOpen, CheckCircle2, ShieldCheck, Trophy, User, XCircle } from 'lucide-react';
import { getRankedPlayers, getRankedTeams } from '../game/engine';
import { LEDGER_BUCKET_LABELS } from '../game/questions';
import type { GameQuestion, PublicRoomState } from '../game/types';
import { soundFx } from '../utils/sound';
import { TeamCrestIcon } from './BrassEmblem';

function formatLedgerEntryLine(prefix: 'من' | 'إلى', account: string): string {
  const clean = account.trim();
  return clean.startsWith('حـ/') ? `${prefix} ${clean}` : `${prefix} حـ/ ${clean}`;
}

function getCorrectAnswerLabel(question: GameQuestion): string {
  switch (question.mode) {
    case 'mcq':
      return question.options[question.correctIndex];
    case 'journal_entry':
      return `${formatLedgerEntryLine('من', question.correctDebit)}  ←  ${formatLedgerEntryLine('إلى', question.correctCredit)}`;
    case 'debit_credit':
      return question.correctSide === 'debit' ? 'مدين (من حـ/)' : 'دائن (إلى حـ/)';
    case 'classify':
      return question.items
        .map((item) => `${item.label}: ${LEDGER_BUCKET_LABELS[item.correctBucket].title}`)
        .join(' · ');
    case 'equation':
      return `${question.correctValue.toLocaleString('en-US')}${question.currency}`;
    case 'true_false':
      return question.correctAnswer ? 'ڕاستە (پەسەندە)' : 'هەڵەیە (ڕەتدەکرێتەوە)';
  }
}

export function RoundReveal({
  room,
  playerId,
  onNextRound,
}: {
  room: PublicRoomState;
  playerId: string;
  onNextRound: () => void;
}) {
  const question = room.currentQuestion;
  const summary = room.lastRoundSummary;
  if (!question || !summary) return null;

  const me = room.players.find((p) => p.id === playerId);
  const isHost = room.hostId === playerId;
  const isSupervisor = Boolean(me?.isSupervisor);
  const isIndividual = room.settings.competitionMode === 'individual';
  const myAnswer = summary.answers.find((a) => a.playerId === playerId);
  const rankedTeams = getRankedTeams(room.teams);
  const rankedPlayers = getRankedPlayers(room.players);
  const maxTeamScore = Math.max(1, rankedTeams[0]?.score ?? 1);
  const maxPlayerScore = Math.max(1, rankedPlayers[0]?.score ?? 1);
  const isLastRound = room.currentRoundIndex + 1 >= room.totalRounds;
  const visualLesson = 'lesson' in question ? question.lesson : undefined;
  const totalStudents = room.players.filter((p) => !p.isSupervisor && p.connected).length;
  const correctStudents = summary.answers.filter((a) => a.isCorrect).length;

  const partialTitle =
    question.mode === 'journal_entry'
      ? 'باش بوو! لایەنێکی القيد اليومي درووست بوو (نیوەی خاڵت وەرگرت)'
      : 'باش بوو! بەشێک لە پۆلێنکردنەکەت درووست بوو';

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-5 animate-settle">
      {/* Outcome & Educational Breakdown */}
      <section className="ledger-paper rounded-2xl p-5 sm:p-7 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {isSupervisor ? (
            <>
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-7 h-7 text-[#0E4A35] shrink-0" aria-hidden="true" />
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#1B1712]">
                  شیکردنەوەی وەڵامی درووست (پانێڵی سەرپەرشتیار)
                </h2>
              </div>
              <div className="text-left">
                <span className="font-numeric text-lg font-extrabold text-[#0E4A35]">
                  {correctStudents}/{totalStudents}
                </span>
                <span className="text-xs font-bold text-[#6F582C] mr-1.5">قوتابی وەڵامی درووستیان دا</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2.5">
                {myAnswer?.isCorrect ? (
                  <CheckCircle2 className="w-7 h-7 text-[#15734E] shrink-0" aria-hidden="true" />
                ) : myAnswer && myAnswer.accuracyRatio > 0 ? (
                  <CheckCircle2 className="w-7 h-7 text-[#B6811E] shrink-0" aria-hidden="true" />
                ) : (
                  <XCircle className="w-7 h-7 text-[#B83232] shrink-0" aria-hidden="true" />
                )}
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#1B1712]">
                  {myAnswer?.isCorrect
                    ? 'ئافەرین! وەڵامەکەت تەواو درووست بوو'
                    : myAnswer && myAnswer.accuracyRatio > 0
                      ? partialTitle
                      : myAnswer
                        ? 'ئەم جارە وەڵامەکەت هەڵە بوو — سەیری شیکردنەوەکە بکە'
                        : 'کات تەواو بوو پێش وەڵامدانەوە'}
                </h2>
              </div>

              {myAnswer && myAnswer.pointsEarned > 0 && (
                <div className="text-left">
                  <span className="font-numeric text-2xl font-extrabold text-[#146D4A]">
                    +{myAnswer.pointsEarned}
                  </span>
                  <span className="text-xs font-bold text-[#6F582C] mr-1.5">خاڵ</span>
                  {(myAnswer.speedBonus > 0 || myAnswer.streakBonus > 0) && (
                    <div className="text-xs text-[#6F582C] tabular-nums">
                      خێرایی +{myAnswer.speedBonus}
                      {myAnswer.streakBonus > 0 ? ` · زنجیرە +${myAnswer.streakBonus}` : ''}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Correct Answer & Explanation */}
        <div className="rounded-xl bg-[#EFE6D2] border border-[#8B6B34]/25 p-4 flex flex-col gap-2">
          <div className="text-xs font-bold text-[#6F582C]">وەڵامی درووست</div>
          <div className="text-base sm:text-lg font-extrabold text-[#0E4A35]">
            {getCorrectAnswerLabel(question)}
          </div>
          <p className="text-sm text-[#352D22] leading-relaxed pt-0.5">{question.explanation}</p>
        </div>

        {/* Visual Accounting Learning Slip (Journal Entry + Golden Rule) */}
        {visualLesson ? (
          <div className="rounded-xl bg-[#0D3326] border border-[#D4A243]/40 p-4 text-[#FAF5EA] flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2 border-b border-[#D4A243]/20 pb-2">
              <span className="inline-flex items-center gap-2 text-xs font-bold text-[#F4D891]">
                <BookOpen className="w-4 h-4" aria-hidden="true" />
                وانەی خێرا: شێوازی تۆمارکردن لە سجل اليومية
              </span>
              {visualLesson.amountLabel && (
                <span className="font-numeric text-xs font-bold text-[#E8D5A9]">
                  {visualLesson.amountLabel}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2 text-sm sm:text-base font-bold">
              <div className="flex items-center justify-between gap-3 rounded-lg bg-[#09241B] border border-[#1FA977]/35 px-3.5 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-[#6EE7B7]">من</span>
                  <span className="text-[#FAF5EA]">
                    {visualLesson.debitAccount.trim().startsWith('حـ/')
                      ? visualLesson.debitAccount.trim()
                      : `حـ/ ${visualLesson.debitAccount.trim()}`}
                  </span>
                </div>
                <span className="text-xs font-semibold text-[#6EE7B7]">مدين</span>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-lg bg-[#09241B] border border-[#E06D6D]/35 px-3.5 py-2 mr-4 sm:mr-8">
                <div className="flex items-center gap-2">
                  <span className="text-[#FCA5A5]">إلى</span>
                  <span className="text-[#FAF5EA]">
                    {visualLesson.creditAccount.trim().startsWith('حـ/')
                      ? visualLesson.creditAccount.trim()
                      : `حـ/ ${visualLesson.creditAccount.trim()}`}
                  </span>
                </div>
                <span className="text-xs font-semibold text-[#FCA5A5]">دائن</span>
              </div>
            </div>

            <div className="text-xs sm:text-sm text-[#E9DFC9] leading-relaxed pt-0.5">
              <span className="font-bold text-[#F4D891]">یاسای زێڕین: </span>
              {visualLesson.ruleSummary}
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-[#0D3326] border border-[#D4A243]/35 px-4 py-3 text-xs sm:text-sm text-[#E9DFC9] flex items-start gap-2.5">
            <BookOpen className="w-4 h-4 text-[#F4D891] shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <span className="font-bold text-[#F4D891]">یاسای فێربوون: </span>
              {question.ruleHint}
            </div>
          </div>
        )}
      </section>

      {/* Live Standings Race (Teams OR Individual) */}
      <section className="bg-[#0A271D]/92 border border-[#D4A243]/30 rounded-2xl p-5 sm:p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base sm:text-lg font-bold text-[#FAF5EA] inline-flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#F2D28B]" aria-hidden="true" />
            {isIndividual
              ? rankedPlayers.length === 1
                ? 'پێشکەوتنی خۆت لەم ڕاهێنانەدا'
                : 'ڕیزبەندی قوتابیان تا ئێستا (تاکەکەسی)'
              : 'ڕیزبەندی تیمەکان تا ئێستا'}
          </h3>
          <span className="text-xs text-[#B8D0C2]">
            {isIndividual ? 'خاڵەکان بەپێی ئەنجامی تاکەکەسی' : 'خاڵەکان بەپێی ئەنجامی گشتی تیم'}
          </span>
        </div>

        {isIndividual ? (
          rankedPlayers.length === 0 ? (
            <div className="text-sm text-[#B8D0C2] py-2">
              هیچ قوتابییەک بەشدار نەبووە لەم گەڕەدا.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {rankedPlayers.slice(0, 8).map((p, rankIdx) => {
              const widthRatio = Math.max(0.08, p.score / maxPlayerScore);
              const isMe = p.id === playerId;
              return (
                <div key={p.id} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-numeric text-xs font-bold text-[#E4C57A] w-5 text-center">
                        #{rankIdx + 1}
                      </span>
                      <span className="w-6 h-6 rounded-full bg-[#123D2E] border border-[#D4A243]/40 flex items-center justify-center shrink-0">
                        <User className="w-3.5 h-3.5 text-[#F4D891]" aria-hidden="true" />
                      </span>
                      <span className="font-bold text-[#FAF5EA] truncate">
                        {p.name}
                        {isMe ? ' (تۆ)' : ''}
                      </span>
                      <span className="text-xs text-[#A9C2B3] font-numeric">
                        {p.correctCount}/{room.currentRoundIndex + 1} ڕاست
                      </span>
                    </div>

                    <div className="flex items-baseline gap-2 shrink-0">
                      {p.roundDelta > 0 && (
                        <span className="font-numeric text-xs font-bold text-[#6EE7B7]">
                          +{p.roundDelta}
                        </span>
                      )}
                      <span className="font-numeric text-lg font-extrabold text-[#F4D891]">
                        {p.score}
                      </span>
                    </div>
                  </div>

                  <div className="w-full h-2.5 rounded-full bg-[#071C14] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-transform duration-300 origin-right"
                      style={{
                        backgroundColor: isMe ? '#D4A243' : '#2E9D71',
                        transform: `scaleX(${widthRatio})`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          )
        ) : (
          <div className="flex flex-col gap-3">
            {rankedTeams.map((team, rankIdx) => {
              const widthRatio = Math.max(0.08, team.score / maxTeamScore);
              const delta = summary.teamDeltas[team.id];
              return (
                <div key={team.id} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-numeric text-xs font-bold text-[#E4C57A] w-5 text-center">
                        #{rankIdx + 1}
                      </span>
                      <TeamCrestIcon crest={team.crest} color={team.accent} size={24} />
                      <span className="font-bold text-[#FAF5EA] truncate">{team.name}</span>
                      {delta && delta.synergy > 0 && (
                        <span className="text-xs font-semibold text-[#6EE7B7] whitespace-nowrap">
                          · پاداشتی هاوئاهەنگی +{delta.synergy}
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline gap-2 shrink-0">
                      {team.roundDelta > 0 && (
                        <span className="font-numeric text-xs font-bold text-[#6EE7B7]">
                          +{team.roundDelta}
                        </span>
                      )}
                      <span className="font-numeric text-lg font-extrabold text-[#F4D891]">
                        {team.score}
                      </span>
                    </div>
                  </div>

                  <div className="w-full h-2.5 rounded-full bg-[#071C14] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-transform duration-300 origin-right"
                      style={{
                        backgroundColor: team.accent,
                        transform: `scaleX(${widthRatio})`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="pt-2 flex items-center justify-end">
          {isHost ? (
            <button
              type="button"
              onClick={() => {
                soundFx.click();
                onNextRound();
              }}
              className="min-h-[50px] px-7 py-2.5 rounded-xl bg-[#D4A243] hover:bg-[#E2B55A] text-[#17120A] font-extrabold text-base inline-flex items-center gap-2 cursor-pointer shadow-lg transition-colors"
            >
              <span>
                {isLastRound
                  ? isIndividual
                    ? 'بینینی ئەنجامی کۆتایی'
                    : 'بینینی تیمی براوە'
                  : 'پرسیاری داهاتوو'}
              </span>
              <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            </button>
          ) : (
            <span className="text-sm font-semibold text-[#E8D5A9]">
              چاوەڕوانی بەڕێوەبەر بە بۆ گەڕی داهاتوو...
            </span>
          )}
        </div>
      </section>
    </div>
  );
}
