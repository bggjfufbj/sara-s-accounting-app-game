import { useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { soundFx } from '../../utils/sound';

export function RuleHintToggle({
  questionId,
  hint,
}: {
  questionId: string;
  hint: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [questionId]);

  return (
    <div className="pt-1 sm:pt-2">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          soundFx.click();
          setOpen((v) => !v);
        }}
        className="min-h-[30px] sm:min-h-[34px] px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-lg bg-[#EFE6D2] hover:bg-[#E5D7BA] border border-[#8B6B34]/30 text-[11px] sm:text-xs font-bold text-[#5E471F] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
      >
        <BookOpen className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{open ? 'شاردنەوەی یاسای خێرا' : 'یاسای خێرا (فێربوون)'}</span>
      </button>

      {open && (
        <div className="mt-2 p-2.5 sm:p-3.5 rounded-xl bg-[#F2E9D5] border border-[#8B6B34]/30 text-xs sm:text-sm font-medium text-[#2C2418] leading-relaxed animate-settle">
          <span className="font-extrabold text-[#0E4A35]">قاعدة ژمێریاری: </span>
          {hint}
        </div>
      )}
    </div>
  );
}
