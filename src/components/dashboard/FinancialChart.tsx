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
import { LineChart as LineChartIcon, CalendarDays, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useOrderStore } from '@/store/orderStore';
import { useInventoryStore } from '@/store/inventoryStore';
import { fetchInventoryHistory, InventoryHistoryEntry } from '@/lib/inventoryHistoryApi';
import { cn } from '@/lib/utils';

type QuickFilter = '7d' | '30d' | 'month' | '90d' | 'custom';

const QUICK_FILTERS: { key: QuickFilter; label: string }[] = [
  { key: '7d',    label: '7 dias' },
  { key: '30d',   label: '30 dias' },
  { key: 'month', label: 'Este mês' },
  { key: '90d',   label: '90 dias' },
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
function toKey(d: Date): string {
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
}
function fullKey(d: Date): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD for sorting
}

function fmtCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

interface DayData {
  label: string;
  sortKey: string;
  receita: number;
  custosInsumos: number;
}

const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '0.75rem',
  fontSize: 12,
};

export function FinancialChart() {
  const orders         = useOrderStore((state) => state.orders);
  const inventoryItems = useInventoryStore((state) => state.items);

  const [quickFilter, setQuickFilter] = useState<QuickFilter>('30d');
  const [fromInput, setFromInput]     = useState('');
  const [toInput, setToInput]         = useState('');
  const [history, setHistory]         = useState<InventoryHistoryEntry[]>([]);

  useEffect(() => {
    fetchInventoryHistory().then(setHistory);
  }, []);

  const { from, to } = useMemo(() => {
    const now = new Date();
    if (quickFilter === '7d')    return { from: daysAgo(6),         to: endOfDay(now) };
    if (quickFilter === '30d')   return { from: daysAgo(29),        to: endOfDay(now) };
    if (quickFilter === '90d')   return { from: daysAgo(89),        to: endOfDay(now) };
    if (quickFilter === 'month') return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOfDay(now) };
    if (quickFilter === 'custom')
      return {
        from: fromInput ? startOfDay(parseInput(fromInput)!) : null,
        to:   toInput   ? endOfDay(parseInput(toInput)!)     : null,
      };
    return { from: null, to: null };
  }, [quickFilter, fromInput, toInput]);

  const costMap = useMemo(() => {
    const m: Record<string, number> = {};
    inventoryItems.forEach((i) => { m[i.id] = i.costPerUnit || 0; });
    return m;
  }, [inventoryItems]);

  const chartData = useMemo((): DayData[] => {
    const map: Record<string, DayData> = {};

    const add = (date: Date) => {
      const sk = fullKey(date);
      if (!map[sk]) map[sk] = { label: toKey(date), sortKey: sk, receita: 0, custosInsumos: 0 };
    };

    // Delivered orders
    orders.forEach((o) => {
      if (o.status !== 'delivered') return;
      const d = o.createdAt instanceof Date ? o.createdAt : new Date(o.createdAt);
      if (from && d < from) return;
      if (to   && d > to)   return;
      add(d);
      map[fullKey(d)].receita += o.price;
    });

    // Inventory outflows
    history.forEach((e) => {
      if (e.eventType !== 'order_deduction' && e.eventType !== 'manual_subtract') return;
      if (from && e.createdAt < from) return;
      if (to   && e.createdAt > to)   return;
      add(e.createdAt);
      const cost = Math.abs(e.delta) * (costMap[e.itemId] ?? 0);
      map[fullKey(e.createdAt)].custosInsumos += cost;
    });

    return Object.values(map).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [orders, history, costMap, from, to]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border rounded-xl p-3 shadow text-xs space-y-1">
        <p className="font-semibold text-foreground mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }}>
            {p.name}: <strong>{fmtCurrency(p.value)}</strong>
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-card rounded-2xl p-5 shadow-soft">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <LineChartIcon className="h-5 w-5" />
        </div>
        <h3 className="font-semibold text-lg">Histórico Financeiro</h3>
      </div>

      {/* Filters */}
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

      {chartData.length === 0 ? (
        <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">
          Nenhum dado no período selecionado.
        </div>
      ) : (
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `R$${v >= 1000 ? `${(v/1000).toFixed(1)}k` : v}`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.3)' }} />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                formatter={(value) =>
                  value === 'receita' ? 'Receita (pedidos)' : 'Custo de Insumos'
                }
              />
              <Bar
                dataKey="custosInsumos"
                name="custosInsumos"
                fill="hsl(38, 92%, 75%)"
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
              />
              <Line
                dataKey="receita"
                name="receita"
                type="monotone"
                stroke="hsl(142, 70%, 45%)"
                strokeWidth={2}
                dot={{ r: 3, fill: 'hsl(142, 70%, 45%)' }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center mt-2">
        Linha = Receita de pedidos finalizados · Barras = Custo das saídas do estoque
      </p>
    </div>
  );
}
