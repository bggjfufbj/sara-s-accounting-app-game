import { useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Check,
  Cloud,
  Edit3,
  LogIn,
  LogOut,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  ACCOUNTING_QUESTIONS,
  DIFFICULTY_LABELS,
  GAME_MODE_LABELS,
  LEDGER_BUCKET_LABELS,
} from '../game/questions';
import type { GameMode, GameQuestion, LedgerBucket, QuestionDifficulty } from '../game/types';

type EditTarget = 'new_custom' | 'edit_custom' | 'edit_curriculum';

const ALL_EDIT_MODES: Array<{ id: GameMode; label: string }> = [
  { id: 'mcq', label: 'هەڵبژاردن' },
  { id: 'journal_entry', label: 'القيد اليومي' },
  { id: 'debit_credit', label: 'مدين / دائن' },
  { id: 'true_false', label: 'ڕاست / هەڵە' },
  { id: 'classify', label: 'پۆلێنکردن' },
  { id: 'equation', label: 'المعادلة' },
];

const BUCKET_OPTIONS: LedgerBucket[] = ['assets', 'liabilities_equity', 'revenue', 'expenses'];

function summarizeQuestion(q: GameQuestion): string {
  switch (q.mode) {
    case 'mcq':
      return q.prompt;
    case 'journal_entry':
      return q.transaction;
    case 'debit_credit':
      return `${q.targetAccount} — ${q.transaction}`;
    case 'true_false':
      return q.claim;
    case 'classify':
      return q.prompt;
    case 'equation':
      return q.prompt;
  }
}

export function CustomQuestionBuilderModal({
  initialTab = 'write',
  questions,
  curriculumOverrides,
  cloudUser,
  cloudSyncState,
  cloudNotice,
  onCloudSignIn,
  onCloudSignOut,
  onChange,
  onSaveCurriculumOverride,
  onResetCurriculumOverride,
  onClose,
}: {
  initialTab?: 'write' | 'bank';
  questions: GameQuestion[];
  curriculumOverrides: Record<string, GameQuestion>;
  cloudUser: { displayName: string | null; email: string | null } | null;
  cloudSyncState: 'idle' | 'syncing' | 'saved' | 'error';
  cloudNotice: string | null;
  onCloudSignIn: () => void;
  onCloudSignOut: () => void;
  onChange: (next: GameQuestion[]) => void;
  onSaveCurriculumOverride: (edited: GameQuestion) => void;
  onResetCurriculumOverride: (id: string) => void;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'write' | 'bank'>(initialTab);
  const scrollBodyRef = useRef<HTMLDivElement>(null);
  const [editTarget, setEditTarget] = useState<EditTarget>('new_custom');
  const [mode, setMode] = useState<GameMode>('mcq');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<QuestionDifficulty>('easy');

  // Common fields
  const [topic, setTopic] = useState('');
  const [timeLimitSec, setTimeLimitSec] = useState(24);
  const [ruleHint, setRuleHint] = useState('');
  const [explanation, setExplanation] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [savedToast, setSavedToast] = useState<string | null>(null);

  // MCQ fields
  const [mcqPrompt, setMcqPrompt] = useState('');
  const [mcqOptions, setMcqOptions] = useState<[string, string, string, string]>(['', '', '', '']);
  const [mcqCorrectIndex, setMcqCorrectIndex] = useState(0);

  // Journal Entry fields
  const [jeTransaction, setJeTransaction] = useState('');
  const [jeAmount, setJeAmount] = useState('200000');
  const [jeCurrency, setJeCurrency] = useState('دینار');
  const [jeDebit, setJeDebit] = useState('حـ/ المشتريات');
  const [jeCredit, setJeCredit] = useState('حـ/ الصندوق');
  const [jeExtra1, setJeExtra1] = useState('حـ/ المبيعات');
  const [jeExtra2, setJeExtra2] = useState('حـ/ البنك');

  // Debit/Credit fields
  const [dcTransaction, setDcTransaction] = useState('');
  const [dcAccount, setDcAccount] = useState('');
  const [dcPrompt, setDcPrompt] = useState('');
  const [dcSide, setDcSide] = useState<'debit' | 'credit'>('debit');

  // True/False fields
  const [tfClaim, setTfClaim] = useState('');
  const [tfAnswer, setTfAnswer] = useState(true);

  // Classify fields
  const [clsPrompt, setClsPrompt] = useState('ئەم ٤ هەژمارە پۆلێن بکە بۆ خانە دروستەکانیان:');
  const [clsItems, setClsItems] = useState<
    Array<{ id: string; label: string; correctBucket: LedgerBucket }>
  >([
    { id: 'c1', label: 'الصندوق', correctBucket: 'assets' },
    { id: 'c2', label: 'الدائنون', correctBucket: 'liabilities_equity' },
    { id: 'c3', label: 'المبيعات', correctBucket: 'revenue' },
    { id: 'c4', label: 'المصروفات', correctBucket: 'expenses' },
  ]);

  // Equation fields
  const [eqPrompt, setEqPrompt] = useState('');
  const [eqFormulaTitle, setEqFormulaTitle] = useState('الموجودات = المطلوبات + رأس المال');
  const [eqCurrency, setEqCurrency] = useState('دینار');
  const [eqLeftLabel, setEqLeftLabel] = useState('الموجودات');
  const [eqLeftValue, setEqLeftValue] = useState('50000');
  const [eqRight1Label, setEqRight1Label] = useState('المطلوبات');
  const [eqRight1Value, setEqRight1Value] = useState('40000');
  const [eqRight2Label, setEqRight2Label] = useState('رأس المال');
  const [eqRight2Value, setEqRight2Value] = useState('');
  const [eqOp, setEqOp] = useState<'+' | '-'>('+');
  const [eqChoices, setEqChoices] = useState<[string, string, string, string]>([
    '10000',
    '90000',
    '20000',
    '15000',
  ]);
  const [eqCorrectIdx, setEqCorrectIdx] = useState(0);

  // Bank picker filters
  const [bankSearch, setBankSearch] = useState('');
  const [bankDiff, setBankDiff] = useState<'all' | QuestionDifficulty>('all');

  const effectiveBank = useMemo(
    () => ACCOUNTING_QUESTIONS.map((q) => curriculumOverrides[q.id] ?? q),
    [curriculumOverrides]
  );

  const filteredBank = useMemo(() => {
    const q = bankSearch.trim().toLowerCase();
    return effectiveBank.filter((item) => {
      if (bankDiff !== 'all' && item.difficulty !== bankDiff) return false;
      if (!q) return true;
      const hay = `${item.topic} ${summarizeQuestion(item)}`.toLowerCase();
      return hay.includes(q);
    });
  }, [effectiveBank, bankSearch, bankDiff]);

  const showToast = (msg: string) => {
    setSavedToast(msg);
    setTimeout(() => setSavedToast(null), 2400);
  };

  const resetForm = () => {
    setEditTarget('new_custom');
    setEditingId(null);
    setDifficulty('easy');
    setTopic('');
    setRuleHint('');
    setExplanation('');
    setFormError(null);
    setMcqPrompt('');
    setMcqOptions(['', '', '', '']);
    setMcqCorrectIndex(0);
    setJeTransaction('');
    setJeAmount('200000');
    setJeCurrency('دینار');
    setJeDebit('حـ/ المشتريات');
    setJeCredit('حـ/ الصندوق');
    setJeExtra1('حـ/ المبيعات');
    setJeExtra2('حـ/ البنك');
    setDcTransaction('');
    setDcAccount('');
    setDcPrompt('');
    setDcSide('debit');
    setTfClaim('');
    setTfAnswer(true);
    setClsPrompt('ئەم ٤ هەژمارە پۆلێن بکە بۆ خانە دروستەکانیان:');
    setClsItems([
      { id: 'c1', label: 'الصندوق', correctBucket: 'assets' },
      { id: 'c2', label: 'الدائنون', correctBucket: 'liabilities_equity' },
      { id: 'c3', label: 'المبيعات', correctBucket: 'revenue' },
      { id: 'c4', label: 'المصروفات', correctBucket: 'expenses' },
    ]);
    setEqPrompt('');
    setEqFormulaTitle('الموجودات = المطلوبات + رأس المال');
    setEqCurrency('دینار');
    setEqLeftLabel('الموجودات');
    setEqLeftValue('50000');
    setEqRight1Label('المطلوبات');
    setEqRight1Value('40000');
    setEqRight2Label('رأس المال');
    setEqRight2Value('');
    setEqOp('+');
    setEqChoices(['10000', '90000', '20000', '15000']);
    setEqCorrectIdx(0);
  };

  const loadForEdit = (q: GameQuestion, target: 'edit_custom' | 'edit_curriculum') => {
    setActiveTab('write');
    setEditTarget(target);
    setEditingId(q.id);
    setMode(q.mode);
    setDifficulty(q.difficulty);
    setTopic(q.topic);
    setTimeLimitSec(q.timeLimitSec);
    setRuleHint(q.ruleHint);
    setExplanation(q.explanation);
    setFormError(null);

    if (q.mode === 'mcq') {
      setMcqPrompt(q.prompt);
      setMcqOptions([...q.options] as [string, string, string, string]);
      setMcqCorrectIndex(q.correctIndex);
    } else if (q.mode === 'journal_entry') {
      setJeTransaction(q.transaction);
      setJeAmount(String(q.amount));
      setJeCurrency(q.currency);
      setJeDebit(q.correctDebit);
      setJeCredit(q.correctCredit);
      const others = q.accounts.filter((a) => a !== q.correctDebit && a !== q.correctCredit);
      setJeExtra1(others[0] ?? 'حـ/ المبيعات');
      setJeExtra2(others[1] ?? 'حـ/ البنك');
    } else if (q.mode === 'debit_credit') {
      setDcTransaction(q.transaction);
      setDcAccount(q.targetAccount);
      setDcPrompt(q.prompt);
      setDcSide(q.correctSide);
    } else if (q.mode === 'true_false') {
      setTfClaim(q.claim);
      setTfAnswer(q.correctAnswer);
    } else if (q.mode === 'classify') {
      setClsPrompt(q.prompt);
      setClsItems(q.items.map((item) => ({ ...item })));
    } else if (q.mode === 'equation') {
      setEqPrompt(q.prompt);
      setEqFormulaTitle(q.formulaTitle);
      setEqCurrency(q.currency);
      setEqLeftLabel(q.leftSide[0]?.label ?? 'الموجودات');
      setEqLeftValue(q.leftSide[0]?.value !== null && q.leftSide[0]?.value !== undefined ? String(q.leftSide[0].value) : '');
      setEqRight1Label(q.rightSide[0]?.label ?? 'المطلوبات');
      setEqRight1Value(q.rightSide[0]?.value !== null && q.rightSide[0]?.value !== undefined ? String(q.rightSide[0].value) : '');
      setEqRight2Label(q.rightSide[1]?.label ?? 'رأس المال');
      setEqRight2Value(q.rightSide[1]?.value !== null && q.rightSide[1]?.value !== undefined ? String(q.rightSide[1].value) : '');
      setEqOp(q.operatorRight);
      setEqChoices(q.choices.map((c) => String(c)) as [string, string, string, string]);
      const idx = q.choices.indexOf(q.correctValue);
      setEqCorrectIdx(idx >= 0 ? idx : 0);
    }
  };

  const handleSaveQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (editTarget === 'new_custom' && questions.length >= 30) {
      setFormError('ئەوپەڕی ٣٠ پرسیار دەتوانیت زیاد بکەیت لە یەک یاریدا.');
      return;
    }

    const id = editingId ?? `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const cleanTopic = topic.trim() || 'پرسیاری مامۆستا';
    const cleanHint = ruleHint.trim() || 'بە وریایی بیر لە بنەماکانی ژمێرییاری بکەرەوە.';
    const cleanExplanation =
      explanation.trim() || 'وەڵامە دروستەکە بەپێی بنەماکانی ژمێرییاری (مبادئ المحاسبة).';

    let built: GameQuestion | null = null;

    if (mode === 'mcq') {
      const prompt = mcqPrompt.trim();
      const opts = mcqOptions.map((o) => o.trim());
      if (!prompt) {
        setFormError('تکایە دەقی پرسیارەکە بنووسە.');
        return;
      }
      if (opts.some((o) => o.length === 0)) {
        setFormError('تکایە هەر چوار هەڵبژاردەکە پڕبکەرەوە.');
        return;
      }
      built = {
        id,
        mode: 'mcq',
        difficulty,
        topic: cleanTopic,
        prompt,
        options: [opts[0], opts[1], opts[2], opts[3]],
        correctIndex: mcqCorrectIndex,
        timeLimitSec,
        ruleHint: cleanHint,
        explanation: cleanExplanation,
      };
    } else if (mode === 'journal_entry') {
      const tx = jeTransaction.trim();
      const d = jeDebit.trim();
      const c = jeCredit.trim();
      const e1 = jeExtra1.trim();
      const e2 = jeExtra2.trim();
      const amt = Math.max(1, Math.round(Number(jeAmount.replace(/,/g, '')) || 0));
      if (!tx) {
        setFormError('تکایە دەقی مامەڵە داراییەکە بنووسە.');
        return;
      }
      if (!d || !c || !e1 || !e2) {
        setFormError('تکایە هەر چوار هەژمارەکە بنووسە.');
        return;
      }
      if (new Set([d, c, e1, e2]).size < 4) {
        setFormError('هەر چوار ناوی هەژمارەکان دەبێت جیاواز بن.');
        return;
      }
      const curr = jeCurrency.trim() || 'دینار';
      built = {
        id,
        mode: 'journal_entry',
        difficulty,
        topic: cleanTopic,
        transaction: tx,
        amount: amt,
        currency: curr,
        accounts: [d, c, e1, e2],
        correctDebit: d,
        correctCredit: c,
        timeLimitSec: Math.max(timeLimitSec, 20),
        ruleHint: cleanHint,
        explanation: cleanExplanation,
        lesson: {
          debitAccount: d,
          creditAccount: c,
          amountLabel: `${amt.toLocaleString('en-US')} ${curr}`,
          ruleSummary: `من ${d} إلى ${c}`,
        },
      };
    } else if (mode === 'debit_credit') {
      const tx = dcTransaction.trim();
      const acc = dcAccount.trim();
      if (!acc || !tx) {
        setFormError('تکایە ناوی هەژمار و ڕوونکردنەوەی مامەڵەکە بنووسە.');
        return;
      }
      built = {
        id,
        mode: 'debit_credit',
        difficulty,
        topic: cleanTopic,
        transaction: tx,
        targetAccount: acc,
        prompt: dcPrompt.trim() || `ئەم هەژمارە (${acc}) لەم حاڵەتەدا مدينـە یان دائن؟`,
        correctSide: dcSide,
        timeLimitSec,
        ruleHint: cleanHint,
        explanation: cleanExplanation,
      };
    } else if (mode === 'true_false') {
      const claim = tfClaim.trim();
      if (!claim) {
        setFormError('تکایە ڕستەکە بنووسە بۆ پشکنینی ڕاست یان هەڵە.');
        return;
      }
      built = {
        id,
        mode: 'true_false',
        difficulty,
        topic: cleanTopic,
        claim,
        ledgerRef: cleanTopic,
        correctAnswer: tfAnswer,
        timeLimitSec,
        ruleHint: cleanHint,
        explanation: cleanExplanation,
      };
    } else if (mode === 'classify') {
      const prompt = clsPrompt.trim();
      if (!prompt || clsItems.some((item) => item.label.trim().length === 0)) {
        setFormError('تکایە ناونیشان و هەر ٤ هەژمارەکە پڕبکەرەوە.');
        return;
      }
      const cleaned = clsItems.map((item, idx) => ({
        id: item.id || `c${idx + 1}`,
        label: item.label.trim(),
        correctBucket: item.correctBucket,
      }));
      built = {
        id,
        mode: 'classify',
        difficulty,
        topic: cleanTopic,
        prompt,
        items: [cleaned[0], cleaned[1], cleaned[2], cleaned[3]],
        timeLimitSec: Math.max(timeLimitSec, 24),
        ruleHint: cleanHint,
        explanation: cleanExplanation,
      };
    } else if (mode === 'equation') {
      const prompt = eqPrompt.trim();
      const parsedChoices = eqChoices.map((c) => Number(c.replace(/,/g, '').trim()));
      if (!prompt) {
        setFormError('تکایە دەقی پرسیاری هاوکێشەکە بنووسە.');
        return;
      }
      if (parsedChoices.some((n) => !Number.isFinite(n))) {
        setFormError('هەر چوار هەڵبژاردە ژمارەییەکە دەبێت ژمارەی دروست بن.');
        return;
      }
      const parseSlot = (raw: string): number | null => {
        const cleaned = raw.replace(/,/g, '').trim();
        if (cleaned === '' || cleaned === '?') return null;
        const n = Number(cleaned);
        return Number.isFinite(n) ? n : null;
      };
      built = {
        id,
        mode: 'equation',
        difficulty,
        topic: cleanTopic,
        formulaTitle: eqFormulaTitle.trim() || 'الموجودات = المطلوبات + رأس المال',
        prompt,
        leftSide: [{ label: eqLeftLabel.trim() || 'الموجودات', value: parseSlot(eqLeftValue) }],
        rightSide: [
          { label: eqRight1Label.trim() || 'المطلوبات', value: parseSlot(eqRight1Value) },
          { label: eqRight2Label.trim() || 'رأس المال', value: parseSlot(eqRight2Value) },
        ],
        operatorRight: eqOp,
        choices: [parsedChoices[0], parsedChoices[1], parsedChoices[2], parsedChoices[3]],
        correctValue: parsedChoices[eqCorrectIdx],
        currency: eqCurrency.trim() || 'دینار',
        timeLimitSec,
        ruleHint: cleanHint,
        explanation: cleanExplanation,
      };
    }

    if (!built) return;

    if (editTarget === 'edit_curriculum') {
      onSaveCurriculumOverride(built);
      // Also update inside custom list if that curriculum question was already picked
      if (questions.some((item) => item.id === built!.id)) {
        onChange(questions.map((item) => (item.id === built!.id ? built! : item)));
      }
      resetForm();
      setActiveTab('bank');
      scrollBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      showToast('پرسیاری مەنهەجەکە بە سەرکەوتوویی دەستکاری کرا و پاشەکەوت بوو ✓');
    } else if (editTarget === 'edit_custom') {
      onChange(questions.map((item) => (item.id === editingId ? built! : item)));
      resetForm();
      showToast('گۆڕانکارییەکە پاشەکەوت کرا ✓');
    } else {
      onChange([...questions, built]);
      resetForm();
      showToast('پرسیارەکە زیاد کرا بۆ لیستەکەت ✓');
    }
  };

  const handleAddFromBank = (q: GameQuestion) => {
    if (questions.length >= 30) return;
    if (questions.some((existing) => existing.id === q.id)) return;
    onChange([...questions, q]);
  };

  const handleDelete = (id: string) => {
    if (editingId === id && editTarget === 'edit_custom') resetForm();
    onChange(questions.filter((q) => q.id !== id));
  };

  const handleMove = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= questions.length) return;
    const copy = [...questions];
    const tmp = copy[index];
    copy[index] = copy[target];
    copy[target] = tmp;
    onChange(copy);
  };

  const addedBankIds = useMemo(() => new Set(questions.map((q) => q.id)), [questions]);
  const overrideCount = Object.keys(curriculumOverrides).length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="بەڕێوەبردن و دەستکاریکردنی پرسیارەکان"
      className="fixed inset-0 z-50 bg-[#04140E]/88 overflow-y-auto flex items-start sm:items-center justify-center p-2.5 sm:p-5"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl sm:max-h-[92dvh] my-2 sm:my-0 bg-[#0B2D21] border-2 border-[#D4A243]/55 rounded-2xl shadow-2xl flex flex-col sm:overflow-hidden animate-settle"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <header className="px-4 sm:px-6 py-3.5 bg-[#082118] border-b border-[#D4A243]/30 flex items-center justify-between gap-3 shrink-0 rounded-t-2xl">
          <div className="min-w-0">
            <h2 className="font-display text-lg sm:text-2xl font-bold text-[#FAF5EA] truncate">
              بەڕێوەبردن و دەستکاریکردنی پرسیارەکان
            </h2>
            <p className="text-xs text-[#B8D0C2]">
              پرسیارەکانی مەنهەج دەستکاری بکە یان پرسیاری نوێ بنووسە ({questions.length} پرسیاری تایبەت
              {overrideCount > 0 ? ` · ${overrideCount} دەستکاری مەنهەج` : ''})
            </p>
          </div>
          <button
            type="button"
            aria-label="داخستنی پەنجەرەی پرسیارەکان"
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-[#0E3628] hover:bg-[#164D3A] border border-[#D4A243]/35 text-[#FAF5EA] flex items-center justify-center cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Permanent Cloud Save Bar (Firebase Firestore) */}
        <div
          data-testid="cloud-save-bar"
          className={`px-4 sm:px-6 py-2.5 border-b flex flex-wrap items-center justify-between gap-2.5 shrink-0 ${
            cloudUser
              ? 'bg-[#0D3326] border-[#6EE7B7]/30'
              : 'bg-[#1D2818] border-[#D4A243]/35'
          }`}
        >
          <div className="flex items-center gap-2 text-xs text-[#E8F4ED] min-w-0">
            <Cloud
              className={`w-4 h-4 shrink-0 ${cloudUser ? 'text-[#6EE7B7]' : 'text-[#F2D28B]'}`}
              aria-hidden="true"
            />
            {cloudUser ? (
              <span className="truncate">
                پاشەکەوتکردنی هەمیشەیی لە هەور چالاکە ({cloudUser.email || cloudUser.displayName})
                {cloudSyncState === 'syncing'
                  ? ' · خەریکی پاشەکەوتکردنە...'
                  : cloudSyncState === 'saved'
                    ? ' · پاشەکەوتکرا ✓'
                    : ''}
              </span>
            ) : (
              <span>
                گۆڕانکارییەکان لەم ئامێرە پاشەکەوت دەبن — بۆ مانەوەی هەمیشەیی لە هەموو ئامێرێکدا بە Google بچۆ ژوورەوە
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {cloudNotice && <span className="text-[11px] font-semibold text-[#FCA5A5]">{cloudNotice}</span>}
            {cloudUser ? (
              <button
                type="button"
                onClick={onCloudSignOut}
                className="min-h-[32px] px-3 py-1 rounded-lg bg-[#082018] hover:bg-[#144333] border border-[#D4A243]/35 text-[#E8D5A9] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                دەرچوون
              </button>
            ) : (
              <button
                type="button"
                onClick={onCloudSignIn}
                className="min-h-[34px] px-3.5 py-1 rounded-lg bg-[#D4A243] hover:bg-[#E2B55A] text-[#17120A] text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" aria-hidden="true" />
                چوونەژوورەوە بە Google
              </button>
            )}
          </div>
        </div>

        {/* Main Split Body */}
        <div
          ref={scrollBodyRef}
          className="flex-1 sm:overflow-y-auto grid grid-cols-1 lg:grid-cols-[1.25fr_0.9fr] divide-y lg:divide-y-0 lg:divide-x lg:divide-x-reverse divide-[#D4A243]/25"
        >
          {/* Right (RTL Primary): Authoring/Edit Form OR Curriculum Bank */}
          <div className="p-4 sm:p-5 flex flex-col gap-4">
            {/* Switch Tabs */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('write')}
                className={`min-h-[42px] px-3 rounded-xl border text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                  activeTab === 'write'
                    ? 'bg-[#D4A243] text-[#17120A] border-[#F6DF9F]'
                    : 'bg-[#081F17] text-[#D7E6DC] border-[#D4A243]/25 hover:border-[#D4A243]/60'
                }`}
              >
                <Edit3 className="w-4 h-4" aria-hidden="true" />
                {editTarget === 'edit_curriculum'
                  ? 'دەستکاری پرسیاری مەنهەج'
                  : editTarget === 'edit_custom'
                    ? 'دەستکاری پرسیار'
                    : 'نووسینی پرسیاری نوێ'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('bank')}
                className={`min-h-[42px] px-3 rounded-xl border text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                  activeTab === 'bank'
                    ? 'bg-[#D4A243] text-[#17120A] border-[#F6DF9F]'
                    : 'bg-[#081F17] text-[#D7E6DC] border-[#D4A243]/25 hover:border-[#D4A243]/60'
                }`}
              >
                <BookOpen className="w-4 h-4" aria-hidden="true" />
                پرسیارەکانی مەنهەج ({effectiveBank.length})
              </button>
            </div>

            {savedToast && (
              <div
                role="status"
                className="rounded-xl bg-[#144434] border border-[#6EE7B7]/60 px-3.5 py-2 text-xs sm:text-sm font-bold text-[#D1FAE5]"
              >
                {savedToast}
              </div>
            )}

            {activeTab === 'write' ? (
              <form onSubmit={handleSaveQuestion} className="flex flex-col gap-3.5">
                {editTarget === 'edit_curriculum' && (
                  <div className="rounded-xl bg-[#2B200B] border border-[#D4A243]/55 px-3.5 py-2 text-xs text-[#FCEBC2] flex items-center justify-between gap-2">
                    <span>
                      ئێستا دەستکاری پرسیارێکی ناو <strong>مەنهەج</strong> دەکەیت — پاش پاشەکەوتکردن لە هەردوو دۆخی <strong>خۆکار (Auto)</strong> و <strong>تایبەت</strong> کار دەکات.
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        resetForm();
                        setActiveTab('bank');
                      }}
                      className="text-[#F4D891] font-bold hover:underline shrink-0 cursor-pointer"
                    >
                      پاشگەزبوونەوە
                    </button>
                  </div>
                )}

                {/* Question Type Selector (locked to question's type when editing curriculum) */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-[#E8D5A9]">جۆری پرسیار</span>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                    {ALL_EDIT_MODES.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={editTarget === 'edit_curriculum'}
                        onClick={() => {
                          setMode(opt.id);
                          setFormError(null);
                        }}
                        className={`min-h-[36px] px-1.5 rounded-lg border text-[11px] sm:text-xs font-bold transition-colors ${
                          mode === opt.id
                            ? 'bg-[#174E3B] border-[#F2D28B] text-[#FAF5EA]'
                            : 'bg-[#081F17] border-[#D4A243]/25 text-[#B4CCBE] hover:border-[#D4A243]/55'
                        } ${editTarget === 'edit_curriculum' ? 'opacity-70 cursor-default' : 'cursor-pointer'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Topic + Difficulty + Timer */}
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2.5">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-[#E8D5A9]">ناونیشانی بابەت</label>
                    <input
                      type="text"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      maxLength={80}
                      placeholder="بۆ نموونە: الفصل الثاني — القيود البسيطة"
                      className="min-h-[40px] px-3 rounded-xl bg-[#071D15] border border-[#D4A243]/35 text-[#FAF5EA] placeholder-[#7FA090] text-base sm:text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-[#E8D5A9]">ئاست</span>
                    <div className="grid grid-cols-2 gap-1">
                      {(['easy', 'hard'] as const).map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setDifficulty(lvl)}
                          className={`min-h-[40px] px-2.5 rounded-lg border text-xs font-bold cursor-pointer ${
                            difficulty === lvl
                              ? 'bg-[#D4A243] text-[#17120A] border-[#F6DF9F]'
                              : 'bg-[#071D15] text-[#D7E6DC] border-[#D4A243]/25'
                          }`}
                        >
                          {lvl === 'easy' ? 'ئاسان' : 'قورس'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-[#E8D5A9]">کات</span>
                    <div className="grid grid-cols-4 gap-1">
                      {[18, 24, 32, 45].map((sec) => (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => setTimeLimitSec(sec)}
                          className={`min-h-[40px] px-2 rounded-lg border font-numeric text-xs font-bold cursor-pointer ${
                            timeLimitSec === sec
                              ? 'bg-[#D4A243] text-[#17120A] border-[#F6DF9F]'
                              : 'bg-[#071D15] text-[#D7E6DC] border-[#D4A243]/25'
                          }`}
                        >
                          {sec}s
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* MODE 1: MCQ */}
                {mode === 'mcq' && (
                  <>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-[#E8D5A9]">دەقی پرسیار *</label>
                      <textarea
                        rows={2}
                        value={mcqPrompt}
                        onChange={(e) => {
                          setMcqPrompt(e.target.value);
                          if (formError) setFormError(null);
                        }}
                        maxLength={260}
                        placeholder="پرسیارەکەت لێرە بنووسە..."
                        className="p-3 rounded-xl bg-[#071D15] border border-[#D4A243]/35 text-[#FAF5EA] placeholder-[#7FA090] text-base sm:text-sm resize-none"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-semibold text-[#E8D5A9]">
                        هەڵبژاردەکان (کلیک لە ژمارەکە بکە بۆ دیاریکردنی وەڵامی ڕاست) *
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {mcqOptions.map((opt, idx) => {
                          const isCorrect = mcqCorrectIndex === idx;
                          return (
                            <div
                              key={idx}
                              className={`flex items-center gap-2 p-1.5 rounded-xl border ${
                                isCorrect
                                  ? 'bg-[#144434] border-[#6EE7B7]'
                                  : 'bg-[#071D15] border-[#D4A243]/30'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => setMcqCorrectIndex(idx)}
                                aria-label={`وەڵامی ڕاست: هەڵبژاردەی ${idx + 1}`}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 cursor-pointer border font-bold text-xs ${
                                  isCorrect
                                    ? 'bg-[#1F8A62] border-[#6EE7B7] text-white'
                                    : 'bg-[#0B2A1F] border-[#D4A243]/35 text-[#C8D9CE]'
                                }`}
                              >
                                {isCorrect ? <Check className="w-4 h-4" /> : idx + 1}
                              </button>
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => {
                                  const next = [...mcqOptions] as [string, string, string, string];
                                  next[idx] = e.target.value;
                                  setMcqOptions(next);
                                  if (formError) setFormError(null);
                                }}
                                maxLength={140}
                                placeholder={`هەڵبژاردەی ${idx + 1}`}
                                className="flex-1 min-w-0 bg-transparent text-[#FAF5EA] placeholder-[#7FA090] text-base sm:text-sm focus:outline-none px-1"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {/* MODE 2: JOURNAL ENTRY */}
                {mode === 'journal_entry' && (
                  <>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-[#E8D5A9]">
                        دەقی مامەڵە داراییەکە *
                      </label>
                      <textarea
                        rows={2}
                        value={jeTransaction}
                        onChange={(e) => {
                          setJeTransaction(e.target.value);
                          if (formError) setFormError(null);
                        }}
                        maxLength={260}
                        placeholder="بۆ نموونە: اشترى التاجر بضاعة بمبلغ 200,000 دينار نقداً"
                        className="p-3 rounded-xl bg-[#071D15] border border-[#D4A243]/35 text-[#FAF5EA] placeholder-[#7FA090] text-base sm:text-sm resize-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-[#E8D5A9]">بڕی پارە *</label>
                        <input
                          type="number"
                          min={1}
                          value={jeAmount}
                          onChange={(e) => setJeAmount(e.target.value)}
                          className="font-numeric min-h-[40px] px-3 rounded-xl bg-[#071D15] border border-[#D4A243]/35 text-[#FAF5EA] text-base sm:text-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-[#E8D5A9]">دراو</label>
                        <input
                          type="text"
                          value={jeCurrency}
                          onChange={(e) => setJeCurrency(e.target.value)}
                          maxLength={16}
                          className="min-h-[40px] px-3 rounded-xl bg-[#071D15] border border-[#D4A243]/35 text-[#FAF5EA] text-base sm:text-sm"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-[#6EE7B7]">
                          وەڵامی ڕاست — من حـ/ (المدين) *
                        </label>
                        <input
                          type="text"
                          value={jeDebit}
                          onChange={(e) => setJeDebit(e.target.value)}
                          maxLength={80}
                          className="min-h-[40px] px-3 rounded-xl bg-[#0C3124] border border-[#6EE7B7]/45 text-[#FAF5EA] text-base sm:text-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-[#F4D891]">
                          وەڵامی ڕاست — إلى حـ/ (الدائن) *
                        </label>
                        <input
                          type="text"
                          value={jeCredit}
                          onChange={(e) => setJeCredit(e.target.value)}
                          maxLength={80}
                          className="min-h-[40px] px-3 rounded-xl bg-[#0C3124] border border-[#F4D891]/45 text-[#FAF5EA] text-base sm:text-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-[#A9C2B3]">
                          هەژماری زیادە ١ *
                        </label>
                        <input
                          type="text"
                          value={jeExtra1}
                          onChange={(e) => setJeExtra1(e.target.value)}
                          maxLength={80}
                          className="min-h-[40px] px-3 rounded-xl bg-[#071D15] border border-[#D4A243]/30 text-[#FAF5EA] text-base sm:text-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-[#A9C2B3]">
                          هەژماری زیادە ٢ *
                        </label>
                        <input
                          type="text"
                          value={jeExtra2}
                          onChange={(e) => setJeExtra2(e.target.value)}
                          maxLength={80}
                          className="min-h-[40px] px-3 rounded-xl bg-[#071D15] border border-[#D4A243]/30 text-[#FAF5EA] text-base sm:text-sm"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* MODE 3: DEBIT / CREDIT */}
                {mode === 'debit_credit' && (
                  <>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-[#E8D5A9]">ناوی هەژمار *</label>
                      <input
                        type="text"
                        value={dcAccount}
                        onChange={(e) => setDcAccount(e.target.value)}
                        maxLength={90}
                        placeholder="بۆ نموونە: حـ/ أوراق القبض"
                        className="min-h-[40px] px-3 rounded-xl bg-[#071D15] border border-[#D4A243]/35 text-[#FAF5EA] placeholder-[#7FA090] text-base sm:text-sm"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-[#E8D5A9]">
                        دەقی مامەڵە یان ڕوونکردنەوە *
                      </label>
                      <input
                        type="text"
                        value={dcTransaction}
                        onChange={(e) => setDcTransaction(e.target.value)}
                        maxLength={260}
                        placeholder="بۆ نموونە: سروشتی بنەڕەتی ئەم هەژمارە چییە؟"
                        className="min-h-[40px] px-3 rounded-xl bg-[#071D15] border border-[#D4A243]/35 text-[#FAF5EA] placeholder-[#7FA090] text-base sm:text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setDcSide('debit')}
                        className={`min-h-[42px] rounded-xl border font-bold text-sm cursor-pointer ${
                          dcSide === 'debit'
                            ? 'bg-[#17573F] border-[#6EE7B7] text-white'
                            : 'bg-[#071D15] border-[#D4A243]/25 text-[#B4CCBE]'
                        }`}
                      >
                        مدين (Debit)
                      </button>
                      <button
                        type="button"
                        onClick={() => setDcSide('credit')}
                        className={`min-h-[42px] rounded-xl border font-bold text-sm cursor-pointer ${
                          dcSide === 'credit'
                            ? 'bg-[#6F4C12] border-[#F4D891] text-white'
                            : 'bg-[#071D15] border-[#D4A243]/25 text-[#B4CCBE]'
                        }`}
                      >
                        دائن (Credit)
                      </button>
                    </div>
                  </>
                )}

                {/* MODE 4: TRUE / FALSE */}
                {mode === 'true_false' && (
                  <>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-[#E8D5A9]">
                        دەقی ڕستەکە (ڕاست یان هەڵە) *
                      </label>
                      <textarea
                        rows={2}
                        value={tfClaim}
                        onChange={(e) => setTfClaim(e.target.value)}
                        maxLength={260}
                        placeholder="بۆ نموونە: المسحوبات الشخصية هەمیشە لە الطرف المدين تۆمار دەکرێت."
                        className="p-3 rounded-xl bg-[#071D15] border border-[#D4A243]/35 text-[#FAF5EA] placeholder-[#7FA090] text-base sm:text-sm resize-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setTfAnswer(true)}
                        className={`min-h-[42px] rounded-xl border font-bold text-sm cursor-pointer ${
                          tfAnswer
                            ? 'bg-[#17573F] border-[#6EE7B7] text-white'
                            : 'bg-[#071D15] border-[#D4A243]/25 text-[#B4CCBE]'
                        }`}
                      >
                        ڕاستە ✓
                      </button>
                      <button
                        type="button"
                        onClick={() => setTfAnswer(false)}
                        className={`min-h-[42px] rounded-xl border font-bold text-sm cursor-pointer ${
                          !tfAnswer
                            ? 'bg-[#7A2323] border-[#FCA5A5] text-white'
                            : 'bg-[#071D15] border-[#D4A243]/25 text-[#B4CCBE]'
                        }`}
                      >
                        هەڵەیە ✕
                      </button>
                    </div>
                  </>
                )}

                {/* MODE 5: CLASSIFY */}
                {mode === 'classify' && (
                  <>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-[#E8D5A9]">داواکاری پۆلێنکردن *</label>
                      <input
                        type="text"
                        value={clsPrompt}
                        onChange={(e) => setClsPrompt(e.target.value)}
                        maxLength={240}
                        className="min-h-[40px] px-3 rounded-xl bg-[#071D15] border border-[#D4A243]/35 text-[#FAF5EA] text-base sm:text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {clsItems.map((item, idx) => (
                        <div
                          key={item.id}
                          className="rounded-xl bg-[#071D15] border border-[#D4A243]/30 p-2 flex flex-col gap-1.5"
                        >
                          <input
                            type="text"
                            value={item.label}
                            onChange={(e) => {
                              const next = [...clsItems];
                              next[idx] = { ...item, label: e.target.value };
                              setClsItems(next);
                            }}
                            maxLength={90}
                            placeholder={`هەژماری ${idx + 1}`}
                            className="min-h-[34px] px-2 rounded-lg bg-[#0B2A1F] text-[#FAF5EA] text-base sm:text-sm"
                          />
                          <select
                            value={item.correctBucket}
                            onChange={(e) => {
                              const next = [...clsItems];
                              next[idx] = {
                                ...item,
                                correctBucket: e.target.value as LedgerBucket,
                              };
                              setClsItems(next);
                            }}
                            className="min-h-[34px] px-2 rounded-lg bg-[#113A2C] text-[#F4D891] text-xs font-bold"
                          >
                            {BUCKET_OPTIONS.map((b) => (
                              <option key={b} value={b}>
                                {LEDGER_BUCKET_LABELS[b].title}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* MODE 6: EQUATION */}
                {mode === 'equation' && (
                  <>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-[#E8D5A9]">دەقی پرسیاری هاوکێشە *</label>
                      <textarea
                        rows={2}
                        value={eqPrompt}
                        onChange={(e) => setEqPrompt(e.target.value)}
                        maxLength={260}
                        placeholder="بۆ نموونە: الموجودات 50,000 و المطلوبات 40,000؛ رأس المال چەندە؟"
                        className="p-3 rounded-xl bg-[#071D15] border border-[#D4A243]/35 text-[#FAF5EA] placeholder-[#7FA090] text-base sm:text-sm resize-none"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="flex flex-col gap-1 bg-[#071D15] p-2 rounded-xl border border-[#D4A243]/25">
                        <input
                          type="text"
                          value={eqLeftLabel}
                          onChange={(e) => setEqLeftLabel(e.target.value)}
                          placeholder="ناوی لای یەکەم"
                          className="bg-transparent text-xs font-bold text-[#E8D5A9]"
                        />
                        <input
                          type="text"
                          value={eqLeftValue}
                          onChange={(e) => setEqLeftValue(e.target.value)}
                          placeholder="بەتاڵ = ؟ (نەزانراو)"
                          className="font-numeric min-h-[34px] px-2 rounded-lg bg-[#0B2A1F] text-[#FAF5EA] text-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-1 bg-[#071D15] p-2 rounded-xl border border-[#D4A243]/25">
                        <input
                          type="text"
                          value={eqRight1Label}
                          onChange={(e) => setEqRight1Label(e.target.value)}
                          placeholder="ناوی خانەی ٢"
                          className="bg-transparent text-xs font-bold text-[#E8D5A9]"
                        />
                        <input
                          type="text"
                          value={eqRight1Value}
                          onChange={(e) => setEqRight1Value(e.target.value)}
                          placeholder="بەتاڵ = ؟ (نەزانراو)"
                          className="font-numeric min-h-[34px] px-2 rounded-lg bg-[#0B2A1F] text-[#FAF5EA] text-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-1 bg-[#071D15] p-2 rounded-xl border border-[#D4A243]/25">
                        <input
                          type="text"
                          value={eqRight2Label}
                          onChange={(e) => setEqRight2Label(e.target.value)}
                          placeholder="ناوی خانەی ٣"
                          className="bg-transparent text-xs font-bold text-[#E8D5A9]"
                        />
                        <input
                          type="text"
                          value={eqRight2Value}
                          onChange={(e) => setEqRight2Value(e.target.value)}
                          placeholder="بەتاڵ = ؟ (نەزانراو)"
                          className="font-numeric min-h-[34px] px-2 rounded-lg bg-[#0B2A1F] text-[#FAF5EA] text-sm"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {eqChoices.map((ch, idx) => {
                        const active = eqCorrectIdx === idx;
                        return (
                          <div
                            key={idx}
                            className={`flex items-center gap-1.5 p-1.5 rounded-xl border ${
                              active
                                ? 'bg-[#144434] border-[#6EE7B7]'
                                : 'bg-[#071D15] border-[#D4A243]/30'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => setEqCorrectIdx(idx)}
                              className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 cursor-pointer text-xs font-bold ${
                                active ? 'bg-[#1F8A62] text-white' : 'bg-[#0B2A1F] text-[#C8D9CE]'
                              }`}
                            >
                              {active ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                            </button>
                            <input
                              type="text"
                              value={ch}
                              onChange={(e) => {
                                const next = [...eqChoices] as [string, string, string, string];
                                next[idx] = e.target.value;
                                setEqChoices(next);
                              }}
                              className="font-numeric w-full min-w-0 bg-transparent text-[#FAF5EA] text-sm focus:outline-none"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* Explanation */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#E8D5A9]">
                    شیکردنەوەی فێرکاری پاش وەڵام
                  </label>
                  <input
                    type="text"
                    value={explanation}
                    onChange={(e) => setExplanation(e.target.value)}
                    maxLength={360}
                    placeholder="بۆچی ئەم وەڵامە دروستە؟"
                    className="min-h-[40px] px-3 rounded-xl bg-[#071D15] border border-[#D4A243]/30 text-[#FAF5EA] placeholder-[#7FA090] text-base sm:text-sm"
                  />
                </div>

                {formError && (
                  <p role="alert" className="text-xs sm:text-sm font-semibold text-[#FCA5A5]">
                    {formError}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="submit"
                    className="flex-1 min-h-[44px] px-5 py-2 rounded-xl bg-[#D4A243] hover:bg-[#E2B55A] text-[#17120A] font-extrabold text-sm inline-flex items-center justify-center gap-2 cursor-pointer shadow"
                  >
                    {editTarget === 'edit_curriculum' ? (
                      <>
                        <Check className="w-4 h-4" aria-hidden="true" />
                        پاشەکەوتکردنی دەستکاری مەنهەج
                      </>
                    ) : editTarget === 'edit_custom' ? (
                      <>
                        <Check className="w-4 h-4" aria-hidden="true" />
                        پاشەکەوتکردنی گۆڕانکاری
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" aria-hidden="true" />
                        زیادکردنی پرسیار بۆ لیست
                      </>
                    )}
                  </button>
                  {editTarget !== 'new_custom' && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-[#0F382A] text-[#D7E6DC] border border-[#D4A243]/30 text-xs font-bold cursor-pointer"
                    >
                      پاشگەزبوونەوە
                    </button>
                  )}
                </div>
              </form>
            ) : (
              /* Editable Curriculum Bank Browser */
              <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-[#9AB8A8] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={bankSearch}
                      onChange={(e) => setBankSearch(e.target.value)}
                      placeholder="گەڕان لە مەنهەج (بۆ نموونە: القيد المركب، المسحوبات، الفصل الأول...)"
                      className="w-full min-h-[40px] pr-9 pl-3 rounded-xl bg-[#071D15] border border-[#D4A243]/35 text-[#FAF5EA] placeholder-[#7FA090] text-base sm:text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-1 shrink-0">
                    {(['all', 'easy', 'hard'] as const).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setBankDiff(d)}
                        className={`min-h-[40px] px-2.5 rounded-lg border text-xs font-bold cursor-pointer ${
                          bankDiff === d
                            ? 'bg-[#D4A243] text-[#17120A] border-[#F6DF9F]'
                            : 'bg-[#071D15] text-[#D7E6DC] border-[#D4A243]/25'
                        }`}
                      >
                        {d === 'all' ? 'هەمووی' : DIFFICULTY_LABELS[d].shortTitle}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="sm:max-h-[400px] sm:overflow-y-auto flex flex-col gap-2 pl-1">
                  {filteredBank.map((q) => {
                    const alreadyAdded = addedBankIds.has(q.id);
                    const isEdited = Boolean(curriculumOverrides[q.id]);
                    return (
                      <div
                        key={q.id}
                        className={`rounded-xl p-3 border flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 ${
                          isEdited
                            ? 'bg-[#103628] border-[#6EE7B7]/45'
                            : 'bg-[#082018] border-[#D4A243]/20'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#E4C57A] font-semibold">
                            <span>{GAME_MODE_LABELS[q.mode].title}</span>
                            <span>·</span>
                            <span>{q.topic}</span>
                            {isEdited && (
                              <span className="text-[#6EE7B7] font-bold">· دەستکاریکراوە</span>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-[#FAF5EA] mt-1 leading-snug">
                            {summarizeQuestion(q)}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => loadForEdit(q, 'edit_curriculum')}
                            className="min-h-[34px] px-2.5 rounded-lg bg-[#144333] hover:bg-[#1C5B45] border border-[#D4A243]/40 text-[#F4D891] text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            دەستکاری
                          </button>

                          {isEdited && (
                            <button
                              type="button"
                              onClick={() => onResetCurriculumOverride(q.id)}
                              title="گەڕاندنەوە بۆ دەقی بنەڕەتی مەنهەج"
                              aria-label="گەڕاندنەوە بۆ دەقی بنەڕەتی"
                              className="w-8 h-[34px] rounded-lg bg-[#071D15] hover:bg-[#3A270B] border border-[#D4A243]/30 text-[#E8D5A9] flex items-center justify-center cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={alreadyAdded || questions.length >= 30}
                            onClick={() => handleAddFromBank(q)}
                            className={`min-h-[34px] px-2.5 rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition-colors ${
                              alreadyAdded
                                ? 'bg-[#174E3B] text-[#6EE7B7] cursor-default'
                                : 'bg-[#D4A243] hover:bg-[#E2B55A] text-[#17120A]'
                            }`}
                          >
                            {alreadyAdded ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                زیادکراوە
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5" />
                                زیادکردن
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Left (RTL Secondary): Teacher's Selected Custom Questions Queue */}
          <aside className="p-4 sm:p-5 bg-[#082219] flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm sm:text-base font-bold text-[#FAF5EA]">
                لیستی پرسیارە تایبەتەکان ({questions.length})
              </h3>
              {questions.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (editTarget === 'edit_custom') resetForm();
                    onChange([]);
                  }}
                  className="text-xs font-semibold text-[#FCA5A5] hover:underline cursor-pointer"
                >
                  سڕینەوەی هەمووی
                </button>
              )}
            </div>

            {questions.length === 0 ? (
              <div className="flex-1 min-h-[140px] rounded-xl border border-dashed border-[#D4A243]/30 bg-[#061A13] p-5 flex flex-col items-center justify-center text-center gap-2">
                <p className="text-sm font-bold text-[#E8D5A9]">لیستی پرسیاری تایبەت بەتاڵە</p>
                <p className="text-xs text-[#9AB8A8] leading-relaxed">
                  دەتوانیت لە بەشی «پرسیارەکانی مەنهەج» ڕاستەوخۆ هەر پرسیارێکی مەنهەج دەستکاری بکەیت یان پرسیاری نوێ بنووسیت و زیادی بکەیتە ئێرە.
                </p>
              </div>
            ) : (
              <div className="flex-1 sm:max-h-[420px] sm:overflow-y-auto flex flex-col gap-2 pl-1">
                {questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className={`rounded-xl p-3 border flex flex-col gap-2 ${
                      editingId === q.id && editTarget === 'edit_custom'
                        ? 'bg-[#174E3B] border-[#F2D28B]'
                        : 'bg-[#0B2B20] border-[#D4A243]/25'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-[#F4D891]">
                        #{idx + 1} · {GAME_MODE_LABELS[q.mode].title}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMove(idx, -1)}
                          aria-label="بردنە سەرەوە"
                          className="w-7 h-7 rounded bg-[#071D15] text-[#C8D9CE] hover:text-white disabled:opacity-35 flex items-center justify-center cursor-pointer"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === questions.length - 1}
                          onClick={() => handleMove(idx, 1)}
                          aria-label="بردنە خوارەوە"
                          className="w-7 h-7 rounded bg-[#071D15] text-[#C8D9CE] hover:text-white disabled:opacity-35 flex items-center justify-center cursor-pointer"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => loadForEdit(q, 'edit_custom')}
                          aria-label="دەستکاریکردن"
                          className="w-7 h-7 rounded bg-[#071D15] text-[#F2D28B] hover:bg-[#174E3B] flex items-center justify-center cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(q.id)}
                          aria-label="سڕینەوە"
                          className="w-7 h-7 rounded bg-[#071D15] text-[#FCA5A5] hover:bg-[#5E1D1D] flex items-center justify-center cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-[#EEF5F0] leading-snug line-clamp-2">
                      {summarizeQuestion(q)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>

        {/* Footer Confirm Bar */}
        <footer className="px-4 sm:px-6 py-3 bg-[#082118] border-t border-[#D4A243]/30 flex items-center justify-between gap-3 shrink-0 rounded-b-2xl">
          <span className="text-xs text-[#B8D0C2]">
            {overrideCount > 0
              ? `${overrideCount} پرسیاری مەنهەج دەستکاری کراون · ${questions.length} پرسیاری تایبەت`
              : `${questions.length} پرسیاری تایبەت لە لیستدایە`}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[42px] px-6 py-2 rounded-xl bg-[#D4A243] hover:bg-[#E2B55A] text-[#17120A] font-extrabold text-sm cursor-pointer whitespace-nowrap"
          >
            تەواو و داخستن
          </button>
        </footer>
      </div>
    </div>
  );
}
