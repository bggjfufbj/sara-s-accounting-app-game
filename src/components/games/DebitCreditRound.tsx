import { useEffect, useState } from 'react';
import type { AnswerPayload, DebitCreditQuestion } from '../../game/types';
import { soundFx } from '../../utils/sound';
import { BrassScaleCenterpiece } from '../BrassEmblem';
import { RuleHintToggle } from './RuleHintToggle';

export function DebitCreditRound({
  question,
  locked,
  onSubmit,
}: {
  question: DebitCreditQuestion;
  locked: boolean;
  onSubmit: (payload: AnswerPayload) => void;
}) {
  const [selectedSide, setSelectedSide] = useState<'debit' | 'credit' | null>(null);
  const [hoverSide, setHoverSide] = useState<'debit' | 'credit' | null>(null);

  useEffect(() => {
    setSelectedSide(null);
    setHoverSide(null);
  }, [question.id]);

  const choose = (side: 'debit' | 'credit') => {
    if (locked || selectedSide !== null) return;
    soundFx.stamp();
    setSelectedSide(side);
    onSubmit({ mode: 'debit_credit', side });
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (locked || selectedSide !== null) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === '1' || e.key === 'ArrowRight') choose('debit');
      if (e.key === '2' || e.key === 'ArrowLeft') choose('credit');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [locked, selectedSide, question.id]);

  const activeSide = selectedSide ?? hoverSide;
  const tiltDeg = activeSide === 'debit' ? 12 : activeSide === 'credit' ? -12 : 0;

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-3 sm:gap-5 animate-settle">
      <div className="ledger-paper rounded-2xl p-4 sm:p-7 grid grid-cols-1 md:grid-cols-[1fr_240px] gap-4 sm:gap-6 items-center">
        <div className="flex flex-col gap-2 sm:gap-3">
          <div className="flex items-center gap-2 text-[11px] sm:text-xs font-semibold text-[#6F582C]">
            <span>{question.topic}</span>
            <span aria-hidden="true">·</span>
            <span>تەرازووی المدين و الدائن</span>
          </div>
          <p className="text-sm sm:text-lg font-medium text-[#3A3124] leading-snug sm:leading-relaxed">
            {question.transaction}
          </p>
          <div className="pt-2 border-t border-[#8B6B34]/20">
            <div className="text-[11px] sm:text-xs font-semibold text-[#7A602E] mb-0.5 sm:mb-1">الحساب المطلوب</div>
            <div className="text-base sm:text-xl font-extrabold text-[#0E4A35]">
              {question.targetAccount}
            </div>
            <p className="text-xs sm:text-base text-[#2B241B] mt-1 font-semibold">
              {question.prompt}
            </p>
            <RuleHintToggle questionId={question.id} hint={question.ruleHint} />
          </div>
        </div>

        <div className="hidden md:flex bg-[#0B2E22] rounded-xl p-3 items-center justify-center border border-[#D4A243]/30">
          <BrassScaleCenterpiece
            tiltDeg={tiltDeg}
            rightLabel="مدين (Dr)"
            leftLabel="دائن (Cr)"
            compact
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
        <button
          type="button"
          disabled={locked || selectedSide !== null}
          onMouseEnter={() => setHoverSide('debit')}
          onMouseLeave={() => setHoverSide(null)}
          onClick={() => choose('debit')}
          className={`min-h-[76px] sm:min-h-[96px] p-3.5 sm:p-5 rounded-xl border transition-all duration-150 flex flex-col items-center justify-center gap-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F2D28B] ${
            selectedSide === 'debit'
              ? 'bg-[#D4A243] text-[#17120A] border-[#F6DF9F] shadow-lg'
              : selectedSide === 'credit'
                ? 'bg-[#10392B]/55 text-[#B8CBBF]/50 border-[#D4A243]/15'
                : 'bg-[#134232] hover:bg-[#195440] text-[#FAF5EA] border-[#D4A243]/40 hover:border-[#F2D28B] cursor-pointer'
          }`}
        >
          <span className="text-lg sm:text-2xl font-extrabold">مدين (من حـ/)</span>
          <span className={`font-numeric text-[11px] sm:text-xs font-semibold ${selectedSide === 'debit' ? 'text-[#17120A]/75' : 'text-[#E8C574]'}`}>
            DEBIT · [1]
          </span>
        </button>

        <button
          type="button"
          disabled={locked || selectedSide !== null}
          onMouseEnter={() => setHoverSide('credit')}
          onMouseLeave={() => setHoverSide(null)}
          onClick={() => choose('credit')}
          className={`min-h-[76px] sm:min-h-[96px] p-3.5 sm:p-5 rounded-xl border transition-all duration-150 flex flex-col items-center justify-center gap-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F2D28B] ${
            selectedSide === 'credit'
              ? 'bg-[#D4A243] text-[#17120A] border-[#F6DF9F] shadow-lg'
              : selectedSide === 'debit'
                ? 'bg-[#10392B]/55 text-[#B8CBBF]/50 border-[#D4A243]/15'
                : 'bg-[#134232] hover:bg-[#195440] text-[#FAF5EA] border-[#D4A243]/40 hover:border-[#F2D28B] cursor-pointer'
          }`}
        >
          <span className="text-lg sm:text-2xl font-extrabold">دائن (إلى حـ/)</span>
          <span className={`font-numeric text-[11px] sm:text-xs font-semibold ${selectedSide === 'credit' ? 'text-[#17120A]/75' : 'text-[#E8C574]'}`}>
            CREDIT · [2]
          </span>
        </button>
      </div>
    </div>
  );
}
