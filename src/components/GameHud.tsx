import { Pause, ShieldCheck, User, Volume2, VolumeX } from 'lucide-react';
import { getRankedPlayers } from '../game/engine';
import { GAME_MODE_LABELS } from '../game/questions';
import type { PublicRoomState } from '../game/types';
import { TeamCrestIcon } from './BrassEmblem';

export function GameHud({
  room,
  playerId,
  secondsLeft,
  totalSeconds,
  muted,
  onToggleMute,
  onOpenPause,
}: {
  room: PublicRoomState;
  playerId: string;
  secondsLeft: number;
  totalSeconds: number;
  muted: boolean;
  onToggleMute: () => void;
  onOpenPause: () => void;
}) {
  const me = room.players.find((p) => p.id === playerId);
  const isSupervisor = Boolean(me?.isSupervisor);
  const isIndividual = room.settings.competitionMode === 'individual';
  const connectedStudentsCount = room.players.filter((p) => p.connected && !p.isSupervisor).length;
  const answeredCount = room.answeredPlayerIds.length;
  const progressPct = totalSeconds > 0 ? Math.max(0, Math.min(100, (secondsLeft / totalSeconds) * 100)) : 0;
  const isUrgent = room.phase === 'playing' && secondsLeft <= 5;
  const modeTitle = room.currentQuestion ? GAME_MODE_LABELS[room.currentQuestion.mode].title : '';
  const topPlayers = isIndividual ? getRankedPlayers(room.players).slice(0, 4) : [];

  return (
    <header className="w-full max-w-5xl mx-auto flex flex-col gap-1.5 sm:gap-3">
      {/* Compact Perimeter Bar */}
      <div className="bg-[#09241B]/95 border border-[#D4A243]/30 rounded-xl sm:rounded-2xl px-2.5 py-1.5 sm:px-4 sm:py-3 flex flex-nowrap items-center justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <div className="flex items-baseline gap-1 shrink-0">
            <span className="text-[11px] sm:text-xs font-semibold text-[#B8D0C2]">گەڕی</span>
            <span className="font-numeric text-base sm:text-xl font-extrabold text-[#F4D891]">
              {room.currentRoundIndex + 1}/{room.totalRounds}
            </span>
          </div>
          <span aria-hidden="true" className="text-[#D4A243]/40 shrink-0">·</span>
          <span className="text-xs sm:text-sm font-bold text-[#FAF5EA] truncate">{modeTitle}</span>
          {isSupervisor && (
            <>
              <span aria-hidden="true" className="hidden sm:inline text-[#D4A243]/40">·</span>
              <span className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-[#F4D891]">
                <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                سەرپەرشتیار
              </span>
            </>
          )}
          <span aria-hidden="true" className="hidden sm:inline text-[#D4A243]/40">·</span>
          <span className="hidden sm:inline text-xs text-[#B8D0C2] tabular-nums">
            وەڵامدراوە: {answeredCount}/{connectedStudentsCount}
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {room.phase === 'playing' && (
            <div
              className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg border font-numeric text-sm sm:text-lg font-extrabold min-w-[46px] sm:min-w-[68px] text-center ${
                isUrgent
                  ? 'bg-[#4A1A1A] border-[#EF4444] text-[#FCA5A5]'
                  : 'bg-[#0F3527] border-[#D4A243]/40 text-[#FAF5EA]'
              }`}
            >
              {Math.ceil(secondsLeft)}s
            </div>
          )}

          <button
            type="button"
            data-mute-toggle="true"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            aria-label={muted ? 'چالاککردنی دەنگ و میوزیک' : 'بێدەنگکردنی دەنگ و میوزیک'}
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-[#0D3124] border border-[#D4A243]/30 text-[#F2D28B] hover:border-[#F2D28B] flex items-center justify-center cursor-pointer"
          >
            {muted ? <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenPause();
            }}
            aria-label="وەستاندنی یاری"
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-[#0D3124] border border-[#D4A243]/30 text-[#F2D28B] hover:border-[#F2D28B] flex items-center justify-center cursor-pointer"
          >
            <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>

      {/* Slim Timer Bar */}
      {room.phase === 'playing' && (
        <div className="w-full h-1 sm:h-1.5 rounded-full bg-[#071D15] overflow-hidden">
          <div
            className={`h-full transition-transform duration-150 origin-right ${
              isUrgent ? 'bg-[#EF4444]' : 'bg-[#D4A243]'
            }`}
            style={{ transform: `scaleX(${progressPct / 100})` }}
          />
        </div>
      )}

      {/* Live Score Strip: Individual Students OR Teams */}
      {isIndividual ? (
        topPlayers.length > 0 && (
          <div
            className={`grid gap-1.5 sm:gap-2.5 ${
              topPlayers.length === 1
                ? 'grid-cols-1'
                : topPlayers.length === 2
                  ? 'grid-cols-2'
                  : 'grid-cols-2 sm:grid-cols-4'
            }`}
          >
            {topPlayers.map((player, idx) => {
              const isMe = player.id === playerId;
              return (
                <div
                  key={player.id}
                  className={`rounded-lg sm:rounded-xl px-2 sm:px-3 py-1.5 sm:py-2 border flex items-center justify-between gap-2 min-w-0 ${
                    isMe
                      ? 'bg-[#144434] border-[#F2D28B]'
                      : 'bg-[#09251B]/85 border-[#D4A243]/20'
                  }`}
                >
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                    <span className="font-numeric text-xs font-bold text-[#E4C57A]">#{idx + 1}</span>
                    <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#F2D28B] shrink-0" aria-hidden="true" />
                    <span className="text-xs sm:text-sm font-bold text-[#FAF5EA] truncate">
                      {player.name}
                    </span>
                  </div>
                  <span className="font-numeric text-sm sm:text-lg font-extrabold text-[#F4D891] shrink-0">
                    {player.score}
                  </span>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div
          className={`grid gap-1 sm:gap-2 ${
            room.teams.length === 2
              ? 'grid-cols-2'
              : room.teams.length === 3
                ? 'grid-cols-3'
                : room.teams.length === 4
                  ? 'grid-cols-2 sm:grid-cols-4'
                  : 'grid-cols-3 sm:grid-cols-6'
          }`}
        >
          {room.teams.map((team) => {
            const isMine = !isSupervisor && me?.teamId === team.id;
            return (
              <div
                key={team.id}
                className={`rounded-lg sm:rounded-xl px-1.5 sm:px-2.5 py-1 sm:py-2 border flex items-center justify-between gap-1 min-w-0 ${
                  isMine
                    ? 'bg-[#144434] border-[#F2D28B]'
                    : 'bg-[#09251B]/85 border-[#D4A243]/20'
                }`}
              >
                <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                  <TeamCrestIcon crest={team.crest} color={team.accent} size={16} />
                  <span className="text-[10px] sm:text-xs font-bold text-[#FAF5EA] truncate">
                    {team.name}
                  </span>
                </div>
                <span className="font-numeric text-xs sm:text-base font-extrabold text-[#F4D891] shrink-0">
                  {team.score}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </header>
  );
}
