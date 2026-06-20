import { useState, FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FinanceEntry, FinanceSubscription } from '@/types';
import { playCompletionFeedback } from '@/utils/audioUtils';
import { useLocalConfig } from '@/context/LocalConfigContext';
import { ConfirmDelete } from '@/components/ConfirmDelete/ConfirmDelete';

const FINANCE_COLORS: Record<string, string> = {
  Food: '#ff6384', Groceries: '#ff8c42', Transport: '#36a2eb', Shopping: '#ff9f40',
  Entertainment: '#9966ff', Health: '#4bc0c0', Housing: '#ffcd56',
  Utilities: '#c9cbcf', Gifts: '#f48fb1', Other: '#8ac926',
};
const CATEGORIES = Object.keys(FINANCE_COLORS);

function financeColor(cat: string) { return FINANCE_COLORS[cat] ?? '#aaaaaa'; }

function monthLabel(month: string) {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function addMonths(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ── Pie chart ─────────────────────────────────────────────────────────────────

function polarToXY(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function slicePath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const s = polarToXY(cx, cy, r, startDeg);
  const e = polarToXY(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)} Z`;
}

function PieChart({ totals, grandTotal, currencySymbol }: { totals: Record<string, number>; grandTotal: number; currencySymbol: string }) {
  const cx = 100, cy = 100, r = 88, hole = 52;
  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);

  return (
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      {grandTotal === 0 ? (
        <circle cx={cx} cy={cy} r={r} fill="var(--border)" />
      ) : sorted.length === 1 ? (
        <circle cx={cx} cy={cy} r={r} fill={financeColor(sorted[0][0])} />
      ) : (() => {
        let angle = 0;
        return sorted.map(([cat, amt]) => {
          const sweep = (amt / grandTotal) * 360;
          const path = slicePath(cx, cy, r, angle, angle + sweep);
          angle += sweep;
          return <path key={cat} d={path} fill={financeColor(cat)} />;
        });
      })()}
      <circle cx={cx} cy={cy} r={hole} fill="var(--surface)" />
      {grandTotal > 0 && (
        <>
          <text x={cx} y={cy - 5} textAnchor="middle" fontSize={14} fill="var(--text)" fontWeight={700} fontFamily="inherit">{currencySymbol}{grandTotal.toFixed(2)}</text>
          <text x={cx} y={cy + 13} textAnchor="middle" fontSize={10} fill="var(--text-muted)" fontFamily="inherit">total</text>
        </>
      )}
    </svg>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function Finance() {
  const qc = useQueryClient();
  const { currencySymbol } = useLocalConfig();
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const { data: entriesData, isLoading: entriesLoading } = useQuery<{ entries: FinanceEntry[] }>({
    queryKey: ['finance-entries', month],
    queryFn: () => fetch(`/finance/entries?month=${month}`).then(r => r.json()),
    refetchOnWindowFocus: false,
  });

  const { data: subsData, isLoading: subsLoading } = useQuery<{ subscriptions: FinanceSubscription[] }>({
    queryKey: ['finance-subscriptions'],
    queryFn: () => fetch('/finance/subscriptions').then(r => r.json()),
    staleTime: 5 * 60 * 1000,
  });

  const entries = entriesData?.entries ?? [];
  const subscriptions = subsData?.subscriptions ?? [];

  function isSubEntry(e: FinanceEntry) {
    return subscriptions.some(s => s.name === e.title && s.category === e.category && s.amount === e.amount);
  }

  const totals: Record<string, number> = {};
  let grandTotal = 0;
  entries.forEach(e => { totals[e.category] = (totals[e.category] ?? 0) + e.amount; grandTotal += e.amount; });
  const sortedTotals = Object.entries(totals).sort((a, b) => b[1] - a[1]);

  const manualEntries = entries.map((e, i) => ({ ...e, origIdx: i })).filter(e => !isSubEntry(e));
  const subTotal = subscriptions.reduce((s, sub) => s + sub.amount, 0);

  // Form state
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');
  const [formFeedback, setFormFeedback] = useState('');

  async function submitExpense(e: FormEvent) {
    e.preventDefault();
    setFormFeedback('');
    const res = await fetch('/finance/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: parseFloat(amount), category, title, month }),
    });
    const d = await res.json();
    if (res.ok) {
      playCompletionFeedback();
      qc.setQueryData<{ entries: FinanceEntry[] }>(['finance-entries', month], { entries: d.entries });
      setAmount(''); setTitle('');
    } else {
      setFormFeedback(d.error ?? 'Failed to add.');
    }
  }

  async function deleteEntry(index: number) {
    const res = await fetch('/finance/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month, index }),
    });
    if (res.ok) {
      const d = await res.json();
      qc.setQueryData<{ entries: FinanceEntry[] }>(['finance-entries', month], { entries: d.entries });
    }
  }

  return (
    <div className="tab-panel active" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="finance-month-nav">
        <button className="finance-month-btn" onClick={() => setMonth(m => addMonths(m, -1))}>‹</button>
        <span className="finance-month-label">{monthLabel(month)}</span>
        <button className="finance-month-btn" onClick={() => setMonth(m => addMonths(m, 1))}>›</button>
      </div>

      <div className="tasks-row finance-tasks-row" style={{ alignItems: 'stretch' }}>
        <div className="card" style={{ flex: 1.4, minWidth: 0 }}>
          <h2>Overview</h2>
          {entriesLoading
            ? <div className="empty-state"><span className="spinner" /></div>
            : (
              <>
                <div className="finance-chart-wrap">
                  <PieChart totals={totals} grandTotal={grandTotal} currencySymbol={currencySymbol} />
                </div>
                <div className="finance-legend">
                  {sortedTotals.map(([cat, amt]) => (
                    <div key={cat} className="finance-legend-row">
                      <span className="finance-legend-dot" style={{ background: financeColor(cat) }} />
                      <span className="finance-legend-cat">{cat}</span>
                      <span className="finance-legend-pct">{((amt / grandTotal) * 100).toFixed(1)}%</span>
                      <span className="finance-legend-amt">{currencySymbol}{amt.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </>
            )
          }
        </div>

        <div className="card" style={{ flex: 1, minWidth: 0 }}>
          <h2>Add Expense</h2>
          <form className="finance-form" onSubmit={submitExpense}>
            <div className="finance-amount-row">
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount" step="0.01" min="0.01" required />
              <select value={category} onChange={e => setCategory(e.target.value)} required>
                <option value="">Category</option>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="What did you spend on?" required autoComplete="off" />
            <button type="submit" className="finance-submit-btn" title="Add">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </button>
            <div className={`feedback${formFeedback ? ' err' : ''}`}>{formFeedback}</div>
          </form>
        </div>
      </div>

      <div className="card">
        <h2>Entries</h2>
        {entriesLoading
          ? <div className="empty-state"><span className="spinner" /></div>
          : manualEntries.length === 0
            ? <div className="empty-state">No entries this month.</div>
            : [...manualEntries].reverse().map(e => {
              const d = new Date(e.date + 'T12:00:00');
              const dateStr = d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
              return (
                <div key={e.origIdx} className="finance-entry-row">
                  <span className="finance-entry-dot" style={{ background: financeColor(e.category) }} />
                  <span className="finance-entry-date">{dateStr}</span>
                  <span className="finance-entry-cat">{e.category}</span>
                  <span className="finance-entry-title">{e.title}</span>
                  <span className="finance-entry-amt">{currencySymbol}{e.amount.toFixed(2)}</span>
                  <ConfirmDelete className="finance-delete-btn" onConfirm={() => deleteEntry(e.origIdx)} />
                </div>
              );
            })
        }
      </div>

      <div className="card">
        <div className="finance-subs-header">
          <h2>Subscriptions</h2>
          {subscriptions.length > 0 && <span className="finance-subs-total">{currencySymbol}{subTotal.toFixed(2)} / mo</span>}
        </div>
        {subsLoading
          ? <div className="empty-state"><span className="spinner" /></div>
          : subscriptions.length === 0
            ? <div className="empty-state">No subscriptions configured.</div>
            : subscriptions.map((sub, i) => (
              <div key={i} className="finance-sub-row">
                <span className="finance-entry-dot" style={{ background: financeColor(sub.category) }} />
                <span className="finance-sub-day">Day {sub.day}</span>
                <span className="finance-sub-cat">{sub.category}</span>
                <span className="finance-sub-name">{sub.name}</span>
                <span className="finance-entry-amt">{currencySymbol}{sub.amount.toFixed(2)}</span>
              </div>
            ))
        }
      </div>
    </div>
  );
}
