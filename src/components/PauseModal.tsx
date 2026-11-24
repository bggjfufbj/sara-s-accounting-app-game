import { Home, Play, RotateCcw } from 'lucide-react';
import { soundFx } from '../utils/sound';

export function PauseModal({
  isHost,
  onResume,
  onRestart,
  onExit,
}: {
  isHost: boolean;
  onResume: () => void;
  onRestart: () => void;
  onExit: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-modal-title"
      className="fixed inset-0 z-40 bg-[#05140E]/82 flex items-center justify-center p-5"
    >
      <div className="w-full max-w-md bg-[#0B2C21] border border-[#D4A243]/45 rounded-2xl p-6 sm:p-7 flex flex-col gap-5 shadow-2xl animate-settle">
        <div className="text-center">
          <h2 id="pause-modal-title" className="font-display text-2xl sm:text-3xl font-bold text-[#FAF5EA]">
            یاری وەستێنرا
          </h2>
          <p className="text-sm text-[#B8D0C2] mt-1">
            کلیلی Esc یان P دابگرە بۆ بەردەوامبوون.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => {
              soundFx.click();
              onResume();
            }}
            className="w-full min-h-[48px] px-5 py-2.5 rounded-xl bg-[#D4A243] hover:bg-[#E2B55A] text-[#17120A] font-extrabold text-base inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" aria-hidden="true" />
            بەردەوامبوون
          </button>

          {isHost && (
            <button
              type="button"
              onClick={() => {
                soundFx.click();
                onRestart();
              }}
              className="w-full min-h-[48px] px-5 py-2.5 rounded-xl bg-[#134232] hover:bg-[#195440] border border-[#D4A243]/30 text-[#FAF5EA] font-bold text-base inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              دەستپێکردنەوەی پێشبڕکێ
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              soundFx.click();
              onExit();
            }}
            className="w-full min-h-[48px] px-5 py-2.5 rounded-xl bg-[#082017] hover:bg-[#103326] border border-[#D4A243]/20 text-[#D7E6DC] font-semibold text-base inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4" aria-hidden="true" />
            گەڕانەوە بۆ سەرەتا
          </button>
        </div>
      </div>
    </div>
  );
}
