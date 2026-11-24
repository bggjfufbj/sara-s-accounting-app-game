import { useState } from 'react';
import { BookOpen, X } from 'lucide-react';
import { soundFx } from '../utils/sound';

type GuideTab = 'equation' | 'nature' | 'journal';

interface InteractiveExample {
  id: string;
  label: string;
  assets: number;
  liabilities: number;
  equity: number;
  note: string;
}

const EQUATION_EXAMPLES: InteractiveExample[] = [
  {
    id: 'start',
    label: '١. دەستپێک بە رأس المال (10,000$)',
    assets: 10000,
    liabilities: 0,
    equity: 10000,
    note: 'الصندوق (الموجودات) بە 10,000$ زیاد دەکات و رأس المال (حقوق الملكية) بە 10,000$ زیاد دەکات.',
  },
  {
    id: 'loan',
    label: '٢. وەرگرتنی قرض مصرفي (4,000$)',
    assets: 14000,
    liabilities: 4000,
    equity: 10000,
    note: 'المصرف (الموجودات) دەبێتە 14,000$ و القروض (المطلوبات) دەبێتە 4,000$ — هاوکێشەکە هەر هاوسەنگە!',
  },
  {
    id: 'furniture',
    label: '٣. کڕینی الأثاث بە نەقد (2,000$)',
    assets: 14000,
    liabilities: 4000,
    equity: 10000,
    note: 'الأثاث (+2,000$) و الصندوق (−2,000$) هەردووکیان الموجوداتـن، بۆیە کۆی الموجودات هەر 14,000$ دەمێنێتەوە.',
  },
];

export function AccountingGuideModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<GuideTab>('equation');
  const [exampleIdx, setExampleIdx] = useState(0);
  const activeExample = EQUATION_EXAMPLES[exampleIdx];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-modal-title"
      className="fixed inset-0 z-50 bg-[#05140E]/85 flex items-start sm:items-center justify-center p-4 sm:p-6 overflow-y-auto"
    >
      <div className="w-full max-w-3xl bg-[#0B2C21] border border-[#D4A243]/45 rounded-2xl p-5 sm:p-7 flex flex-col gap-5 shadow-2xl animate-settle my-auto">
        <div className="flex items-center justify-between gap-4 border-b border-[#D4A243]/25 pb-3.5">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-[#F2D28B]" aria-hidden="true" />
            <h2 id="guide-modal-title" className="font-display text-2xl sm:text-3xl font-bold text-[#FAF5EA]">
              ڕێبەری فێربوونی مبادئ المحاسبة
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              soundFx.click();
              onClose();
            }}
            aria-label="داخستنی ڕێبەر"
            className="w-10 h-10 rounded-lg bg-[#081F17] hover:bg-[#144333] border border-[#D4A243]/30 text-[#FAF5EA] flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Interactive Learning Tabs */}
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ['equation', '١. المعادلة المحاسبية'],
              ['nature', '٢. قاعدة المدين والدائن'],
              ['journal', '٣. القيد اليومي (من / إلى)'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                soundFx.click();
                setTab(key);
              }}
              className={`min-h-[44px] px-3 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-colors cursor-pointer ${
                tab === key
                  ? 'bg-[#D4A243] text-[#17120A] border-[#F6DF9F]'
                  : 'bg-[#082018] text-[#D7E6DC] border-[#D4A243]/25 hover:border-[#D4A243]/60'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab 1: Interactive Accounting Equation */}
        {tab === 'equation' && (
          <div className="ledger-paper rounded-2xl p-5 flex flex-col gap-4">
            <p className="text-sm font-semibold text-[#3B3226]">
              کلیک لە هەر مامەڵەیەک بکە تا ببینی چۆن «المعادلة المحاسبية» لە هەموو کاتێکدا هاوسەنگ دەمێنێتەوە:
            </p>
            <div className="flex flex-wrap gap-2">
              {EQUATION_EXAMPLES.map((ex, idx) => (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => {
                    soundFx.click();
                    setExampleIdx(idx);
                  }}
                  className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold border transition-colors cursor-pointer ${
                    exampleIdx === idx
                      ? 'bg-[#0D3829] text-[#FAF5EA] border-[#0D3829]'
                      : 'bg-[#EFE6D2] text-[#2A2218] border-[#8B6B34]/30 hover:bg-[#E5D7BA]'
                  }`}
                >
                  {ex.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr_auto_1fr] gap-2.5 items-center pt-1">
              <div className="rounded-xl bg-[#0D3829] text-[#FAF5EA] p-3.5 text-center">
                <div className="text-xs text-[#E4C57A]">الموجودات</div>
                <div className="font-numeric text-2xl font-extrabold mt-1">
                  {activeExample.assets.toLocaleString('en-US')}$
                </div>
              </div>
              <div className="text-center font-extrabold text-xl text-[#8B6B34]">=</div>
              <div className="rounded-xl bg-[#EFE6D2] border border-[#8B6B34]/30 p-3.5 text-center">
                <div className="text-xs text-[#6F582C]">المطلوبات</div>
                <div className="font-numeric text-2xl font-extrabold text-[#1B1712] mt-1">
                  {activeExample.liabilities.toLocaleString('en-US')}$
                </div>
              </div>
              <div className="text-center font-extrabold text-xl text-[#8B6B34]">+</div>
              <div className="rounded-xl bg-[#EFE6D2] border border-[#8B6B34]/30 p-3.5 text-center">
                <div className="text-xs text-[#6F582C]">حقوق الملكية (رأس المال)</div>
                <div className="font-numeric text-2xl font-extrabold text-[#1B1712] mt-1">
                  {activeExample.equity.toLocaleString('en-US')}$
                </div>
              </div>
            </div>

            <p className="text-sm font-semibold text-[#0E4A35] bg-[#E7F2EC] rounded-xl p-3">
              {activeExample.note}
            </p>
          </div>
        )}

        {/* Tab 2: Nature of Accounts Table */}
        {tab === 'nature' && (
          <div className="ledger-paper rounded-2xl p-5 flex flex-col gap-3">
            <p className="text-sm font-semibold text-[#3B3226]">
              گرنگترین یاسای فێربوونی ژمێریاری: هەر هەژمارێک سرووشتی تایبەتی هەیە — لە کاتی زیادبووندا وەک سرووشتی خۆیەتی و لە کاتی کەمبووندا پێچەوانە دەبێتەوە:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-[#8B6B34]/35 text-[#6F582C]">
                    <th className="py-2 px-2">جۆری الحساب</th>
                    <th className="py-2 px-2">طبيعة الحساب</th>
                    <th className="py-2 px-2">لە زیادبووندا (+)</th>
                    <th className="py-2 px-2">لە کەمبووندا (−)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#8B6B34]/20 font-semibold text-[#1B1712]">
                  <tr>
                    <td className="py-2.5 px-2">الموجودات (الصندوق، المصرف، الأثاث، المدينون)</td>
                    <td className="py-2.5 px-2 text-[#0E4A35] font-extrabold">مدين</td>
                    <td className="py-2.5 px-2 text-[#0E4A35]">مدين</td>
                    <td className="py-2.5 px-2 text-[#9E2B2B]">دائن</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-2">المصروفات (الإيجار، الرواتب، المشتريات)</td>
                    <td className="py-2.5 px-2 text-[#0E4A35] font-extrabold">مدين</td>
                    <td className="py-2.5 px-2 text-[#0E4A35]">مدين</td>
                    <td className="py-2.5 px-2 text-[#9E2B2B]">دائن</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-2">المطلوبات (الدائنون، القروض، أوراق الدفع)</td>
                    <td className="py-2.5 px-2 text-[#9E2B2B] font-extrabold">دائن</td>
                    <td className="py-2.5 px-2 text-[#9E2B2B]">دائن</td>
                    <td className="py-2.5 px-2 text-[#0E4A35]">مدين</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-2">حقوق الملكية (رأس المال، الأرباح المحتجزة)</td>
                    <td className="py-2.5 px-2 text-[#9E2B2B] font-extrabold">دائن</td>
                    <td className="py-2.5 px-2 text-[#9E2B2B]">دائن</td>
                    <td className="py-2.5 px-2 text-[#0E4A35]">مدين</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-2">الإيرادات (المبيعات، إيراد الخدمات)</td>
                    <td className="py-2.5 px-2 text-[#9E2B2B] font-extrabold">دائن</td>
                    <td className="py-2.5 px-2 text-[#9E2B2B]">دائن</td>
                    <td className="py-2.5 px-2 text-[#0E4A35]">مدين</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: How to Write a Journal Entry */}
        {tab === 'journal' && (
          <div className="ledger-paper rounded-2xl p-5 flex flex-col gap-4">
            <p className="text-sm font-semibold text-[#3B3226]">
              نموونە: کۆمپانیا ئەثاثێکی بە بڕی <span className="font-numeric font-bold">2,000,000</span> دینار لە الصندوق کڕی.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl bg-[#F3ECDC] border border-[#8B6B34]/30 p-4 flex flex-col gap-2">
                <div className="text-xs font-bold text-[#6F582C]">شێوەی القيد اليومي (سجل اليومية)</div>
                <div className="flex items-center justify-between text-sm font-extrabold text-[#0E4A35]">
                  <span>من حـ/ الأثاث</span>
                  <span className="font-numeric">2,000,000 (مدين)</span>
                </div>
                <div className="flex items-center justify-between text-sm font-extrabold text-[#9E2B2B] pr-4">
                  <span>إلى حـ/ الصندوق</span>
                  <span className="font-numeric">2,000,000 (دائن)</span>
                </div>
              </div>

              <div className="rounded-xl bg-[#F3ECDC] border border-[#8B6B34]/30 p-4 flex flex-col gap-2">
                <div className="text-xs font-bold text-[#6F582C]">لێکدانەوەی فێرکاری</div>
                <p className="text-xs sm:text-sm text-[#2B2318] leading-relaxed">
                  ١. <strong>حـ/ الأثاث</strong> (موجود) زیاد بووە ← دەنووسرێت لە سەرەوە بە <strong>من حـ/</strong> (مدين).
                  <br />
                  ٢. <strong>حـ/ الصندوق</strong> (موجود) کەمی کردووە ← دەنووسرێت لە خوارەوە بە <strong>إلى حـ/</strong> (دائن).
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              soundFx.click();
              onClose();
            }}
            className="min-h-[46px] px-7 py-2 rounded-xl bg-[#D4A243] hover:bg-[#E2B55A] text-[#17120A] font-extrabold text-base cursor-pointer"
          >
            تێگەیشتم — ئامادەم بۆ یاری
          </button>
        </div>
      </div>
    </div>
  );
}
