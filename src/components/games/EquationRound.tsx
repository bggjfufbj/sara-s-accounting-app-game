import { useEffect, useState } from 'react';
import type { AnswerPayload, EquationQuestion } from '../../game/types';
import { soundFx } from '../../utils/sound';
import { RuleHintToggle } from './RuleHintToggle';

function formatMoney(val: number, currency: string): string {
  return `${val.toLocaleString('en-US')}${currency}`;
}

export function EquationRound({
  question,
  locked,
  onSubmit,
}: {
  question: EquationQuestion;
  locked: boolean;
  onSubmit: (payload: AnswerPayload) => void;
}) {
  const [selectedValue, setSelectedValue] = useState<number | null>(null);

  useEffect(() => {
    setSelectedValue(null);
  }, [question.id]);

  const choose = (val: number) => {
    if (locked || selectedValue !== null) return;
    soundFx.stamp();
    setSelectedValue(val);
    onSubmit({ mode: 'equation', value: val });
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (locked || selectedValue !== null) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key >= '1' && e.key <= '4') {
        const val = question.choices[Number(e.key) - 1];
        if (val !== undefined) choose(val);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [locked, selectedValue, question.id]);

  const renderSlot = (label: string, value: number | null) => {
    const isUnknown = value === null;
    const displayVal = isUnknown
      ? selectedValue !== null
        ? formatMoney(selectedValue, question.currency)
        : '؟'
      : formatMoney(value, question.currency);

    return (
      <div
        className={`flex-1 min-w-0 rounded-xl p-2 sm:p-4 text-center border ${
          isUnknown
            ? selectedValue !== null
              ? 'bg-[#D4A243]/22 border-[#B58225] text-[#1C160B]'
              : 'bg-[#0C3325] border-[#D4A243] text-[#F4D891]'
            : 'bg-[#F2EAD8] border-[#8B6B34]/25 text-[#1B1712]'
        }`}
      >
        <div
          className={`text-[10px] sm:text-xs font-semibold mb-0.5 sm:mb-1 truncate ${
            isUnknown && selectedValue === null ? 'text-[#E5C67E]' : 'text-[#6F582C]'
          }`}
        >
          {label}
        </div>
        <div className="font-numeric text-sm sm:text-3xl font-bold tracking-tight whitespace-nowrap">
          {displayVal}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-3 sm:gap-5 animate-settle">
      <div className="ledger-paper rounded-2xl p-4 sm:p-7 flex flex-col gap-2.5 sm:gap-4">
        <div className="flex items-center justify-between gap-2 text-[11px] sm:text-xs font-semibold text-[#6F582C]">
          <span className="truncate">{question.topic}</span>
          <span className="shrink-0">{question.formulaTitle}</span>
        </div>

        <h2 className="text-base sm:text-xl font-bold text-[#1B1712]">{question.prompt}</h2>

        {/* Visual Accounting Equation Board */}
        <div className="flex flex-row items-center justify-center gap-1.5 sm:gap-3 pt-0.5">
          {renderSlot(question.leftSide[0].label, question.leftSide[0].value)}

          <div
            aria-hidden="true"
            className="text-lg sm:text-2xl font-extrabold text-[#8B6B34] text-center shrink-0"
          >
            =
          </div>

          {renderSlot(question.rightSide[0].label, question.rightSide[0].value)}

          <div
            aria-hidden="true"
            className="text-lg sm:text-2xl font-extrabold text-[#8B6B34] text-center shrink-0"
          >
            {question.operatorRight === '+' ? '+' : '−'}
          </div>

          {renderSlot(question.rightSide[1].label, question.rightSide[1].value)}
        </div>

        <RuleHintToggle questionId={question.id} hint={question.ruleHint} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
        {question.choices.map((val, idx) => {
          const isPicked = selectedValue === val;
          const isDimmed = selectedValue !== null && !isPicked;
          return (
            <button
              key={val}
              type="button"
              disabled={locked || selectedValue !== null}
              onClick={() => choose(val)}
              className={`min-h-[58px] sm:min-h-[76px] p-3 sm:p-4 rounded-xl border transition-all duration-150 flex flex-col items-center justify-center gap-0.5 sm:gap-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F2D28B] ${
                isPicked
                  ? 'bg-[#D4A243] text-[#17120A] border-[#F6DF9F] shadow-lg'
                  : isDimmed
                    ? 'bg-[#10392B]/55 text-[#B8CBBF]/45 border-[#D4A243]/15'
                    : 'bg-[#134232] hover:bg-[#195440] text-[#FAF5EA] border-[#D4A243]/35 hover:border-[#F2D28B] cursor-pointer'
              }`}
            >
              <span className="font-numeric text-base sm:text-2xl font-bold">
                {formatMoney(val, question.currency)}
              </span>
              <span
                className={`font-numeric text-[11px] sm:text-xs ${
                  isPicked ? 'text-[#17120A]/70' : 'text-[#C8D9CE]/60'
                }`}
              >
                [{idx + 1}]
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
