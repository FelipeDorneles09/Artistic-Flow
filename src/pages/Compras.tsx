import { useState } from 'react';
import { ShoppingBag, Copy, Check, CheckCircle2, Package, AlertCircle, Download } from 'lucide-react';
import { useOrderStore } from '@/store/orderStore';
import { useInventoryStore } from '@/store/inventoryStore';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface MaterialDeficit {
  id: string;
  name: string;
  quantityStr: string;
  deficitQuantity: number;
  relatedOrders: string[];
  type: 'real' | 'projected' | 'below_min';
  currentQty?: number;
  minQty?: number;
}

/** Returns the correct singular/plural label for a unit of measurement */
function pluralUnit(qty: number, unit: string): string {
  const abs = Math.abs(qty);
  const isSingular = abs === 1;
  const pluralMap: Record<string, string> = {
    unidade:  isSingular ? 'unidade'  : 'unidades',
    metro:    isSingular ? 'metro'    : 'metros',
    grama:    isSingular ? 'grama'    : 'gramas',
    litro:    isSingular ? 'litro'    : 'litros',
    outro:    isSingular ? 'outro'    : 'outros',
    // invariable units
    cm: 'cm',
    kg: 'kg',
    ml: 'ml',
  };
  return pluralMap[unit] ?? unit;
}

export default function Compras() {
  const { toast } = useToast();
  const orders = useOrderStore((state) => state.orders).filter(o => o.status !== 'delivered');
  const { items: inventoryItems, updateItem } = useInventoryStore();

  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const inventoryDeficits: MaterialDeficit[] = [];

  // Calculate reserved based on to_buy orders
  const reservedMap: Record<string, { qty: number, orders: Set<string> }> = {};
  const toBuyOrders = orders.filter(o => o.status === 'to_buy');

  toBuyOrders.forEach(order => {
    order.materials?.forEach(mat => {
      const requiredQty = parseFloat(mat.quantity) || 1;
      const alreadyDeducted = order.deductedMaterials?.[mat.id] || 0;
      const effectivelyReserved = Math.max(0, requiredQty - alreadyDeducted);
      
      if (effectivelyReserved > 0) {
        if (!reservedMap[mat.id]) {
          reservedMap[mat.id] = { qty: 0, orders: new Set() };
        }
        reservedMap[mat.id].qty += effectivelyReserved;
        reservedMap[mat.id].orders.add(order.clientName);
      }
    });
  });

  inventoryItems.forEach(item => {
    const reservedInfo = reservedMap[item.id];
    const reservedQty = reservedInfo ? reservedInfo.qty : 0;
    const available = item.quantity;
    const projectedSaldo = available - reservedQty;

    // We have a deficit if the projected saldo is less than 0
    if (projectedSaldo < 0) {
      const type = available < 0 ? 'real' : 'projected';
      // If available is < 0, they already owe stock. We add what they already owe to what they will owe.
      // E.g. available = -2. reserved = 3. projectedSaldo = -5. deficit = 5.
      // If available = 1. reserved = 3. projectedSaldo = -2. deficit = 2.
      const deficitAmount = Math.abs(projectedSaldo);

      // Now we also want to display which orders caused the negative balance
      // For real deficits, they might have come from orders in production too. 
      // Let's gather all active orders that use this item to be safe.
      const allActiveRelated = new Set<string>();
      orders.forEach(o => {
        if (o.materials?.some(m => m.id === item.id)) {
          allActiveRelated.add(o.clientName);
        }
      });

      const ordersArray = type === 'projected' && reservedInfo
        ? Array.from(reservedInfo.orders)
        : Array.from(allActiveRelated);

      inventoryDeficits.push({
        id: item.id,
        name: item.name,
        quantityStr: `${deficitAmount} ${pluralUnit(deficitAmount, item.unit)}`,
        deficitQuantity: deficitAmount,
        relatedOrders: ordersArray,
        type,
      });
    }
  });

  // Also include items below their minimum quantity (not already listed as deficit)
  const alreadyListedIds = new Set(inventoryDeficits.map(d => d.id));
  inventoryItems.forEach(item => {
    if (alreadyListedIds.has(item.id)) return; // already in list
    const min = item.minQuantity ?? 0;
    if (min > 0 && item.quantity < min) {
      const needed = min - item.quantity;
      inventoryDeficits.push({
        id: item.id,
        name: item.name,
        quantityStr: `${needed.toFixed(2).replace(/\.?0+$/, '')} ${pluralUnit(needed, item.unit)}`,
        deficitQuantity: needed,
        relatedOrders: [],
        type: 'below_min',
        currentQty: item.quantity,
        minQty: min,
      });
    }
  });

  const allToBuy = inventoryDeficits;

  const handleCheckout = async () => {
    if (checkedItems.size === 0) return;
    setIsProcessing(true);
    let updatedCount = 0;

    try {
      const selectedDeficits = inventoryDeficits.filter(d => checkedItems.has(d.id));
      for (const itemToUpdate of selectedDeficits) {
        const invItem = inventoryItems.find(i => i.id === itemToUpdate.id);
        if (invItem) {
          if (itemToUpdate.type === 'below_min') {
            // Bring stock up to minQuantity
            await updateItem(invItem.id, { quantity: invItem.quantity + itemToUpdate.deficitQuantity });
          } else {
            // Normalize negative balance
            await updateItem(invItem.id, { quantity: invItem.quantity + itemToUpdate.deficitQuantity });
          }
          updatedCount++;
        }
      }

      if (updatedCount > 0) {
        toast({ title: 'Estoque repostos', description: `${updatedCount} insumo(s) teve o saldo normalizado no estoque.` });
      }

      setCheckedItems(new Set());
    } catch (error) {
      toast({ title: 'Erro', description: 'Ocorreu um erro ao atualizar o inventário', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleItem = (id: string) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(id)) {
      newChecked.delete(id);
    } else {
      newChecked.add(id);
    }
    setCheckedItems(newChecked);
  };

  const copyList = () => {
    const list = allToBuy
      .filter((item) => !checkedItems.has(item.id))
      .map((item) => {
        const orderInfo = item.relatedOrders.length > 0 ? ` (${item.relatedOrders.join(', ')})` : '';
        return `- Produto ${item.name}: ${item.quantityStr}${orderInfo}`;
      })
      .join('\n');

    navigator.clipboard.writeText(list);
    setCopied(true);
    toast({
      title: 'Lista copiada!',
      description: 'Cole no WhatsApp ou onde preferir.',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const exportToCSV = () => {
    const itemsToExport = allToBuy.filter((item) => !checkedItems.has(item.id));
    if (itemsToExport.length === 0) return;

    // No Brasil, o Excel usa ponto e vírgula como separador padrão em vez de vírgula
    let csvContent = "Produto;Quantidade;Motivo / Pedidos\n";

    itemsToExport.forEach(item => {
      const name = `"${item.name.replace(/"/g, '""')}"`;
      const qty = `"${item.quantityStr.replace(/"/g, '""')}"`;
      const orders = `"${item.relatedOrders.join(', ').replace(/"/g, '""')}"`;
      
      csvContent += `${name};${qty};${orders}\n`;
    });

    const blob = new Blob(["\ufeff", csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "lista-de-compras.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Planilha exportada!',
      description: 'O arquivo foi salvo no seu dispositivo.',
    });
  };

  const checkedCount = checkedItems.size;
  const totalCount = allToBuy.length;

  return (
    <div className="max-w-3xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <ShoppingBag className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Lista de Compras</h1>
          </div>
          <p className="text-muted-foreground">
            Materiais em falta no seu estoque.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          {checkedCount > 0 && (
            <Button
              onClick={handleCheckout}
              disabled={isProcessing}
              className="gap-2 shrink-0 bg-alert-ok hover:bg-alert-ok/90 text-white"
            >
              <CheckCircle2 className="h-4 w-4" />
              Adicionar ao Estoque ({checkedCount})
            </Button>
          )}
          <Button
            onClick={copyList}
            variant="outline"
            className="gap-2 shrink-0"
            disabled={allToBuy.length === 0}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-alert-ok" />
                Copiado!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copiar Lista
              </>
            )}
          </Button>
          <Button
            onClick={exportToCSV}
            variant="outline"
            className="gap-2 shrink-0"
            disabled={allToBuy.length === 0}
          >
            <Download className="h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Progress */}
      {totalCount > 0 && (
        <div className="bg-card rounded-xl p-4 shadow-soft mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Progresso do dia</span>
            <span className="text-sm font-medium">
              {checkedCount} de {totalCount} itens no carrinho
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-alert-ok transition-all duration-300"
              style={{ width: `${(checkedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Materials List */}
      {allToBuy.length === 0 ? (
        <div className="bg-card rounded-2xl p-12 shadow-soft text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-alert-ok-bg mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-alert-ok" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Tudo comprado e estoque ok!
          </h3>
          <p className="text-muted-foreground">
            Não há materiais em déficit no momento.
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl shadow-soft overflow-hidden">
          <div className="divide-y divide-border">
            {allToBuy.map((item) => {
              const isChecked = checkedItems.has(item.id);
              return (
                <div
                  key={item.id}
                  className={cn(
                    'flex items-center gap-4 p-4 transition-all cursor-pointer hover:bg-muted/50',
                    isChecked && 'bg-alert-ok-bg/50'
                  )}
                  onClick={() => toggleItem(item.id)}
                >
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={() => toggleItem(item.id)}
                    className="h-5 w-5 pointer-events-none"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p
                        className={cn(
                          'font-medium transition-all',
                          isChecked && 'line-through text-muted-foreground'
                        )}
                      >
                        {item.name}
                      </p>
                      <Badge
                        variant={item.type === 'real' ? 'destructive' : 'secondary'}
                        className={cn(
                          "text-xs shrink-0",
                          item.type === 'projected' && "bg-yellow-500/20 text-yellow-700 hover:bg-yellow-500/30 border-none",
                          item.type === 'below_min' && "bg-emerald-500/20 text-emerald-700 hover:bg-emerald-500/30 border-none",
                        )}
                      >
                        {item.type === 'real' ? 'DÉFICIT REAL' : item.type === 'projected' ? 'FALTARÁ' : 'ESTOQUE BAIXO'}
                      </Badge>
                      <span className="text-sm font-bold ml-1">{item.quantityStr}</span>
                    </div>
                    {item.type === 'below_min' && item.currentQty !== undefined && item.minQty !== undefined && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <span className="text-emerald-600 font-medium">Atual: {item.currentQty}</span>
                        <span>·</span>
                        <span>Mínimo: {item.minQty}</span>
                        <span>·</span>
                        <span className="font-semibold">Comprar: {item.quantityStr}</span>
                      </div>
                    )}
                    {item.relatedOrders.length > 0 && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <Package className="h-3.5 w-3.5" />
                        <span className="truncate">Repor para:</span>
                        <span>{item.relatedOrders.join(', ')}</span>
                      </div>
                    )}
                    {item.relatedOrders.length === 0 && (
                      <div className="flex items-center gap-2 text-sm text-destructive mt-1">
                        <AlertCircle className="h-3.5 w-3.5" />
                        <span>Estoque geral em falta</span>
                      </div>
                    )}
                  </div>
                  {isChecked && (
                    <CheckCircle2 className="h-5 w-5 text-alert-ok animate-fade-in shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
