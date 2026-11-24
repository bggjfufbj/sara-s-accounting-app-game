import { useEffect, useState } from 'react';
import { LEDGER_BUCKET_LABELS } from '../../game/questions';
import type { AnswerPayload, ClassifyQuestion, LedgerBucket } from '../../game/types';
import { soundFx } from '../../utils/sound';
import { RuleHintToggle } from './RuleHintToggle';

const BUCKET_ORDER: LedgerBucket[] = [
  'assets',
  'liabilities_equity',
  'revenue',
  'expenses',
];

export function ClassifyRound({
  question,
  locked,
  onSubmit,
}: {
  question: ClassifyQuestion;
  locked: boolean;
  onSubmit: (payload: AnswerPayload) => void;
}) {
  const [assignments, setAssignments] = useState<Record<string, LedgerBucket>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setAssignments({});
    setSubmitted(false);
  }, [question.id]);

  const assignedCount = Object.keys(assignments).length;
  const allAssigned = assignedCount === question.items.length;

  const assignBucket = (itemId: string, bucket: LedgerBucket) => {
    if (locked || submitted) return;
    soundFx.click();
    setAssignments((prev) => ({ ...prev, [itemId]: bucket }));
  };

  const handleConfirm = () => {
    if (locked || submitted || assignedCount === 0) return;
    soundFx.stamp();
    setSubmitted(true);
    onSubmit({ mode: 'classify', assignments });
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-2.5 sm:gap-4 animate-settle">
      <div className="ledger-paper rounded-2xl p-3.5 sm:p-6">
        <div className="flex items-center justify-between gap-2 text-[11px] sm:text-xs font-semibold text-[#6F582C] mb-1 sm:mb-2">
          <span className="truncate">{question.topic}</span>
          <span className="tabular-nums shrink-0">
            {assignedCount} / {question.items.length} پۆلێنکراوە
          </span>
        </div>
        <h2 className="text-sm sm:text-xl font-bold text-[#1B1712]">{question.prompt}</h2>
        <RuleHintToggle questionId={question.id} hint={question.ruleHint} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3.5">
        {question.items.map((item, idx) => {
          const picked = assignments[item.id];
          return (
            <div
              key={item.id}
              className="bg-[#113A2C] border border-[#D4A243]/30 rounded-xl p-2.5 sm:p-4 flex flex-col gap-1.5 sm:gap-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm sm:text-lg font-bold text-[#FAF5EA] truncate">
                  {idx + 1}. {item.label}
                </span>
                <span className="text-[11px] sm:text-xs text-[#E4C276] whitespace-nowrap shrink-0">
                  {picked ? LEDGER_BUCKET_LABELS[picked].title : 'هەڵبژێرە'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                {BUCKET_ORDER.map((bucket) => {
                  const isActive = picked === bucket;
                  return (
                    <button
                      key={bucket}
                      type="button"
                      disabled={locked || submitted}
                      onClick={() => assignBucket(item.id, bucket)}
                      aria-label={`${item.label} — ${LEDGER_BUCKET_LABELS[bucket].title}`}
                      className={`min-h-[34px] sm:min-h-[44px] px-2 sm:px-3 py-1 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold border transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F2D28B] ${
                        isActive
                          ? 'bg-[#D4A243] text-[#17120A] border-[#F6DF9F]'
                          : 'bg-[#0B291F] text-[#E6EFE9] border-[#D4A243]/22 hover:border-[#D4A243]/65 hover:bg-[#144434] cursor-pointer'
                      }`}
                    >
                      {LEDGER_BUCKET_LABELS[bucket].title}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 pt-0.5">
        <p className="hidden sm:block text-xs sm:text-sm text-[#CBE0D3]">
          هەر پۆلێنکردنێکی درووست خاڵی تایبەتی هەیە — هەر چواریان ڕاست بێت خاڵی تەواو وەردەگریت.
        </p>
        <button
          type="button"
          disabled={locked || submitted || assignedCount === 0}
          onClick={handleConfirm}
          className={`w-full sm:w-auto min-h-[44px] sm:min-h-[48px] px-7 py-2 sm:py-2.5 rounded-xl font-bold text-sm sm:text-base transition-all duration-150 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F2D28B] ${
            allAssigned && !submitted && !locked
              ? 'bg-[#D4A243] hover:bg-[#E2B456] text-[#17120A] cursor-pointer shadow-md'
              : assignedCount > 0 && !submitted && !locked
                ? 'bg-[#1D5A44] hover:bg-[#246C52] text-[#FAF5EA] border border-[#D4A243]/40 cursor-pointer'
                : 'bg-[#12372A] text-[#7D9B8D] border border-[#D4A243]/15 cursor-not-allowed'
          }`}
        >
          {submitted || locked ? 'تۆمارکرا' : 'ناردنی پۆلێنکردن'}
        </button>
      </div>
    </div>
  );
}
