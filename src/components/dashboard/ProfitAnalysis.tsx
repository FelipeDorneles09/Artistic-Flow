import { useState, useMemo, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, CalendarDays, X, Package, Wrench } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useOrderStore } from '@/store/orderStore';
import { useInventoryStore } from '@/store/inventoryStore';
import { usePricingStore } from '@/store/pricingStore';
import { fetchInventoryHistory, InventoryHistoryEntry } from '@/lib/inventoryHistoryApi';
import { cn } from '@/lib/utils';

type QuickFilter = 'today' | '7d' | '30d' | 'month' | 'custom';

const QUICK_FILTERS: { key: QuickFilter; label: string }[] = [
  { key: 'today', label: 'Hoje' },
  { key: '7d',    label: '7 dias' },
  { key: '30d',   label: '30 dias' },
  { key: 'month', label: 'Este mês' },
  { key: 'custom',label: 'Período' },
];

function startOfDay(d: Date) { const c = new Date(d); c.setHours(0,0,0,0); return c; }
function endOfDay(d: Date)   { const c = new Date(d); c.setHours(23,59,59,999); return c; }
function daysAgo(n: number)  { const d = new Date(); d.setDate(d.getDate()-n); return startOfDay(d); }
function parseInput(v: string): Date | null {
  if (!v) return null;
  const [y,m,d] = v.split('-').map(Number);
  return new Date(y, m-1, d);
}

function fmt(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function pct(value: number) {
  return `${value.toFixed(1)}%`;
}

export function ProfitAnalysis() {
  const orders        = useOrderStore((state) => state.orders);
  const inventoryItems = useInventoryStore((state) => state.items);
  const { settings }  = usePricingStore();

  const [quickFilter, setQuickFilter] = useState<QuickFilter>('30d');
  const [fromInput, setFromInput] = useState('');
  const [toInput, setToInput]     = useState('');
  const [historyEntries, setHistoryEntries] = useState<InventoryHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Load all history once
  useEffect(() => {
    fetchInventoryHistory()
      .then(setHistoryEntries)
      .finally(() => setLoadingHistory(false));
  }, []);

  // Compute active date window
  const { from, to } = useMemo(() => {
    const now = new Date();
    if (quickFilter === 'today')  return { from: startOfDay(now),   to: endOfDay(now) };
    if (quickFilter === '7d')     return { from: daysAgo(6),         to: endOfDay(now) };
    if (quickFilter === '30d')    return { from: daysAgo(29),        to: endOfDay(now) };
    if (quickFilter === 'month')  return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOfDay(now) };
    if (quickFilter === 'custom') {
      return {
        from: fromInput ? startOfDay(parseInput(fromInput)!) : null,
        to:   toInput   ? endOfDay(parseInput(toInput)!)     : null,
      };
    }
    return { from: null, to: null };
  }, [quickFilter, fromInput, toInput]);

  // Days in the selected period (for fixed cost proration)
  const periodDays = useMemo(() => {
    if (!from || !to) return 30;
    return Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000) + 1);
  }, [from, to]);

  // Delivered orders in period
  const deliveredInPeriod = useMemo(() => {
    return orders.filter((o) => {
      if (o.status !== 'delivered') return false;
      const d = o.createdAt instanceof Date ? o.createdAt : new Date(o.createdAt);
      if (from && d < from) return false;
      if (to   && d > to)   return false;
      return true;
    });
  }, [orders, from, to]);

  // Inventory outflows (order_deduction + manual_subtract) in period
  const outflowsInPeriod = useMemo(() => {
    return historyEntries.filter((e) => {
      if (e.eventType !== 'order_deduction' && e.eventType !== 'manual_subtract') return false;
      if (from && e.createdAt < from) return false;
      if (to   && e.createdAt > to)   return false;
      return true;
    });
  }, [historyEntries, from, to]);

  // Build a cost lookup map: itemId → costPerUnit
  const costMap = useMemo(() => {
    const m: Record<string, number> = {};
    inventoryItems.forEach((item) => { m[item.id] = item.costPerUnit || 0; });
    return m;
  }, [inventoryItems]);

  // Calculate numbers
  const revenue = useMemo(
    () => deliveredInPeriod.reduce((s, o) => s + o.price, 0),
    [deliveredInPeriod]
  );

  const materialCost = useMemo(
    () => outflowsInPeriod.reduce((s, e) => {
      const unitCost = costMap[e.itemId] ?? 0;
      return s + Math.abs(e.delta) * unitCost;
    }, 0),
    [outflowsInPeriod, costMap]
  );

  const fixedCostProrated = (settings.monthlyFixedCosts || 0) * (periodDays / 30);
  const totalCost  = materialCost + fixedCostProrated;
  const profit     = revenue - totalCost;
  const margin     = revenue > 0 ? (profit / revenue) * 100 : 0;
  const isProfitable = profit >= 0;

  const StatCard = ({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) => (
    <div className="bg-muted/40 rounded-xl p-3 flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn('text-lg font-bold', color)}>{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );

  return (
    <div className="bg-card rounded-2xl p-5 shadow-soft">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {isProfitable
            ? <TrendingUp className="h-5 w-5 text-emerald-600" />
            : <TrendingDown className="h-5 w-5 text-red-500" />}
          <h2 className="font-semibold text-foreground">Margem Real de Lucro</h2>
        </div>
        <div className={cn(
          'text-sm font-bold px-3 py-1 rounded-full',
          isProfitable ? 'bg-emerald-500/10 text-emerald-700' : 'bg-red-500/10 text-red-600'
        )}>
          {pct(margin)}
        </div>
      </div>

      {/* Period filters */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {QUICK_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setQuickFilter(f.key)}
            className={cn(
              'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
              quickFilter === f.key
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Custom date inputs */}
      {quickFilter === 'custom' && (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input type="date" value={fromInput} onChange={(e) => setFromInput(e.target.value)} className="h-7 text-xs w-32" />
          <span className="text-xs text-muted-foreground">até</span>
          <Input type="date" value={toInput}   onChange={(e) => setToInput(e.target.value)}   className="h-7 text-xs w-32" />
          {(fromInput || toInput) && (
            <button onClick={() => { setFromInput(''); setToInput(''); }} className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Stats grid */}
      {loadingHistory ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Carregando dados...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <StatCard
              label="Receita"
              value={fmt(revenue)}
              sub={`${deliveredInPeriod.length} pedido${deliveredInPeriod.length !== 1 ? 's' : ''} entregue${deliveredInPeriod.length !== 1 ? 's' : ''}`}
              color="text-emerald-700"
            />
            <StatCard
              label="Lucro Real"
              value={fmt(profit)}
              sub={revenue > 0 ? pct(margin) + ' de margem' : '—'}
              color={isProfitable ? 'text-emerald-700' : 'text-red-500'}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <StatCard
              label="Custo: Insumos (saídas)"
              value={fmt(materialCost)}
              sub={`${outflowsInPeriod.length} saída${outflowsInPeriod.length !== 1 ? 's' : ''} do estoque`}
              color="text-orange-600"
            />
            <StatCard
              label={`Custo Fixo (${periodDays}d)`}
              value={fmt(fixedCostProrated)}
              sub={`Base: ${fmt(settings.monthlyFixedCosts || 0)}/mês`}
              color="text-orange-600"
            />
          </div>

          {/* Cost bar */}
          {revenue > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Composição da Receita</span>
                <span>{fmt(totalCost)} em custos</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden flex">
                <div
                  className="h-full bg-orange-400 transition-all"
                  style={{ width: `${Math.min((materialCost / revenue) * 100, 100)}%` }}
                  title={`Insumos: ${fmt(materialCost)}`}
                />
                <div
                  className="h-full bg-yellow-400 transition-all"
                  style={{ width: `${Math.min((fixedCostProrated / revenue) * 100, 100 - (materialCost / revenue) * 100)}%` }}
                  title={`Custo Fixo: ${fmt(fixedCostProrated)}`}
                />
              </div>
              <div className="flex gap-3 mt-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-orange-400" />Insumos</span>
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-yellow-400" />Fixos</span>
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-emerald-500" />Lucro</span>
              </div>
            </div>
          )}

          {revenue === 0 && (
            <p className="text-xs text-muted-foreground text-center mt-3 py-2">
              Nenhum pedido finalizado no período selecionado.
            </p>
          )}
        </>
      )}
    </div>
  );
}
