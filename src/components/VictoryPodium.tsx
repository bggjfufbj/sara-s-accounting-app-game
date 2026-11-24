import { Award, Crown, Home, RotateCcw, User } from 'lucide-react';
import { getMvpPlayer, getRankedPlayers, getRankedTeams } from '../game/engine';
import type { PublicRoomState } from '../game/types';
import { soundFx } from '../utils/sound';
import { TeamCrestIcon } from './BrassEmblem';

export function VictoryPodium({
  room,
  playerId,
  onRestart,
  onReturnTitle,
}: {
  room: PublicRoomState;
  playerId: string;
  onRestart: () => void;
  onReturnTitle: () => void;
}) {
  const isHost = room.hostId === playerId;
  const isIndividual = room.settings.competitionMode === 'individual';
  const rankedTeams = getRankedTeams(room.teams);
  const rankedPlayers = getRankedPlayers(room.players);
  const winnerTeam = rankedTeams[0];
  const winnerPlayer = rankedPlayers[0];
  const mvp = getMvpPlayer(room.players);
  const winnerMembers = winnerTeam
    ? room.players.filter((p) => !p.isSupervisor && p.teamId === winnerTeam.id)
    : [];

  if (isIndividual) {
    const isSolo = rankedPlayers.length === 1;
    const masteryPct = winnerPlayer
      ? Math.round((winnerPlayer.correctCount / Math.max(1, room.totalRounds)) * 100)
      : 0;

    return (
      <div className="safe-area-shell w-full felt-table-surface mahogany-frame px-4 sm:px-10 py-6 sm:py-8 flex flex-col items-center">
        <div className="w-full max-w-4xl flex flex-col gap-6 animate-settle my-auto">
          {winnerPlayer ? (
            <section className="ledger-paper rounded-2xl p-6 sm:p-9 text-center flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#0C3325] border-2 border-[#D4A243] flex items-center justify-center shadow-md">
                <Crown className="w-9 h-9 text-[#F4D891]" aria-hidden="true" />
              </div>

              <div className="text-xs font-bold text-[#7A602E]">
                {isSolo
                  ? 'ئەنجامی ڕاهێنانی تاکەکەسی — بنەماکانی ژمێرییاری'
                  : 'ئەنجامی کۆتایی پێشبڕکێی تاکەکەسی ژمێرییاری'}
              </div>

              <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#1B1712]">
                {isSolo
                  ? `ئافەرین ${winnerPlayer.name}!`
                  : `${winnerPlayer.name} براوەی پێشبڕکێیە!`}
              </h1>

              <div className="flex flex-wrap items-center justify-center gap-5 pt-2 text-[#1B1712]">
                <div className="px-5 py-2.5 rounded-xl bg-[#EFE6D2] border border-[#8B6B34]/25">
                  <div className="text-xs font-semibold text-[#6F582C]">کۆی خاڵ</div>
                  <div className="font-numeric text-3xl font-extrabold text-[#0E4A35]">
                    {winnerPlayer.score}
                  </div>
                </div>

                <div className="px-5 py-2.5 rounded-xl bg-[#EFE6D2] border border-[#8B6B34]/25">
                  <div className="text-xs font-semibold text-[#6F582C]">وەڵامی درووست</div>
                  <div className="font-numeric text-3xl font-extrabold text-[#1B1712]">
                    {winnerPlayer.correctCount}/{room.totalRounds}
                  </div>
                </div>

                <div className="px-5 py-2.5 rounded-xl bg-[#EFE6D2] border border-[#8B6B34]/25">
                  <div className="text-xs font-semibold text-[#6F582C]">ڕێژەی شارەزایی</div>
                  <div className="font-numeric text-3xl font-extrabold text-[#9A6E17]">
                    {masteryPct}%
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <section className="ledger-paper rounded-2xl p-6 sm:p-9 text-center flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-[#0C3325] border-2 border-[#D4A243] flex items-center justify-center shadow-md">
                <Crown className="w-9 h-9 text-[#F4D891]" aria-hidden="true" />
              </div>
              <h1 className="font-display text-3xl font-bold text-[#1B1712]">
                پێشبڕکێکە کۆتایی هات
              </h1>
              <p className="text-sm text-[#4B3F2E]">
                هیچ قوتابییەک بەشدار نەبوو لەم گەڕەدا.
              </p>
            </section>
          )}

          {!isSolo && (
            <section className="bg-[#0A271D]/92 border border-[#D4A243]/30 rounded-2xl p-5 flex flex-col gap-3">
              <h2 className="text-base font-bold text-[#FAF5EA]">ڕیزبەندی کۆتایی قوتابیان</h2>
              <div className="divide-y divide-[#D4A243]/15">
                {rankedPlayers.map((p, idx) => (
                  <div key={p.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-numeric text-sm font-bold text-[#F2D28B] w-6 text-center">
                        #{idx + 1}
                      </span>
                      <span className="w-8 h-8 rounded-full bg-[#123D2E] border border-[#D4A243]/35 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-[#F4D891]" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-base text-[#FAF5EA] truncate">
                          {p.name}
                          {p.id === playerId ? ' (تۆ)' : ''}
                        </div>
                        <div className="text-xs text-[#A9C2B3] font-numeric">
                          {p.correctCount}/{room.totalRounds} وەڵامی ڕاست
                        </div>
                      </div>
                    </div>

                    <div className="text-left shrink-0">
                      <span className="font-numeric text-xl font-extrabold text-[#F4D891]">
                        {p.score}
                      </span>
                      <span className="text-xs text-[#B8D0C2] mr-1">خاڵ</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            {isHost && (
              <button
                type="button"
                data-start="true"
                onClick={() => {
                  soundFx.click();
                  onRestart();
                }}
                className="min-h-[52px] px-8 py-3 rounded-xl bg-[#D4A243] hover:bg-[#E2B55A] text-[#17120A] font-extrabold text-base inline-flex items-center gap-2 cursor-pointer shadow-lg"
              >
                <RotateCcw className="w-5 h-5" aria-hidden="true" />
                {isSolo ? 'ڕاهێنانێکی نوێ' : 'یارییەکی نوێ'}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                soundFx.click();
                onReturnTitle();
              }}
              className="min-h-[52px] px-6 py-3 rounded-xl bg-[#113A2C] hover:bg-[#174D3B] border border-[#D4A243]/35 text-[#FAF5EA] font-bold text-base inline-flex items-center gap-2 cursor-pointer"
            >
              <Home className="w-5 h-5" aria-hidden="true" />
              شاشەی سەرەکی
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="safe-area-shell w-full felt-table-surface mahogany-frame px-4 sm:px-10 py-6 sm:py-8 flex flex-col items-center">
      <div className="w-full max-w-4xl flex flex-col gap-6 animate-settle my-auto">
        {/* Grand Champion Team Card */}
        {winnerTeam && (
          <section className="ledger-paper rounded-2xl p-6 sm:p-9 text-center flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#0C3325] border-2 border-[#D4A243] flex items-center justify-center shadow-md">
              <Crown className="w-9 h-9 text-[#F4D891]" aria-hidden="true" />
            </div>

            <div className="text-xs font-bold text-[#7A602E]">
              ئەنجامی کۆتایی پێشبڕکێی بنەماکانی ژمێرییاری
            </div>

            <div className="flex items-center justify-center gap-3">
              <TeamCrestIcon crest={winnerTeam.crest} color={winnerTeam.accent} size={38} />
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#1B1712]">
                {winnerTeam.name} براوەی پێشبڕکێیە!
              </h1>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 pt-2 text-[#1B1712]">
              <div className="px-5 py-2.5 rounded-xl bg-[#EFE6D2] border border-[#8B6B34]/25">
                <div className="text-xs font-semibold text-[#6F582C]">کۆی خاڵی تیمی براوە</div>
                <div className="font-numeric text-3xl font-extrabold text-[#0E4A35]">
                  {winnerTeam.score}
                </div>
              </div>

              <div className="px-5 py-2.5 rounded-xl bg-[#EFE6D2] border border-[#8B6B34]/25">
                <div className="text-xs font-semibold text-[#6F582C]">گەڕی سەرکەوتوو</div>
                <div className="font-numeric text-3xl font-extrabold text-[#1B1712]">
                  {winnerTeam.correctRounds}/{room.totalRounds}
                </div>
              </div>
            </div>

            {winnerMembers.length > 0 && (
              <p className="text-sm font-semibold text-[#4B3F2E] pt-1">
                ئەندامانی تیمی براوە: {winnerMembers.map((m) => m.name).join(' · ')}
              </p>
            )}
          </section>
        )}

        {/* Full Team Ledger Table + MVP */}
        <div className="grid grid-cols-1 md:grid-cols-[1.35fr_0.65fr] gap-5">
          <section className="bg-[#0A271D]/92 border border-[#D4A243]/30 rounded-2xl p-5 flex flex-col gap-3">
            <h2 className="text-base font-bold text-[#FAF5EA]">ڕیزبەندی کۆتایی هەموو تیمەکان</h2>
            <div className="divide-y divide-[#D4A243]/15">
              {rankedTeams.map((team, idx) => {
                const members = room.players.filter((p) => !p.isSupervisor && p.teamId === team.id);
                return (
                  <div
                    key={team.id}
                    className="py-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-numeric text-sm font-bold text-[#F2D28B] w-6 text-center">
                        #{idx + 1}
                      </span>
                      <TeamCrestIcon crest={team.crest} color={team.accent} size={28} />
                      <div className="min-w-0">
                        <div className="font-bold text-base text-[#FAF5EA] truncate">
                          {team.name}
                        </div>
                        <div className="text-xs text-[#A9C2B3] truncate">
                          {members.length > 0 ? members.map((m) => m.name).join('، ') : 'بێ ئەندام'}
                        </div>
                      </div>
                    </div>

                    <div className="text-left shrink-0">
                      <span className="font-numeric text-xl font-extrabold text-[#F4D891]">
                        {team.score}
                      </span>
                      <span className="text-xs text-[#B8D0C2] mr-1">خاڵ</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {mvp && (
            <section className="bg-[#0A271D]/92 border border-[#D4A243]/30 rounded-2xl p-5 flex flex-col justify-between gap-4">
              <div className="flex flex-col gap-2">
                <div className="inline-flex items-center gap-2 text-xs font-bold text-[#E4C57A]">
                  <Award className="w-4 h-4" aria-hidden="true" />
                  باشترین ژمێرییاری پێشبڕکێ
                </div>
                <div className="text-2xl font-extrabold text-[#FAF5EA]">{mvp.name}</div>
                <div className="text-xs text-[#B8D0C2]">
                  {room.teams.find((t) => t.id === mvp.teamId)?.name ?? ''}
                </div>
              </div>

              <div className="border-t border-[#D4A243]/20 pt-3 flex items-center justify-between">
                <div>
                  <div className="text-xs text-[#A9C2B3]">کۆی خاڵ</div>
                  <div className="font-numeric text-2xl font-extrabold text-[#F4D891]">
                    {mvp.score}
                  </div>
                </div>
                <div className="text-left">
                  <div className="text-xs text-[#A9C2B3]">وەڵامی ڕاست</div>
                  <div className="font-numeric text-2xl font-extrabold text-[#6EE7B7]">
                    {mvp.correctCount}/{room.totalRounds}
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          {isHost && (
            <button
              type="button"
              data-start="true"
              onClick={() => {
                soundFx.click();
                onRestart();
              }}
              className="min-h-[52px] px-8 py-3 rounded-xl bg-[#D4A243] hover:bg-[#E2B55A] text-[#17120A] font-extrabold text-base inline-flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <RotateCcw className="w-5 h-5" aria-hidden="true" />
              یارییەکی نوێ
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              soundFx.click();
              onReturnTitle();
            }}
            className="min-h-[52px] px-6 py-3 rounded-xl bg-[#113A2C] hover:bg-[#174D3B] border border-[#D4A243]/35 text-[#FAF5EA] font-bold text-base inline-flex items-center gap-2 cursor-pointer"
          >
            <Home className="w-5 h-5" aria-hidden="true" />
            شاشەی سەرەکی
          </button>
        </div>
      </div>
    </div>
  );
}
