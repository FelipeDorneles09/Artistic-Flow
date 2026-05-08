import { useState } from 'react';
import { Target, Pencil, Check, X } from 'lucide-react';
import { useOrderStore } from '@/store/orderStore';
import { usePricingStore } from '@/store/pricingStore';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FinancialGoalProps {
  from: Date | null;
  to: Date | null;
}

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

export function FinancialGoal({ from, to }: FinancialGoalProps) {
  const orders = useOrderStore((state) => state.orders);
  const { settings, updateSettings } = usePricingStore();

  const [editing, setEditing] = useState(false);
  const [goalInput, setGoalInput] = useState('');

  // Revenue received in the selected period (using deliveredAt, falls back to createdAt)
  const deliveredInPeriod = orders.filter((o) => {
    if (o.status !== 'delivered') return false;
    const d = o.deliveredAt
      ? (o.deliveredAt instanceof Date ? o.deliveredAt : new Date(o.deliveredAt))
      : (o.createdAt instanceof Date ? o.createdAt : new Date(o.createdAt));
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  });

  const revenue = deliveredInPeriod.reduce((sum, o) => sum + o.price, 0);
  const activeTotal = orders
    .filter((o) => o.status !== 'delivered')
    .reduce((sum, o) => sum + o.price, 0);

  const goal = settings.monthlyGoal || 0;
  const progressPct = goal > 0 ? Math.min((revenue / goal) * 100, 100) : 0;
  const remaining = Math.max(0, goal - revenue);
  const goalSet = goal > 0;

  const handleSaveGoal = async () => {
    const value = parseFloat(goalInput.replace(',', '.')) || 0;
    await updateSettings({ ...settings, monthlyGoal: value });
    setEditing(false);
  };

  const handleCancelEdit = () => {
    setGoalInput('');
    setEditing(false);
  };

  const startEditing = () => {
    setGoalInput(goal > 0 ? String(goal) : '');
    setEditing(true);
  };

  return (
    <div className="bg-card rounded-2xl p-5 shadow-soft">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-alert-ok/10 text-alert-ok">
            <Target className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-base leading-none">Meta do Período</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Receita vs. meta configurada</p>
          </div>
        </div>
        {!editing && (
          <button
            onClick={startEditing}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Goal editor */}
      {editing && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-muted-foreground shrink-0">R$</span>
          <Input
            autoFocus
            type="number"
            min="0"
            step="100"
            placeholder="Ex: 3000"
            value={goalInput}
            onChange={(e) => setGoalInput(e.target.value)}
            className="h-8 text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveGoal();
              if (e.key === 'Escape') handleCancelEdit();
            }}
          />
          <Button size="icon" className="h-8 w-8 shrink-0" onClick={handleSaveGoal}>
            <Check className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={handleCancelEdit}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {!goalSet && !editing ? (
        <div className="text-center py-3">
          <p className="text-sm text-muted-foreground mb-2">
            Defina uma meta para acompanhar seu progresso.
          </p>
          <button
            onClick={startEditing}
            className="text-sm text-primary font-medium hover:underline"
          >
            + Definir meta
          </button>
        </div>
      ) : goalSet ? (
        <div className="space-y-3">
          {/* Progress */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground text-xs">
                {fmt(revenue)} <span className="opacity-60">/ {fmt(goal)}</span>
              </span>
              <span className={cn('font-bold text-sm', progressPct >= 100 ? 'text-alert-ok' : 'text-foreground')}>
                {progressPct.toFixed(0)}%
              </span>
            </div>
            <Progress value={progressPct} className="h-2.5" />
            {progressPct >= 100 ? (
              <p className="text-xs text-alert-ok font-medium">🎉 Meta batida!</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Faltam <strong className="text-foreground">{fmt(remaining)}</strong>
              </p>
            )}
          </div>

          {/* Values */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="p-2.5 rounded-xl bg-alert-ok-bg">
              <p className="text-xs text-muted-foreground mb-0.5">Recebido</p>
              <p className="text-base font-bold text-alert-ok">{fmt(revenue)}</p>
              <p className="text-xs text-muted-foreground">{deliveredInPeriod.length} pedido{deliveredInPeriod.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-muted/60">
              <p className="text-xs text-muted-foreground mb-0.5">Em Produção</p>
              <p className="text-base font-bold text-foreground">{fmt(activeTotal)}</p>
              <p className="text-xs text-muted-foreground">a receber</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
