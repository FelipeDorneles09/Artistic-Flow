import { useState, useMemo, useEffect } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, LineChart as LineChartIcon } from 'lucide-react';
import { useOrderStore } from '@/store/orderStore';
import { useInventoryStore } from '@/store/inventoryStore';
import { usePricingStore } from '@/store/pricingStore';
import { fetchInventoryHistory, InventoryHistoryEntry } from '@/lib/inventoryHistoryApi';
import { cn } from '@/lib/utils';

interface FinancialSectionProps {
  from: Date | null;
  to: Date | null;
  periodDays: number;
}

function toLabel(d: Date) {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function toSortKey(d: Date) { return d.toISOString().slice(0, 10); }

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}
function fmtK(v: number) {
  return v >= 1000 ? `R$${(v / 1000).toFixed(1)}k` : `R$${v.toFixed(0)}`;
}

const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '0.75rem',
  fontSize: 12,
};

export function FinancialSection({ from, to, periodDays }: FinancialSectionProps) {
  const orders         = useOrderStore((state) => state.orders);
  const inventoryItems = useInventoryStore((state) => state.items);
  const { settings }   = usePricingStore();

  const [history, setHistory] = useState<InventoryHistoryEntry[]>([]);
  useEffect(() => { fetchInventoryHistory().then(setHistory); }, []);

  const costMap = useMemo(() => {
    const m: Record<string, number> = {};
    inventoryItems.forEach((i) => { m[i.id] = i.costPerUnit || 0; });
    return m;
  }, [inventoryItems]);

  // ── Profit calculations ─────────────────────────────────────────────────
  // Use deliveredAt as the reference date; fall back to createdAt for legacy orders
  const deliveredInPeriod = useMemo(() =>
    orders.filter((o) => {
      if (o.status !== 'delivered') return false;
      const d = o.deliveredAt
        ? (o.deliveredAt instanceof Date ? o.deliveredAt : new Date(o.deliveredAt))
        : (o.createdAt instanceof Date ? o.createdAt : new Date(o.createdAt));
      if (from && d < from) return false;
      if (to   && d > to)   return false;
      return true;
    }), [orders, from, to]);

  const outflowsInPeriod = useMemo(() =>
    history.filter((e) => {
      if (e.eventType !== 'order_deduction' && e.eventType !== 'manual_subtract') return false;
      if (from && e.createdAt < from) return false;
      if (to   && e.createdAt > to)   return false;
      return true;
    }), [history, from, to]);

  const revenue      = useMemo(() => deliveredInPeriod.reduce((s, o) => s + o.price, 0), [deliveredInPeriod]);
  const materialCost = useMemo(() => outflowsInPeriod.reduce((s, e) => s + Math.abs(e.delta) * (costMap[e.itemId] ?? 0), 0), [outflowsInPeriod, costMap]);
  const fixedCost    = (settings.monthlyFixedCosts || 0) * (periodDays / 30);
  const totalCost    = materialCost + fixedCost;
  const profit       = revenue - totalCost;
  const margin       = revenue > 0 ? (profit / revenue) * 100 : 0;
  const profitable   = profit >= 0;

  // ── Chart data ──────────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    const map: Record<string, { label: string; sortKey: string; receita: number; custos: number }> = {};
    const ensure = (d: Date) => {
      const sk = toSortKey(d);
      if (!map[sk]) map[sk] = { label: toLabel(d), sortKey: sk, receita: 0, custos: 0 };
    };
    deliveredInPeriod.forEach((o) => {
      const d = o.deliveredAt
        ? (o.deliveredAt instanceof Date ? o.deliveredAt : new Date(o.deliveredAt))
        : (o.createdAt instanceof Date ? o.createdAt : new Date(o.createdAt));
      ensure(d); map[toSortKey(d)].receita += o.price;
    });
    outflowsInPeriod.forEach((e) => {
      ensure(e.createdAt);
      map[toSortKey(e.createdAt)].custos += Math.abs(e.delta) * (costMap[e.itemId] ?? 0);
    });
    return Object.values(map).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [deliveredInPeriod, outflowsInPeriod, costMap]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border rounded-xl p-3 shadow text-xs space-y-1">
        <p className="font-semibold text-foreground mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }}>
            {p.name === 'receita' ? 'Receita' : 'Custo Insumos'}: <strong>{fmt(p.value)}</strong>
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-card rounded-2xl p-5 shadow-soft">
      {/* ── Header ── */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <LineChartIcon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-semibold text-lg leading-none">Financeiro</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Receita · Custos · Margem</p>
        </div>
      </div>

      {/* ── Body: stats left + chart right ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6 items-start">

        {/* Stats column */}
        <div className="space-y-2.5">
          {/* Margin badge */}
          <div className={cn(
            'flex items-center gap-2 rounded-xl px-3 py-2.5',
            profitable ? 'bg-emerald-500/10' : 'bg-red-500/10'
          )}>
            {profitable
              ? <TrendingUp className="h-5 w-5 text-emerald-600 shrink-0" />
              : <TrendingDown className="h-5 w-5 text-red-500 shrink-0" />}
            <div>
              <p className="text-xs text-muted-foreground">Margem Real</p>
              <p className={cn('text-xl font-bold', profitable ? 'text-emerald-700' : 'text-red-500')}>
                {margin.toFixed(1)}%
              </p>
            </div>
          </div>

          {[
            { label: 'Receita',       value: fmt(revenue),      color: 'text-emerald-700', sub: `${deliveredInPeriod.length} pedido${deliveredInPeriod.length !== 1 ? 's' : ''}` },
            { label: 'Lucro Real',    value: fmt(profit),       color: profitable ? 'text-emerald-700' : 'text-red-500' },
            { label: 'Custo Insumos', value: fmt(materialCost), color: 'text-orange-600',  sub: `${outflowsInPeriod.length} saída${outflowsInPeriod.length !== 1 ? 's' : ''}` },
            { label: `Custo Fixo (${periodDays}d)`, value: fmt(fixedCost), color: 'text-yellow-600', sub: `Base: ${fmt(settings.monthlyFixedCosts || 0)}/mês` },
          ].map((s) => (
            <div key={s.label} className="bg-muted/40 rounded-xl px-3 py-2">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={cn('text-sm font-bold', s.color)}>{s.value}</p>
              {s.sub && <p className="text-xs text-muted-foreground">{s.sub}</p>}
            </div>
          ))}

          {/* Cost bar */}
          {revenue > 0 && (() => {
            const materialPct = Math.min((materialCost / revenue) * 100, 100);
            const fixedPct    = Math.min((fixedCost / revenue) * 100, Math.max(0, 100 - materialPct));
            const profitPct   = Math.max(0, 100 - materialPct - fixedPct);
            return (
              <div>
                <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden flex">
                  <div className="h-full bg-orange-400 transition-all" style={{ width: `${materialPct}%` }} />
                  <div className="h-full bg-yellow-400 transition-all" style={{ width: `${fixedPct}%` }} />
                  <div className="h-full bg-emerald-500 transition-all" style={{ width: `${profitPct}%` }} />
                </div>
                <div className="flex gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-orange-400" />Insumos</span>
                  <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-yellow-400" />Fixos</span>
                  <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-emerald-500" />Lucro</span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Chart column */}
        {chartData.length === 0 ? (
          <div className="h-96 flex items-center justify-center text-muted-foreground text-sm">
            Nenhum dado no período.
          </div>
        ) : (
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false} tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false} tickLine={false}
                  tickFormatter={fmtK}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.3)' }} />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 6 }}
                  formatter={(v) => v === 'receita' ? 'Receita' : 'Custo Insumos'}
                />
                <Bar dataKey="custos" name="custos" fill="hsl(38,92%,72%)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Line dataKey="receita" name="receita" type="monotone" stroke="hsl(142,70%,45%)" strokeWidth={2} dot={{ r: 3, fill: 'hsl(142,70%,45%)' }} activeDot={{ r: 5 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
