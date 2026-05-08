import { useState } from 'react';
import { useInventoryStore } from '@/store/inventoryStore';
import { useOrderStore } from '@/store/orderStore';
import { Package, Plus, Trash2, Edit2, AlertTriangle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipProvider,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { UnitMeasurment } from '@/types/inventory';
import { useToast } from '@/hooks/use-toast';
import { InventoryHistoryDialog } from '@/components/InventoryHistoryDialog';
import { cn } from '@/lib/utils';

export default function Estoque() {
  const { items, addItem, updateItem, deleteItem } = useInventoryStore();
  const orders = useOrderStore((state) => state.orders);
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [quantityMode, setQuantityMode] = useState<'add' | 'subtract' | 'set'>('set');

  // Calculate reserved stock
  const reservedMap: Record<string, number> = {};
  const toBuyOrders = orders.filter(o => o.status === 'to_buy');
  toBuyOrders.forEach(order => {
    order.materials?.forEach(mat => {
      const requiredQty = parseFloat(mat.quantity) || 1;
      const alreadyDeducted = order.deductedMaterials?.[mat.id] || 0;
      const effectivelyReserved = Math.max(0, requiredQty - alreadyDeducted);
      if (effectivelyReserved > 0) {
        reservedMap[mat.id] = (reservedMap[mat.id] || 0) + effectivelyReserved;
      }
    });
  });

  const [formData, setFormData] = useState({
    name: '',
    quantity: '',
    unit: 'unidade' as UnitMeasurment,
    costPerUnit: '',
    minQuantity: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let finalQty = parseFloat(formData.quantity) || 0;

      if (editingId) {
        const currentItem = items.find(i => i.id === editingId);
        if (currentItem) {
          if (formData.quantity === '') {
            finalQty = currentItem.quantity;
          } else if (quantityMode === 'add') {
            finalQty = currentItem.quantity + finalQty;
          } else if (quantityMode === 'subtract') {
            finalQty = currentItem.quantity - finalQty;
          }
        }
      }

      const minQtyValue = formData.minQuantity !== ''
        ? parseFloat(formData.minQuantity) || 0
        : undefined;

      const payload = {
        name: formData.name,
        quantity: finalQty,
        unit: formData.unit,
        costPerUnit: parseFloat(formData.costPerUnit) || 0,
        ...(minQtyValue !== undefined ? { minQuantity: minQtyValue } : {}),
      };

      if (editingId) {
        const modeLabel = quantityMode === 'add' ? 'Entrada manual' : quantityMode === 'subtract' ? 'Saída manual' : 'Ajuste manual';
        const note = formData.quantity === '' ? 'Edição sem alteração de quantidade' : modeLabel;
        await updateItem(editingId, payload, note);
        toast({ title: 'Item atualizado com sucesso!' });
      } else {
        await addItem(payload);
        toast({ title: 'Item adicionado ao estoque!' });
      }
      setIsOpen(false);
      resetForm();
    } catch (error) {
      toast({ title: 'Erro ao salvar', variant: 'destructive' });
    }
  };

  const exportToCSV = () => {
    if (items.length === 0) return;

    // Cabeçalho compatível com Excel (Português/Brasil usa ;)
    let csvContent = "Material;Quantidade;Unidade;Custo Unit.;Mínimo;Status\n";

    items.forEach(item => {
      const name = `"${item.name.replace(/"/g, '""')}"`;
      const qty = item.quantity.toString().replace('.', ',');
      const unit = `"${item.unit}"`;
      const cost = item.costPerUnit.toString().replace('.', ',');
      const min = (item.minQuantity || 0).toString().replace('.', ',');
      const status = item.quantity <= (item.minQuantity || 0) ? "Baixo" : "Normal";
      
      csvContent += `${name};${qty};${unit};${cost};${min};${status}\n`;
    });

    const blob = new Blob(["\ufeff", csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "estoque-artflow.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Estoque exportado!',
      description: 'O arquivo .csv foi salvo.',
    });
  };

  const editItem = (item: any) => {
    setFormData({
      name: item.name,
      quantity: '',
      unit: item.unit,
      costPerUnit: String(item.costPerUnit),
      minQuantity: item.minQuantity !== undefined ? String(item.minQuantity) : '',
    });
    setQuantityMode('add');
    setEditingId(item.id);
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir?')) {
      await deleteItem(id);
      toast({ title: 'Item apagado!' });
    }
  };

  const resetForm = () => {
    setFormData({ name: '', quantity: '', unit: 'unidade', costPerUnit: '', minQuantity: '' });
    setQuantityMode('set');
    setEditingId(null);
  };

  // Items with low stock alert
  const lowStockItems = items.filter(item => {
    if (item.minQuantity === undefined || item.minQuantity <= 0) return false;
    const reserved = reservedMap[item.id] || 0;
    const disponivel = item.quantity - reserved;
    return disponivel < item.minQuantity;
  });

  return (
    <TooltipProvider>
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Package className="h-6 w-6 text-primary" />
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Gestão de Estoque</h1>
          </div>
          <p className="text-muted-foreground text-sm md:text-base">
            Controle seus materiais e insumos para produção.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <InventoryHistoryDialog className="w-full md:w-auto" />
          <Button
            variant="outline"
            onClick={exportToCSV}
            className="gap-2 w-full md:w-auto"
          >
            <Download className="h-4 w-4" />
            Exportar
          </Button>
          <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2 w-full md:w-auto">
              <Plus className="h-4 w-4" /> Novo Insumo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar Insumo' : 'Novo Insumo'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Nome do Material</Label>
                <Input
                  required
                  placeholder="Ex: Fita de Cetim Rosa"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <Label>Quantidade em Estoque</Label>
                  <div className="flex flex-col xl:flex-row gap-2">
                    {editingId && (
                      <Select 
                        value={quantityMode} 
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        onValueChange={(val: any) => setQuantityMode(val)}
                      >
                        <SelectTrigger className="w-full xl:w-[150px] shrink-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="add">Adicionar (+)</SelectItem>
                          <SelectItem value="subtract">Diminuir (-)</SelectItem>
                          <SelectItem value="set">Substituir Total</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    <Input
                      type="number"
                      step="0.01"
                      placeholder={editingId ? "Deixe em branco para manter" : "0"}
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    />
                  </div>
                  {editingId && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Estoque atual: <strong>{items.find((i) => i.id === editingId)?.quantity}</strong> {formData.unit}
                    </p>
                  )}
                </div>
                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <Label>Unidade de Medida</Label>
                  <Select
                    value={formData.unit}
                    onValueChange={(val) => setFormData({ ...formData, unit: val as any })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unidade">Unidades</SelectItem>
                      <SelectItem value="cm">Centímetros</SelectItem>
                      <SelectItem value="metro">Metros</SelectItem>
                      <SelectItem value="grama">Gramas</SelectItem>
                      <SelectItem value="kg">Kilos</SelectItem>
                      <SelectItem value="ml">Mililitros</SelectItem>
                      <SelectItem value="litro">Litros</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Custo por Unidade (R$)</Label>
                  <Input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Preço da unidade/metro/grama"
                    value={formData.costPerUnit}
                    onChange={(e) => setFormData({ ...formData, costPerUnit: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    Estoque Mínimo
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs text-xs">
                          Quando o saldo livre ficar abaixo desse valor, um alerta será exibido.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Ex: 5 (opcional)"
                    value={formData.minQuantity}
                    onChange={(e) => setFormData({ ...formData, minQuantity: e.target.value })}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full">
                Salvar
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Low Stock Alerts */}
      {lowStockItems.length > 0 && (
        <div className="bg-alert-warning-bg border border-alert-warning/30 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-alert-warning shrink-0" />
            <p className="text-sm font-semibold text-alert-warning">
              {lowStockItems.length} {lowStockItems.length === 1 ? 'material com estoque baixo' : 'materiais com estoque baixo'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStockItems.map((item) => {
              const reserved = reservedMap[item.id] || 0;
              const disponivel = item.quantity - reserved;
              return (
                <span
                  key={item.id}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-alert-warning/10 text-xs text-alert-warning font-medium"
                >
                  <AlertTriangle className="h-3 w-3" />
                  {item.name}: <strong>{disponivel.toFixed(2)} {item.unit}</strong>
                  {item.minQuantity !== undefined && (
                    <span className="text-muted-foreground">(mín: {item.minQuantity} {item.unit})</span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabela de Estoque */}
      {items.length === 0 ? (
        <div className="bg-card rounded-2xl p-12 text-center shadow-soft">
          <p className="text-muted-foreground">Seu estoque está vazio.</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px] md:min-w-0">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="p-4 font-medium text-muted-foreground">Material</th>
                <th className="p-4 font-medium text-muted-foreground text-center">Total Físico</th>
                <th className="p-4 font-medium text-muted-foreground text-center">Reservado</th>
                <th className="p-4 font-medium text-muted-foreground text-center">Saldo Livre</th>
                <th className="p-4 font-medium text-muted-foreground text-center">Est. Mínimo</th>
                <th className="p-4 font-medium text-muted-foreground text-center">Custo Unitário</th>
                <th className="p-4 font-medium text-muted-foreground text-center">Custo Total</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const reserved = reservedMap[item.id] || 0;
                const disponivel = item.quantity - reserved;
                const isLow = item.minQuantity !== undefined && item.minQuantity > 0 && disponivel < item.minQuantity;
                
                return (
                <tr key={item.id} className={cn("border-b border-border transition-colors", isLow ? 'bg-alert-warning-bg/40 hover:bg-alert-warning-bg/60' : 'hover:bg-muted/10')}>
                  <td className="p-4 font-medium">
                    <div className="flex items-center gap-2">
                      {isLow && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertTriangle className="h-4 w-4 text-alert-warning shrink-0 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Estoque abaixo do mínimo — repor {item.name}!</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {item.name}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${item.quantity <= 0 ? 'bg-destructive/10 text-destructive' : 'bg-secondary'}`}>
                      {item.quantity} {item.unit}
                    </span>
                  </td>
                  <td className="p-4 text-center text-muted-foreground font-medium">
                    {reserved > 0 ? `${reserved} ${item.unit}` : '-'}
                  </td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      isLow
                        ? 'bg-alert-warning/20 text-alert-warning font-bold'
                        : disponivel < 0
                        ? 'bg-yellow-500/20 text-yellow-700'
                        : 'bg-alert-ok-bg text-alert-ok'
                    }`}>
                      {disponivel} {item.unit}
                    </span>
                  </td>
                  <td className="p-4 text-center text-muted-foreground text-sm">
                    {item.minQuantity !== undefined && item.minQuantity > 0
                      ? `${item.minQuantity} ${item.unit}`
                      : <span className="text-muted-foreground/40">—</span>}
                  </td>
                  <td className="p-4 text-center text-muted-foreground">
                    R$ {item.costPerUnit.toFixed(2)}
                  </td>
                  <td className="p-4 text-center font-medium">
                    R$ {(item.costPerUnit * item.quantity).toFixed(2)}
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => editItem(item)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
    </TooltipProvider>
  );
}
