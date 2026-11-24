import { useEffect, useState } from 'react';
import { User, Volume2, VolumeX } from 'lucide-react';
import { validatePlayerName } from '../game/engine';
import { DIFFICULTY_LABELS } from '../game/questions';
import type { CompetitionMode, DifficultyLevel, TeamId, TeamMeta } from '../game/types';
import { TeamCrestIcon, TitleLockupEmblem } from './BrassEmblem';

interface RoomPreview {
  exists: boolean;
  code: string;
  phase: string;
  competitionMode?: CompetitionMode;
  difficulty?: DifficultyLevel;
  playerCount: number;
  teams: Array<{
    id: TeamId;
    name: string;
    subtitle: string;
    crest: TeamMeta['crest'];
    accent: string;
    playerCount: number;
  }>;
  error?: string;
}

export function JoinScreen({
  roomCode,
  muted,
  onToggleMute,
  onJoin,
  onBackToTitle,
  serverError,
}: {
  roomCode: string;
  muted: boolean;
  onToggleMute: () => void;
  onJoin: (code: string, playerName: string, teamId?: TeamId) => void;
  onBackToTitle: () => void;
  serverError: string | null;
}) {
  const [preview, setPreview] = useState<RoomPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [playerName, setPlayerName] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<TeamId | undefined>(undefined);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/rooms/${encodeURIComponent(roomCode)}`)
      .then((r) => r.json())
      .then((data: RoomPreview) => {
        if (!active) return;
        setPreview(data);
        if (data.exists && data.teams.length > 0) {
          const sorted = [...data.teams].sort((a, b) => a.playerCount - b.playerCount);
          setSelectedTeam(sorted[0].id);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setPreview({
          exists: false,
          code: roomCode,
          phase: 'none',
          playerCount: 0,
          teams: [],
          error: 'پەیوەندی بە سێرڤەرەوە نەکرا.',
        });
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [roomCode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = validatePlayerName(playerName);
    if (!res.ok) {
      setFormError(res.error);
      return;
    }
    setFormError(null);
    onJoin(roomCode, res.value, selectedTeam);
  };

  const activeError = formError || serverError;
  const isIndividual = preview?.competitionMode === 'individual';
  const diffLabel = preview?.difficulty ? DIFFICULTY_LABELS[preview.difficulty].shortTitle : null;

  return (
    <div className="safe-area-shell w-full felt-table-surface mahogany-frame flex flex-col items-center px-3 sm:px-6 py-2.5 sm:py-6">
      <div className="w-full max-w-2xl my-auto flex flex-col gap-2.5 sm:gap-5 animate-settle">
        {/* Compact Mobile-First Header */}
        <div className="flex items-center justify-between gap-2.5">
          <div className="min-w-0 max-w-[155px] sm:max-w-[240px]">
            <TitleLockupEmblem compact />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="text-left leading-tight">
              <div className="text-[10px] sm:text-xs text-[#C8D9CE]">کۆدی ژوور</div>
              <div className="font-numeric text-xl sm:text-3xl font-extrabold tracking-widest text-[#F4D891]">
                {roomCode}
              </div>
            </div>
            <button
              type="button"
              data-mute-toggle="true"
              onClick={onToggleMute}
              aria-label={muted ? 'چالاککردنی دەنگ و میوزیک' : 'بێدەنگکردنی دەنگ و میوزیک'}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#0A271D] border border-[#D4A243]/35 text-[#F2D28B] flex items-center justify-center cursor-pointer"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="bg-[#0A281E]/90 border border-[#D4A243]/30 rounded-2xl p-6 text-center text-[#D7E6DC]">
            پشکنینی ژووری یاری...
          </div>
        ) : !preview?.exists ? (
          <div className="bg-[#0A281E]/90 border border-[#D65555]/45 rounded-2xl p-5 sm:p-7 flex flex-col gap-3.5">
            <h1 className="text-lg sm:text-xl font-bold text-[#FAF5EA]">ژوورەکە نەدۆزرایەوە</h1>
            <p className="text-sm text-[#D7E6DC]">
              {preview?.error ?? 'ئەم لینکە یان کۆدی ژوورە بەسەرچووە یان هێشتا درووست نەکراوە.'}
            </p>
            <div>
              <button
                type="button"
                onClick={onBackToTitle}
                className="w-full sm:w-auto min-h-[44px] px-6 py-2 rounded-xl bg-[#D4A243] hover:bg-[#E2B55A] text-[#17120A] font-bold cursor-pointer"
              >
                گەڕانەوە بۆ سەرەتا
              </button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-[#0A281E]/92 border border-[#D4A243]/35 rounded-2xl p-3.5 sm:p-6 flex flex-col gap-3 sm:gap-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-1">
              <h1 className="text-base sm:text-xl font-extrabold text-[#FAF5EA]">
                بەشداربوون لە یاری مبادئ المحاسبة
              </h1>
              <span className="text-[11px] sm:text-xs text-[#E4C57A] tabular-nums">
                {isIndividual ? 'تاکەکەسی' : `${preview.teams.length} تیم`}
                {diffLabel ? ` · ${diffLabel}` : ''} · {preview.playerCount} قوتابی
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="student-join-name" className="text-xs sm:text-sm font-semibold text-[#E8D5A9]">
                ناوی خۆت بنووسە
              </label>
              <input
                id="student-join-name"
                type="text"
                autoComplete="name"
                value={playerName}
                onChange={(e) => {
                  setPlayerName(e.target.value);
                  if (formError) setFormError(null);
                }}
                maxLength={24}
                placeholder="بۆ نموونە: ئارام، سارا، کوردۆ..."
                className="min-h-[42px] sm:min-h-[46px] px-3.5 rounded-xl bg-[#071D15] border border-[#D4A243]/40 text-[#FAF5EA] placeholder-[#7FA090] text-sm sm:text-base focus-visible:outline-2 focus-visible:outline-[#F2D28B]"
              />
            </div>

            {isIndividual ? (
              <div className="rounded-xl bg-[#0D3124] border border-[#D4A243]/30 p-3 flex items-center gap-2.5 text-xs sm:text-sm text-[#D7E6DC]">
                <User className="w-5 h-5 text-[#F2D28B] shrink-0" aria-hidden="true" />
                <span>
                  ئەم ژوورە بە شێوازی <strong>تاکەکەسی</strong> ڕێکخراوە — هەر قوتابییەک بە تەنها خاڵ کۆدەکاتەوە.
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs sm:text-sm font-semibold text-[#E8D5A9]">
                  تیمەکەت هەڵبژێرە
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {preview.teams.map((team) => {
                    const active = selectedTeam === team.id;
                    return (
                      <button
                        key={team.id}
                        type="button"
                        onClick={() => setSelectedTeam(team.id)}
                        className={`min-h-[48px] sm:min-h-[56px] px-2.5 py-2 sm:p-3 rounded-xl border text-right flex items-center gap-2 transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-[#F2D28B] ${
                          active
                            ? 'bg-[#174E3B] border-[#F2D28B] shadow-md'
                            : 'bg-[#0D3124] border-[#D4A243]/25 hover:border-[#D4A243]/60'
                        }`}
                      >
                        <TeamCrestIcon crest={team.crest} color={team.accent} size={22} />
                        <div className="flex-1 min-w-0 leading-tight">
                          <div className="font-bold text-xs sm:text-sm text-[#FAF5EA] truncate">
                            {team.name}
                          </div>
                          <div className="text-[10px] sm:text-xs text-[#B8CFC1] truncate mt-0.5">
                            {team.playerCount} قوتابی
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {activeError && (
              <p role="alert" className="text-xs sm:text-sm font-semibold text-[#FCA5A5]">
                {activeError}
              </p>
            )}

            <div className="grid grid-cols-[auto_1fr] sm:flex sm:items-center sm:justify-between gap-2 pt-0.5">
              <button
                type="button"
                onClick={onBackToTitle}
                className="min-h-[44px] px-4 sm:px-5 py-2 rounded-xl bg-[#113A2C] hover:bg-[#174B39] text-[#D7E6DC] border border-[#D4A243]/25 text-xs sm:text-sm font-semibold cursor-pointer whitespace-nowrap"
              >
                پاشگەزبوونەوە
              </button>
              <button
                type="submit"
                className="sm:min-w-[200px] min-h-[44px] sm:min-h-[48px] px-5 sm:px-8 py-2 rounded-xl bg-[#D4A243] hover:bg-[#E2B55A] text-[#17120A] font-extrabold text-sm sm:text-base transition-colors cursor-pointer shadow-lg"
              >
                چوونە نێو یاری
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
