import { useEffect, useState } from 'react';
import { ArrowLeftRight, Check } from 'lucide-react';
import type { AnswerPayload, JournalEntryQuestion } from '../../game/types';
import { soundFx } from '../../utils/sound';
import { RuleHintToggle } from './RuleHintToggle';

export function JournalEntryRound({
  question,
  locked,
  onSubmit,
}: {
  question: JournalEntryQuestion;
  locked: boolean;
  onSubmit: (payload: AnswerPayload) => void;
}) {
  const [activeSlot, setActiveSlot] = useState<'debit' | 'credit'>('debit');
  const [debitAccount, setDebitAccount] = useState<string>('');
  const [creditAccount, setCreditAccount] = useState<string>('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setActiveSlot('debit');
    setDebitAccount('');
    setCreditAccount('');
    setSubmitted(false);
  }, [question.id]);

  const formattedAmount = question.amount.toLocaleString('en-US');

  const pickAccount = (acc: string) => {
    if (locked || submitted) return;
    soundFx.click();
    if (activeSlot === 'debit') {
      setDebitAccount(acc);
      if (creditAccount === acc) setCreditAccount('');
      setActiveSlot('credit');
    } else {
      setCreditAccount(acc);
      if (debitAccount === acc) setDebitAccount('');
    }
  };

  const swapSides = () => {
    if (locked || submitted || (!debitAccount && !creditAccount)) return;
    soundFx.click();
    const prevDebit = debitAccount;
    setDebitAccount(creditAccount);
    setCreditAccount(prevDebit);
  };

  const canSubmit = Boolean(debitAccount && creditAccount && debitAccount !== creditAccount && !locked && !submitted);

  const handleRecord = () => {
    if (!canSubmit) return;
    soundFx.stamp();
    setSubmitted(true);
    onSubmit({
      mode: 'journal_entry',
      debitAccount,
      creditAccount,
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-2.5 sm:gap-4 animate-settle">
      {/* Transaction & Interactive Journal Voucher (سجل اليومية) */}
      <div className="ledger-paper rounded-2xl p-3.5 sm:p-6 flex flex-col gap-2.5 sm:gap-4">
        <div className="flex flex-wrap items-center justify-between gap-1.5 text-[11px] sm:text-xs font-semibold text-[#6F582C]">
          <span className="truncate">{question.topic} · سجل اليومية</span>
          <span className="font-numeric font-bold text-[#0E4A35] shrink-0">
            {formattedAmount} {question.currency}
          </span>
        </div>

        <h2 className="text-base sm:text-xl font-bold text-[#1B1712] leading-snug sm:leading-relaxed">
          {question.transaction}
        </h2>

        {/* Live Ruled Double-Entry Voucher */}
        <div className="rounded-xl bg-[#F3ECDC] border border-[#8B6B34]/35 p-2.5 sm:p-4 flex flex-col gap-1.5 sm:gap-3">
          <div className="grid grid-cols-[64px_64px_1fr] sm:grid-cols-[92px_92px_1fr] gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-bold text-[#6F582C] border-b border-[#8B6B34]/25 pb-1 sm:pb-2">
            <span className="text-center">مدين</span>
            <span className="text-center">دائن</span>
            <span>البيان (القيد اليومي)</span>
          </div>

          {/* Debit Row (من حـ/) */}
          <button
            type="button"
            disabled={locked || submitted}
            onClick={() => setActiveSlot('debit')}
            className={`grid grid-cols-[64px_64px_1fr] sm:grid-cols-[92px_92px_1fr] gap-1.5 sm:gap-2 items-center min-h-[38px] sm:min-h-[48px] px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-lg border text-right transition-colors cursor-pointer ${
              activeSlot === 'debit' && !submitted
                ? 'bg-[#FFFDF8] border-[#B6811E] ring-2 ring-[#D4A243]/40'
                : 'bg-[#FAF5EA] border-[#8B6B34]/20 hover:border-[#8B6B34]/50'
            }`}
          >
            <span className="font-numeric text-[10px] sm:text-sm font-bold text-[#0E4A35] text-center whitespace-nowrap">
              {formattedAmount}
            </span>
            <span className="font-numeric text-xs text-[#9C8B6E] text-center">—</span>
            <div className="flex items-center gap-1 sm:gap-2 min-w-0">
              <span className="text-xs sm:text-sm font-extrabold text-[#0E4A35] shrink-0">من</span>
              <span
                className={`text-xs sm:text-base font-bold leading-tight truncate ${
                  debitAccount ? 'text-[#1B1712]' : 'text-[#8E7B5B]'
                }`}
              >
                {debitAccount || 'هەژماری المدين هەڵبژێرە...'}
              </span>
            </div>
          </button>

          {/* Credit Row (إلى حـ/) */}
          <button
            type="button"
            disabled={locked || submitted}
            onClick={() => setActiveSlot('credit')}
            className={`grid grid-cols-[64px_64px_1fr] sm:grid-cols-[92px_92px_1fr] gap-1.5 sm:gap-2 items-center min-h-[38px] sm:min-h-[48px] px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-lg border text-right transition-colors cursor-pointer ${
              activeSlot === 'credit' && !submitted
                ? 'bg-[#FFFDF8] border-[#B6811E] ring-2 ring-[#D4A243]/40'
                : 'bg-[#FAF5EA] border-[#8B6B34]/20 hover:border-[#8B6B34]/50'
            }`}
          >
            <span className="font-numeric text-xs text-[#9C8B6E] text-center">—</span>
            <span className="font-numeric text-[10px] sm:text-sm font-bold text-[#9E2B2B] text-center whitespace-nowrap">
              {formattedAmount}
            </span>
            <div className="flex items-center gap-1 sm:gap-2 pr-1 sm:pr-4 min-w-0">
              <span className="text-xs sm:text-sm font-extrabold text-[#9E2B2B] shrink-0">إلى</span>
              <span
                className={`text-xs sm:text-base font-bold leading-tight truncate ${
                  creditAccount ? 'text-[#1B1712]' : 'text-[#8E7B5B]'
                }`}
              >
                {creditAccount || 'هەژماری الدائن هەڵبژێرە...'}
              </span>
            </div>
          </button>
        </div>

        <RuleHintToggle questionId={question.id} hint={question.ruleHint} />
      </div>

      {/* Account Ledger Cards Picker */}
      <div className="flex flex-col gap-2 sm:gap-3">
        <div className="flex items-center justify-between gap-2 text-[11px] sm:text-sm text-[#D7E6DC]">
          <span className="truncate">
            ئێستا هەڵبژێرە بۆ:{' '}
            <strong className="text-[#F4D891]">
              {activeSlot === 'debit' ? 'الطرف المدين (من حـ/)' : 'الطرف الدائن (إلى حـ/)'}
            </strong>
          </span>
          <button
            type="button"
            disabled={locked || submitted || (!debitAccount && !creditAccount)}
            onClick={swapSides}
            className="min-h-[30px] sm:min-h-[36px] px-2.5 sm:px-3 py-1 rounded-lg bg-[#0D3225] hover:bg-[#154534] border border-[#D4A243]/30 text-[11px] sm:text-xs font-bold text-[#F2D28B] inline-flex items-center gap-1 shrink-0 cursor-pointer disabled:opacity-45"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" aria-hidden="true" />
            گۆڕینەوە
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {question.accounts.map((acc) => {
            const isDebit = debitAccount === acc;
            const isCredit = creditAccount === acc;
            return (
              <button
                key={acc}
                type="button"
                disabled={locked || submitted}
                onClick={() => pickAccount(acc)}
                className={`min-h-[48px] sm:min-h-[64px] px-2.5 sm:px-3.5 py-2 sm:py-3 rounded-xl border font-bold text-xs sm:text-base transition-all flex flex-col items-center justify-center gap-0.5 sm:gap-1 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#F2D28B] ${
                  isDebit
                    ? 'bg-[#1D7F59] text-[#FAF5EA] border-[#6EE7B7] shadow-md'
                    : isCredit
                      ? 'bg-[#9E3535] text-[#FAF5EA] border-[#FCA5A5] shadow-md'
                      : 'bg-[#123E2F] hover:bg-[#184E3C] text-[#FAF5EA] border-[#D4A243]/35 hover:border-[#F2D28B]'
                }`}
              >
                <span>{acc}</span>
                {isDebit && <span className="text-[10px] sm:text-[11px] opacity-90">من حـ/ (مدين)</span>}
                {isCredit && <span className="text-[10px] sm:text-[11px] opacity-90">إلى حـ/ (دائن)</span>}
              </button>
            );
          })}
        </div>

        <div className="flex justify-end pt-0.5 sm:pt-1">
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleRecord}
            className={`w-full sm:w-auto min-h-[44px] sm:min-h-[48px] px-6 sm:px-7 py-2 sm:py-2.5 rounded-xl font-extrabold text-sm sm:text-base inline-flex items-center justify-center gap-2 transition-all ${
              canSubmit
                ? 'bg-[#D4A243] hover:bg-[#E2B55A] text-[#17120A] cursor-pointer shadow-lg'
                : 'bg-[#12372A] text-[#7D9B8D] border border-[#D4A243]/15 cursor-not-allowed'
            }`}
          >
            <Check className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
            {submitted || locked ? 'القيد تۆمارکرا' : 'تۆمارکردنی القيد اليومي'}
          </button>
        </div>
      </div>
    </div>
  );
}
