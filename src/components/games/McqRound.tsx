import { useEffect, useState } from 'react';
import type { AnswerPayload, McqQuestion } from '../../game/types';
import { soundFx } from '../../utils/sound';
import { RuleHintToggle } from './RuleHintToggle';

const OPTION_LETTERS = ['أ', 'ب', 'ج', 'د'];

export function McqRound({
  question,
  locked,
  onSubmit,
}: {
  question: McqQuestion;
  locked: boolean;
  onSubmit: (payload: AnswerPayload) => void;
}) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    setSelectedIndex(null);
  }, [question.id]);

  const choose = (index: number) => {
    if (locked || selectedIndex !== null) return;
    soundFx.click();
    setSelectedIndex(index);
    onSubmit({ mode: 'mcq', choiceIndex: index });
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (locked || selectedIndex !== null) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key >= '1' && e.key <= '4') {
        choose(Number(e.key) - 1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [locked, selectedIndex, question.id]);

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-3 sm:gap-5 animate-settle">
      <div className="ledger-paper rounded-2xl p-4 sm:p-8">
        <div className="flex items-center justify-between gap-2 sm:gap-4 text-[11px] sm:text-xs font-semibold text-[#6F582C] mb-2 sm:mb-3">
          <span className="truncate">{question.topic}</span>
          <span className="shrink-0">هەڵبژاردنی خێرا</span>
        </div>
        <h2 className="text-base sm:text-2xl font-bold text-[#1B1712] leading-snug sm:leading-relaxed">
          {question.prompt}
        </h2>
        <RuleHintToggle questionId={question.id} hint={question.ruleHint} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3.5">
        {question.options.map((opt, idx) => {
          const isPicked = selectedIndex === idx;
          const isDimmed = selectedIndex !== null && !isPicked;
          return (
            <button
              key={idx}
              type="button"
              disabled={locked || selectedIndex !== null}
              onClick={() => choose(idx)}
              className={`group text-right min-h-[54px] sm:min-h-[76px] p-3 sm:p-5 rounded-xl border transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F2D28B] flex items-center gap-3 sm:gap-4 ${
                isPicked
                  ? 'bg-[#D4A243] text-[#17120A] border-[#F4DC9B] shadow-lg scale-[0.99]'
                  : isDimmed
                    ? 'bg-[#10392B]/60 text-[#B8CBBF]/55 border-[#D4A243]/15'
                    : 'bg-[#123E2F] hover:bg-[#174D3B] text-[#FAF5EA] border-[#D4A243]/30 hover:border-[#E5BE68] active:scale-[0.99] cursor-pointer'
              }`}
            >
              <span
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center font-bold text-sm sm:text-base shrink-0 border ${
                  isPicked
                    ? 'bg-[#17120A] text-[#F4DC9B] border-[#17120A]'
                    : 'bg-[#0A261C] text-[#E6C16E] border-[#D4A243]/35 group-hover:border-[#F4DC9B]'
                }`}
              >
                {OPTION_LETTERS[idx]}
              </span>
              <span className="text-sm sm:text-lg font-medium leading-snug flex-1">{opt}</span>
              <span
                aria-hidden="true"
                className={`hidden sm:inline font-numeric text-xs shrink-0 ${
                  isPicked ? 'text-[#17120A]/75' : 'text-[#C8D9CE]/50'
                }`}
              >
                {idx + 1}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
