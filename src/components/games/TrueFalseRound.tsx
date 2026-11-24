import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import type { AnswerPayload, TrueFalseQuestion } from '../../game/types';
import { soundFx } from '../../utils/sound';
import { RuleHintToggle } from './RuleHintToggle';

export function TrueFalseRound({
  question,
  locked,
  onSubmit,
}: {
  question: TrueFalseQuestion;
  locked: boolean;
  onSubmit: (payload: AnswerPayload) => void;
}) {
  const [selected, setSelected] = useState<boolean | null>(null);

  useEffect(() => {
    setSelected(null);
  }, [question.id]);

  const choose = (val: boolean) => {
    if (locked || selected !== null) return;
    soundFx.stamp();
    setSelected(val);
    onSubmit({ mode: 'true_false', value: val });
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (locked || selected !== null) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === '1') choose(true);
      if (e.key === '2') choose(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [locked, selected, question.id]);

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-3 sm:gap-5 animate-settle">
      <div className="ledger-paper ledger-ruled rounded-2xl p-4 sm:p-8 relative overflow-hidden">
        <div className="flex items-center justify-between gap-2 sm:gap-4 text-[11px] sm:text-xs font-semibold text-[#6F582C] mb-2.5 sm:mb-4">
          <span className="truncate">{question.topic} · پشکنینی المدقق</span>
          <span className="font-numeric shrink-0">{question.ledgerRef}</span>
        </div>

        <p className="text-lg sm:text-2xl font-bold text-[#1B1712] leading-snug sm:leading-relaxed max-w-3xl">
          «{question.claim}»
        </p>

        <RuleHintToggle questionId={question.id} hint={question.ruleHint} />

        {selected !== null && (
          <div
            aria-hidden="true"
            className={`animate-stamp absolute left-4 sm:left-6 bottom-3 sm:bottom-5 px-3 sm:px-4 py-1 sm:py-1.5 rounded-lg border-2 font-extrabold text-xs sm:text-base tracking-wide ${
              selected
                ? 'border-[#15734E] text-[#15734E] bg-[#15734E]/10'
                : 'border-[#B83232] text-[#B83232] bg-[#B83232]/10'
            }`}
          >
            {selected ? 'مۆری پەسەند (ڕاستە)' : 'مۆری ڕەتکردنەوە (هەڵەیە)'}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
        <button
          type="button"
          disabled={locked || selected !== null}
          onClick={() => choose(true)}
          className={`min-h-[76px] sm:min-h-[92px] p-3.5 sm:p-5 rounded-xl border transition-all duration-150 flex items-center justify-center gap-2 sm:gap-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F2D28B] ${
            selected === true
              ? 'bg-[#1D875E] text-[#FAF5EA] border-[#6EE7B7] shadow-lg'
              : selected === false
                ? 'bg-[#10392B]/55 text-[#B8CBBF]/45 border-[#D4A243]/15'
                : 'bg-[#134232] hover:bg-[#195440] text-[#FAF5EA] border-[#29A576]/50 hover:border-[#6EE7B7] cursor-pointer'
          }`}
        >
          <Check className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" aria-hidden="true" />
          <div className="text-right">
            <div className="text-base sm:text-xl font-extrabold">ڕاستە</div>
            <div className="text-[11px] sm:text-xs opacity-80">پەسەندە · [1]</div>
          </div>
        </button>

        <button
          type="button"
          disabled={locked || selected !== null}
          onClick={() => choose(false)}
          className={`min-h-[76px] sm:min-h-[92px] p-3.5 sm:p-5 rounded-xl border transition-all duration-150 flex items-center justify-center gap-2 sm:gap-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F2D28B] ${
            selected === false
              ? 'bg-[#B93838] text-[#FAF5EA] border-[#FCA5A5] shadow-lg'
              : selected === true
                ? 'bg-[#10392B]/55 text-[#B8CBBF]/45 border-[#D4A243]/15'
                : 'bg-[#134232] hover:bg-[#3A1E20] text-[#FAF5EA] border-[#D65555]/45 hover:border-[#FCA5A5] cursor-pointer'
          }`}
        >
          <X className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" aria-hidden="true" />
          <div className="text-right">
            <div className="text-base sm:text-xl font-extrabold">هەڵەیە</div>
            <div className="text-[11px] sm:text-xs opacity-80">ڕەتدەکرێتەوە · [2]</div>
          </div>
        </button>
      </div>
    </div>
  );
}
