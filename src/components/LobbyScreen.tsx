import { useState } from 'react';
import {
  BookOpen,
  Check,
  Copy,
  Edit3,
  LogOut,
  Maximize2,
  Play,
  QrCode,
  ShieldCheck,
  User,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { ALL_GAME_MODES } from '../game/engine';
import { DIFFICULTY_LABELS, GAME_MODE_LABELS } from '../game/questions';
import type { GameMode, PublicRoomState, RoomSettings, TeamId } from '../game/types';
import { TeamCrestIcon } from './BrassEmblem';

export function LobbyScreen({
  room,
  playerId,
  muted,
  serverError,
  onToggleMute,
  onSwitchTeam,
  onUpdateSettings,
  onOpenCustomBuilder,
  onStartMatch,
  onOpenGuide,
  onLeaveRoom,
}: {
  room: PublicRoomState;
  playerId: string;
  muted: boolean;
  serverError: string | null;
  onToggleMute: () => void;
  onSwitchTeam: (teamId: TeamId) => void;
  onUpdateSettings: (partial: Partial<RoomSettings>) => void;
  onOpenCustomBuilder: () => void;
  onStartMatch: () => void;
  onOpenGuide: () => void;
  onLeaveRoom: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  const me = room.players.find((p) => p.id === playerId);
  const isHost = room.hostId === playerId;
  const isSupervisor = Boolean(me?.isSupervisor);
  const isIndividual = room.settings.competitionMode === 'individual';
  const connectedPlayers = room.players.filter((p) => p.connected);
  const connectedStudents = connectedPlayers.filter((p) => !p.isSupervisor);
  const supervisor = connectedPlayers.find((p) => p.isSupervisor);
  const shareUrl = new URL(`/?room=${encodeURIComponent(room.code)}`, window.location.origin).toString();

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      const input = document.createElement('input');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const toggleMode = (mode: GameMode) => {
    if (!isHost) return;
    const exists = room.settings.enabledModes.includes(mode);
    if (exists && room.settings.enabledModes.length === 1) return;
    const next = exists
      ? room.settings.enabledModes.filter((m) => m !== mode)
      : [...room.settings.enabledModes, mode];
    onUpdateSettings({ enabledModes: next });
  };

  return (
    <div className="safe-area-shell w-full felt-table-surface mahogany-frame px-3 sm:px-8 lg:px-12 py-2.5 sm:py-4 flex flex-col gap-3 sm:gap-4">
      {/* Top Room Strip */}
      <div className="w-full max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2 border-b border-[#D4A243]/25 pb-2.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 min-w-0">
          <h1 className="font-display text-xl sm:text-3xl font-bold text-[#FAF5EA]">
            ژووری چاوەڕوانی پێشبڕکێ
          </h1>
          <span className="text-[11px] sm:text-sm text-[#CBE0D3] inline-flex items-center gap-1 tabular-nums">
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#E4C276]" aria-hidden="true" />
            {connectedStudents.length} قوتابی · {isIndividual ? 'تاکەکەسی' : `${room.teams.length} تیم`} ·{' '}
            {room.settings.questionSource === 'custom'
              ? `پرسیاری مامۆستا (${room.customQuestionCount})`
              : `خۆکار · ${DIFFICULTY_LABELS[room.settings.difficulty].shortTitle}`}
          </span>
          {supervisor && (
            <span className="text-[11px] sm:text-sm text-[#F4D891] inline-flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
              سەرپەرشتیار: {supervisor.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            data-mute-toggle="true"
            onClick={onToggleMute}
            aria-label={muted ? 'چالاککردنی دەنگ و میوزیک' : 'بێدەنگکردنی دەنگ و میوزیک'}
            title={muted ? 'چالاککردنی دەنگ و میوزیک' : 'بێدەنگکردنی دەنگ و میوزیک'}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#0B2A1F] hover:bg-[#143E2F] border border-[#D4A243]/30 text-[#F2D28B] flex items-center justify-center cursor-pointer"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onOpenGuide}
            className="min-h-[36px] sm:min-h-[40px] px-2.5 sm:px-3.5 py-1.5 rounded-lg bg-[#0B2A1F] hover:bg-[#143E2F] border border-[#D4A243]/30 text-[#F2D28B] text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
            ڕێبەری فێربوون
          </button>

          <button
            type="button"
            onClick={onLeaveRoom}
            className="min-h-[36px] sm:min-h-[40px] px-3 sm:px-4 py-1.5 rounded-lg bg-[#0B2A1F] hover:bg-[#143E2F] border border-[#D4A243]/30 text-[#E6EFE9] text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
            دەرچوون
          </button>
        </div>
      </div>

      {/* Shareable Student Link + Scannable QR Code Banner (Host / Teacher Only) */}
      {isHost && (
        <section
          data-testid="host-invite-banner"
          className="w-full max-w-6xl mx-auto ledger-paper rounded-2xl p-3.5 sm:p-5 grid grid-cols-1 lg:grid-cols-[1fr_auto_auto] gap-3 sm:gap-4 items-center"
        >
          <div className="flex flex-col gap-1.5 min-w-0">
            <div className="text-xs font-bold text-[#6F582C]">
              بەشداربوونی قوتابیان بە لینک یان سکانکردنی QR کۆد — ئەم لینکە بنێرە یان QR کۆدەکە پیشان بدە
            </div>
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2">
              <input
                type="text"
                readOnly
                aria-label="لینکی بەشداربوونی قوتابیان"
                value={shareUrl}
                onFocus={(e) => e.currentTarget.select()}
                className="font-numeric w-full sm:flex-1 min-w-0 min-h-[40px] px-3 rounded-xl bg-[#EFE6D2] border border-[#8B6B34]/30 text-[#1B1712] text-xs sm:text-sm font-semibold"
              />
              <div className="grid grid-cols-2 sm:flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopyLink}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-[#0D3829] hover:bg-[#144C38] text-[#FAF5EA] font-bold text-sm inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-[#6EE7B7]" aria-hidden="true" />
                    لینک کۆپیکرا
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-[#F2D28B]" aria-hidden="true" />
                    کۆپیکردنی لینک
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setQrModalOpen(true)}
                className="min-h-[40px] px-3 py-2 rounded-xl bg-[#EFE6D2] hover:bg-[#E5D7BA] border border-[#8B6B34]/35 text-[#1B1712] font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Maximize2 className="w-4 h-4 text-[#6F582C]" aria-hidden="true" />
                گەورەکردنی QR
              </button>
              </div>
            </div>
          </div>

          {/* Scannable QR Code Tile */}
          <button
            type="button"
            onClick={() => setQrModalOpen(true)}
            aria-label="گەورەکردنی QR کۆدی بەشداربوون"
            title="کلیک بکە بۆ گەورەکردنی QR کۆد لەسەر شاشەی پۆل"
            className="bg-white rounded-xl p-2 border-2 border-[#0B2E22]/25 hover:border-[#D4A243] shadow-sm flex items-center gap-2.5 cursor-pointer transition-colors shrink-0 mx-auto lg:mx-0"
          >
            <QRCodeSVG
              value={shareUrl}
              size={88}
              bgColor="#FFFFFF"
              fgColor="#000000"
              level="M"
              marginSize={2}
            />
            <div className="flex flex-col items-start pl-1 text-right">
              <span className="inline-flex items-center gap-1 text-xs font-extrabold text-[#0B2E22]">
                <QrCode className="w-3.5 h-3.5 text-[#9A6E17]" aria-hidden="true" />
                QR کۆد
              </span>
              <span className="text-[11px] font-semibold text-[#5C4B32] leading-snug max-w-[82px]">
                بە کامێرا سکانی بکە
              </span>
            </div>
          </button>

          {/* Room Code Box */}
          <div className="bg-[#0B2E22] text-[#FAF5EA] rounded-xl px-5 py-2.5 border border-[#D4A243]/40 flex flex-col items-center justify-center shrink-0">
            <span className="text-xs text-[#C8D9CE]">کۆدی ژوور</span>
            <span
              data-testid="room-code"
              className="font-numeric text-3xl font-extrabold tracking-[0.2em] text-[#F4D891]"
            >
              {room.code}
            </span>
          </div>
        </section>
      )}

      {/* Main Content: Live Team or Individual Student Roster + Match Settings */}
      <div
        className={`w-full max-w-6xl mx-auto grid gap-3 sm:gap-5 items-start flex-1 ${
          isHost ? 'grid-cols-1 lg:grid-cols-[1.35fr_0.95fr]' : 'grid-cols-1'
        }`}
      >
        {isIndividual ? (
          /* Individual Student Roster View */
          <section className="bg-[#0B2B20]/90 border border-[#D4A243]/25 rounded-2xl p-4 sm:p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-[#FAF5EA]">
                  قوتابیانی بەشداربوو (شێوازی تاکەکەسی)
                </h2>
                <p className="text-xs text-[#B8D0C2] mt-0.5">
                  هەر قوتابییەک بە تەنها وەڵام دەداتەوە و لە کۆتاییدا ڕیزبەندی باشترین قوتابیان دیاری دەکرێت.
                </p>
              </div>
              <span className="font-numeric text-lg font-extrabold text-[#F4D891]">
                {connectedStudents.length}
              </span>
            </div>

            {connectedStudents.length === 0 ? (
              <div className="rounded-xl bg-[#082018] border border-[#D4A243]/20 p-4 text-center text-xs sm:text-sm text-[#B8D0C2]">
                چاوەڕوانی هاتنەژوورەوەی قوتابیان...
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-1">
                {connectedStudents.map((member) => (
                  <div
                    key={member.id}
                    className={`rounded-xl px-3 py-2.5 border flex items-center gap-2 ${
                      member.id === playerId
                        ? 'bg-[#174E3B] border-[#F2D28B] text-[#FAF5EA]'
                        : 'bg-[#092118] border-[#D4A243]/20 text-[#EEF5F0]'
                    }`}
                  >
                    <User className="w-4 h-4 text-[#F2D28B] shrink-0" aria-hidden="true" />
                    <span className="font-bold text-xs sm:text-sm truncate">{member.name}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : (
          /* Teams Roster View (2-col compact on mobile so all 6 teams fit cleanly in one viewport!) */
          <section className="flex flex-col gap-2.5 sm:gap-3">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <h2 className="text-base sm:text-lg font-bold text-[#FAF5EA]">
                تیمەکانی پێشبڕکێ ({room.teams.length} تیم)
              </h2>
              <span className="text-[11px] sm:text-sm text-[#B8D0C2]">
                {isSupervisor
                  ? 'مامۆستا سەرپەرشتیارە — قوتابیان دابەشدەبن بەسەر تیمەکاندا'
                  : 'کلیک لە هەر تیمێک بکە بۆ گۆڕینی تیمەکەت'}
              </span>
            </div>

            <div
              className={`grid gap-2 sm:gap-3 ${
                room.teams.length >= 5
                  ? 'grid-cols-2 sm:grid-cols-3'
                  : 'grid-cols-2'
              }`}
            >
              {room.teams.map((team) => {
                const members = connectedStudents.filter((p) => p.teamId === team.id);
                const isMyTeam = !isSupervisor && me?.teamId === team.id;

                return (
                  <div
                    key={team.id}
                    data-testid={`team-card-${team.id}`}
                    className={`rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 border transition-all flex flex-col gap-2 ${
                      isMyTeam
                        ? 'bg-[#144434] border-[#F2D28B] shadow-lg'
                        : 'bg-[#0B2B20]/90 border-[#D4A243]/25'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <TeamCrestIcon crest={team.crest} color={team.accent} size={24} />
                        <div className="min-w-0 leading-tight">
                          <div className="font-extrabold text-xs sm:text-sm text-[#FAF5EA] truncate">
                            {team.name}
                          </div>
                          <div className="text-[10px] sm:text-xs text-[#B8CFC1] truncate mt-0.5">
                            {members.length} قوتابی
                          </div>
                        </div>
                      </div>

                      {!isSupervisor && isMyTeam && (
                        <span className="text-[10px] sm:text-xs font-extrabold text-[#17120A] bg-[#D4A243] px-2 py-0.5 rounded shrink-0">
                          تیمی تۆ
                        </span>
                      )}
                    </div>

                    <div className="min-h-[30px] sm:min-h-[42px] border-t border-[#D4A243]/15 pt-1.5 flex flex-wrap gap-1.5 items-start">
                      {members.length === 0 ? (
                        <span className="text-[10px] sm:text-xs text-[#8BA999]">چاوەڕوانی قوتابیان...</span>
                      ) : (
                        members.map((member) => (
                          <span
                            key={member.id}
                            className={`text-[11px] sm:text-xs font-semibold px-2 py-0.5 rounded-md truncate max-w-full ${
                              member.id === playerId
                                ? 'bg-[#D4A243] text-[#17120A]'
                                : 'bg-[#092118] text-[#EEF5F0] border border-[#D4A243]/20'
                            }`}
                          >
                            {member.name}
                          </span>
                        ))
                      )}
                    </div>

                    {!isSupervisor && !isMyTeam && (
                      <button
                        type="button"
                        onClick={() => onSwitchTeam(team.id)}
                        className="w-full min-h-[32px] px-2 py-1 rounded-lg bg-[#0A241A] hover:bg-[#19533F] border border-[#D4A243]/35 text-[11px] sm:text-xs font-bold text-[#F2D28B] cursor-pointer mt-auto"
                      >
                        چوونە ئەم تیمە
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Match Settings & Start Control (Full panel for Host; compact waiting card for Joined Students so 100% fits on mobile!) */}
        {!isHost ? (
          <aside className="bg-[#0A271D]/92 border border-[#D4A243]/30 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2.5 gap-y-1 text-xs text-[#CBE0D3]">
              <span className="font-bold text-[#F4D891]">
                {isIndividual ? 'شێوازی تاکەکەسی' : `${room.teams.length} تیم`}
              </span>
              <span aria-hidden="true" className="text-[#D4A243]/40">·</span>
              <span>{room.totalRounds} گەڕ</span>
              <span aria-hidden="true" className="text-[#D4A243]/40">·</span>
              <span>
                {room.settings.questionSource === 'custom'
                  ? 'پرسیارەکانی مامۆستا'
                  : `ئاستی ${DIFFICULTY_LABELS[room.settings.difficulty].shortTitle}`}
              </span>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-[#071D15] border border-[#D4A243]/30 text-center text-xs sm:text-sm font-bold text-[#F4D891] w-full sm:w-auto">
              چاوەڕوانی سەرپەرشتیار بە بۆ دەستپێکردنی یارییەکە...
            </div>
          </aside>
        ) : (
        <aside className="bg-[#0A271D]/92 border border-[#D4A243]/30 rounded-2xl p-4 sm:p-5 flex flex-col gap-3.5">
          {/* Read-only summary of Home-screen choices */}
          <div className="rounded-xl bg-[#082018] border border-[#D4A243]/25 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-bold text-[#F4D891]">
              {isIndividual ? 'شێوازی تاکەکەسی' : 'شێوازی تیم (گروپ)'}
            </span>
            <span className="text-[#CBE0D3]">
              {room.settings.questionSource === 'custom'
                ? `پرسیاری مامۆستا (${room.customQuestionCount})`
                : `پرسیاری خۆکار · ${DIFFICULTY_LABELS[room.settings.difficulty].shortTitle}`}
            </span>
          </div>

          {!isIndividual && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-[#E8D5A9]">ژمارەی تیمەکان</span>
              <div className="grid grid-cols-5 gap-1.5">
                {([2, 3, 4, 5, 6] as const).map((cnt) => {
                  const active = room.settings.teamCount === cnt;
                  return (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => onUpdateSettings({ teamCount: cnt })}
                      className={`min-h-[36px] rounded-lg font-bold text-xs border transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#D4A243] text-[#17120A] border-[#F6DF9F]'
                          : 'bg-[#081F17] text-[#D7E6DC] border-[#D4A243]/25 hover:border-[#D4A243]/60'
                      }`}
                    >
                      {cnt}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {room.settings.questionSource === 'custom' ? (
            <div className="rounded-xl bg-[#0D3225] border border-[#D4A243]/35 p-3.5 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#F4D891]">پرسیارە تایبەتەکانی مامۆستا</span>
                <span className="font-numeric text-xs font-extrabold text-[#FAF5EA] bg-[#082018] px-2.5 py-0.5 rounded-md border border-[#D4A243]/30">
                  {room.customQuestionCount} پرسیار
                </span>
              </div>
              <p className="text-xs text-[#C8DDD0] leading-relaxed">
                {room.customQuestionCount > 0
                  ? 'پرسیارە تایبەتەکانت ئامادەن و یارییەکە بە ڕیزبەندی دەستپێدەکات.'
                  : 'هێشتا پرسیار دانەنراوە — کلیک لە دوگمەی خوارەوە بکە بۆ نووسینی پرسیارەکان.'}
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-[#E8D5A9]">ژمارەی گەڕەکان</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {([6, 10, 15] as const).map((cnt) => {
                    const active = room.settings.roundCount === cnt;
                    return (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => onUpdateSettings({ roundCount: cnt })}
                        className={`min-h-[36px] rounded-lg font-bold text-xs border transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#D4A243] text-[#17120A] border-[#F6DF9F]'
                            : 'bg-[#081F17] text-[#D7E6DC] border-[#D4A243]/25 hover:border-[#D4A243]/60'
                        }`}
                      >
                        {cnt} گەڕ
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Enabled Game Modes */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-[#E8D5A9]">
                  جۆرەکانی چالاکی ({room.settings.enabledModes.length}/6)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {ALL_GAME_MODES.map((mode) => {
                    const active = room.settings.enabledModes.includes(mode);
                    return (
                      <button
                        key={mode}
                        type="button"
                        title={GAME_MODE_LABELS[mode].shortDesc}
                        onClick={() => toggleMode(mode)}
                        className={`min-h-[38px] px-2.5 py-1.5 rounded-lg border text-right flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#144333] border-[#D4A243]/65 text-[#FAF5EA]'
                            : 'bg-[#081E16] border-[#D4A243]/15 text-[#87A495]'
                        }`}
                      >
                        <span className="text-xs font-bold truncate">{GAME_MODE_LABELS[mode].title}</span>
                        <span
                          aria-hidden="true"
                          className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                            active
                              ? 'bg-[#D4A243] border-[#F6DF9F] text-[#17120A]'
                              : 'border-[#D4A243]/30'
                          }`}
                        >
                          {active && <Check className="w-3 h-3" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {serverError && (
            <p role="alert" className="text-xs font-semibold text-[#FCA5A5]">
              {serverError}
            </p>
          )}

          <button
            type="button"
            data-start="true"
            onClick={
              room.settings.questionSource === 'custom' && room.customQuestionCount === 0
                ? onOpenCustomBuilder
                : onStartMatch
            }
            className="w-full min-h-[48px] px-6 py-2.5 rounded-xl bg-[#D4A243] hover:bg-[#E2B55A] active:scale-[0.99] text-[#17120A] font-extrabold text-base sm:text-lg inline-flex items-center justify-center gap-2.5 shadow-lg cursor-pointer transition-all mt-1"
          >
            {room.settings.questionSource === 'custom' && room.customQuestionCount === 0 ? (
              <>
                <Edit3 className="w-5 h-5" aria-hidden="true" />
                سەرەتا پرسیارەکان دابنێ
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" aria-hidden="true" />
                دەستپێکردنی پێشبڕکێ
              </>
            )}
          </button>
        </aside>
        )}
      </div>

      {/* Enlarged Classroom Projector QR Code Modal (Host Only) */}
      {isHost && qrModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="QR کۆدی گەورە بۆ بەشداربوونی قوتابیان"
          className="fixed inset-0 z-50 bg-[#04140E]/85 flex items-start sm:items-center justify-center p-4 sm:p-5 overflow-y-auto"
          onClick={() => setQrModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-[#0B2D21] border-2 border-[#D4A243]/60 rounded-2xl p-6 flex flex-col items-center gap-4 text-center shadow-2xl animate-settle my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-base font-bold text-[#F4D891]">
                <QrCode className="w-5 h-5" aria-hidden="true" />
                بەشداربوون بە QR کۆد
              </span>
              <button
                type="button"
                aria-label="داخستنی QR کۆد"
                onClick={() => setQrModalOpen(false)}
                className="w-9 h-9 rounded-lg bg-[#082018] hover:bg-[#144333] border border-[#D4A243]/30 text-[#FAF5EA] flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-[#CBE0D3]">
              قوتابیان دەتوانن بە کامێرای مۆبایلەکانیان ئەم QR کۆدە سکان بکەن تا ڕاستەوخۆ بچنە ژووری پێشبڕکێ
            </p>

            <div className="bg-white p-4 rounded-2xl shadow-lg border-4 border-[#F4D891]">
              <QRCodeSVG
                value={shareUrl}
                size={252}
                bgColor="#FFFFFF"
                fgColor="#000000"
                level="M"
                marginSize={2}
              />
            </div>

            <div className="flex flex-col items-center gap-1">
              <span className="text-xs text-[#A9C2B3]">یان کۆدی ژوور بنووسە</span>
              <span className="font-numeric text-3xl font-extrabold tracking-[0.22em] text-[#F4D891]">
                {room.code}
              </span>
            </div>

            <button
              type="button"
              onClick={handleCopyLink}
              className="w-full min-h-[44px] px-5 py-2 rounded-xl bg-[#D4A243] hover:bg-[#E2B55A] text-[#17120A] font-extrabold text-sm inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'لینک کۆپیکرا' : 'کۆپیکردنی لینکی ژوور'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
