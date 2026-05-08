import { useMemo, useState } from 'react';
import { DeadlineRadar } from '@/components/dashboard/DeadlineRadar';
import { FinancialGoal } from '@/components/dashboard/FinancialGoal';
import { UpcomingDeliveries } from '@/components/dashboard/UpcomingDeliveries';
import { FinancialSection } from '@/components/dashboard/FinancialSection';
import { PendingRevenue } from '@/components/dashboard/PendingRevenue';
import { LowStockWidget } from '@/components/dashboard/LowStockWidget';
import { useOrderStore } from '@/store/orderStore';
import { Sparkles, CalendarDays, X, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { fetchInventoryHistory } from '@/lib/inventoryHistoryApi';
import { usePricingStore } from '@/store/pricingStore';
import { useInventoryStore } from '@/store/inventoryStore';
import { useToast } from '@/hooks/use-toast';

// ─── Period helpers ────────────────────────────────────────────────────────
type QuickFilter = '7d' | '30d' | 'month' | '90d' | 'custom';

const QUICK_FILTERS: { key: QuickFilter; label: string }[] = [
  { key: '7d',    label: '7 dias' },
  { key: '30d',   label: '30 dias' },
  { key: 'month', label: 'Este mês' },
  { key: '90d',   label: '90 dias' },
  { key: 'custom', label: 'Período' },
];

function startOfDay(d: Date) { const c = new Date(d); c.setHours(0, 0, 0, 0); return c; }
function endOfDay(d: Date)   { const c = new Date(d); c.setHours(23, 59, 59, 999); return c; }
function daysAgo(n: number)  { const d = new Date(); d.setDate(d.getDate() - n); return startOfDay(d); }
function parseInput(v: string): Date | null {
  if (!v) return null;
  const [y, m, d] = v.split('-').map(Number);
  return new Date(y, m - 1, d);
}
// ──────────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const orders = useOrderStore((state) => state.orders);

  // ── Universal period filter state ──────────────────────────────────────
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('30d');
  const [fromInput, setFromInput] = useState('');
  const [toInput, setToInput]     = useState('');

  const { from, to } = useMemo(() => {
    const now = new Date();
    if (quickFilter === '7d')    return { from: daysAgo(6),  to: endOfDay(now) };
    if (quickFilter === '30d')   return { from: daysAgo(29), to: endOfDay(now) };
    if (quickFilter === '90d')   return { from: daysAgo(89), to: endOfDay(now) };
    if (quickFilter === 'month') return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOfDay(now) };
    if (quickFilter === 'custom')
      return {
        from: fromInput ? startOfDay(parseInput(fromInput)!) : null,
        to:   toInput   ? endOfDay(parseInput(toInput)!)     : null,
      };
    return { from: null, to: null };
  }, [quickFilter, fromInput, toInput]);

  const periodDays = useMemo(() => {
    if (!from || !to) return 30;
    return Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000) + 1);
  }, [from, to]);

  // ── Quick stats ────────────────────────────────────────────────────────
  // "Finalizados" now shows delivered in the SELECTED PERIOD (using deliveredAt)
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

  const stats = useMemo(() => [
    { label: 'A Comprar',   count: orders.filter((o) => o.status === 'to_buy').length,    color: 'bg-alert-warning' },
    { label: 'Em Produção', count: orders.filter((o) => o.status === 'production').length, color: 'bg-primary' },
    { label: 'Acabamento',  count: orders.filter((o) => o.status === 'finishing').length,  color: 'bg-accent-foreground' },
    { label: 'Prontos',     count: orders.filter((o) => o.status === 'ready').length,      color: 'bg-alert-ok' },
    { label: 'Entregues',   count: deliveredInPeriod.length,                               color: 'bg-emerald-500', period: true },
  ], [orders, deliveredInPeriod]);

  const { settings } = usePricingStore();
  const inventoryItems = useInventoryStore((state) => state.items);
  const { toast } = useToast();

  const exportFinancialData = async () => {
    const history = await fetchInventoryHistory();
    const costMap: Record<string, number> = {};
    inventoryItems.forEach((i) => { costMap[i.id] = i.costPerUnit || 0; });

    let csvContent = "Data;Tipo;Descrição;Valor;Detalhes\n";

    // 1. Receitas (Pedidos Entregues)
    deliveredInPeriod.forEach(o => {
      const date = o.deliveredAt
        ? (o.deliveredAt instanceof Date ? o.deliveredAt : new Date(o.deliveredAt))
        : (o.createdAt instanceof Date ? o.createdAt : new Date(o.createdAt));
      
      const dateStr = date.toLocaleDateString('pt-BR');
      const desc = `"${o.clientName} - ${o.productDescription.replace(/"/g, '""')}"`;
      const value = o.price.toString().replace('.', ',');
      
      csvContent += `${dateStr};Receita;${desc};${value};Pedido Finalizado\n`;
    });

    // 2. Custos de Materiais
    const outflows = history.filter((e) => {
      if (e.eventType !== 'order_deduction' && e.eventType !== 'manual_subtract') return false;
      if (from && e.createdAt < from) return false;
      if (to   && e.createdAt > to)   return false;
      return true;
    });

    outflows.forEach(e => {
      const dateStr = e.createdAt.toLocaleDateString('pt-BR');
      const desc = `"${e.itemName.replace(/"/g, '""')}"`;
      const cost = costMap[e.itemId] ?? 0;
      const totalCost = (Math.abs(e.delta) * cost).toString().replace('.', ',');
      const details = `"Consumo: ${Math.abs(e.delta)} ${e.note ? ' - ' + e.note.replace(/"/g, '""') : ''}"`;
      
      csvContent += `${dateStr};Custo (Material);${desc};${totalCost};${details}\n`;
    });

    // 3. Custos Fixos (Proporcionais)
    if (settings.monthlyFixedCosts > 0) {
      const fixedCost = (settings.monthlyFixedCosts || 0) * (periodDays / 30);
      const dateStr = new Date().toLocaleDateString('pt-BR');
      const value = fixedCost.toFixed(2).replace('.', ',');
      csvContent += `${dateStr};Custo Fixo;Gastos Fixos do Período;${value};Rateio mensal (${periodDays} dias)\n`;
    }

    const blob = new Blob(["\ufeff", csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `financeiro-artflow-${quickFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Relatório Financeiro Exportado!',
      description: 'O arquivo detalhado foi salvo.',
    });
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Sparkles className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Visão Geral</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Acompanhe seus pedidos e mantenha tudo sob controle.
          </p>
        </div>

        {/* ── Universal Period Filter ─────────────────────────────────── */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap gap-1.5">
            {QUICK_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setQuickFilter(f.key)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
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
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                type="date"
                value={fromInput}
                onChange={(e) => setFromInput(e.target.value)}
                className="h-7 text-xs w-32"
              />
              <span className="text-xs text-muted-foreground">até</span>
              <Input
                type="date"
                value={toInput}
                onChange={(e) => setToInput(e.target.value)}
                className="h-7 text-xs w-32"
              />
              {(fromInput || toInput) && (
                <button
                  onClick={() => { setFromInput(''); setToInput(''); }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        <Button
          variant="outline"
          onClick={exportFinancialData}
          className="gap-2 shrink-0 border-primary/20 hover:bg-primary/5"
        >
          <Download className="h-4 w-4" />
          Exportar
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 mb-6">
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            className="bg-card rounded-xl p-4 shadow-soft animate-fade-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <div className={`h-2 w-2 rounded-full ${stat.color}`} />
            </div>
            <p className="text-3xl font-bold text-foreground mt-1">{stat.count}</p>
            {stat.period && (
              <p className="text-xs text-muted-foreground mt-0.5">no período</p>
            )}
          </div>
        ))}
      </div>

      {/* ── Low Stock Alert (conditional) ─────────────────────────────── */}
      <div className="mb-6">
        <LowStockWidget />
      </div>

      {/* Financial section + Goal side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 mb-6">
        <FinancialSection from={from} to={to} periodDays={periodDays} />
        <FinancialGoal from={from} to={to} />
      </div>

      {/* Bottom row: Radar · Pending Revenue · Upcoming */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <DeadlineRadar />
        <PendingRevenue />
        <div className="md:col-span-2 lg:col-span-1">
          <UpcomingDeliveries />
        </div>
      </div>
    </div>
  );
}
