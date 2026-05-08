import { useState } from 'react';
import { usePricingStore } from '@/store/pricingStore';
import { useInventoryStore } from '@/store/inventoryStore';
import { Calculator, Settings2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CalculatorMaterial {
  inventoryId: string;
  quantity: number;
}

export default function Precificacao() {
  const { settings, updateSettings } = usePricingStore();
  const { items: inventoryItems } = useInventoryStore();
  const { toast } = useToast();

  // Calculation state
  const [materials, setMaterials] = useState<CalculatorMaterial[]>([]);
  const [productionHours, setProductionHours] = useState<string>('1');

  // Computed Values
  const materialCost = materials.reduce((acc, item) => {
    const invItem = inventoryItems.find(i => i.id === item.inventoryId);
    return acc + (invItem ? invItem.costPerUnit * item.quantity : 0);
  }, 0);

  const hours = parseFloat(productionHours) || 0;
  const laborCost = hours * settings.hourlyRate;
  
  // Rate to absorb fixed costs per hour worked. 
  // If workingHoursPerMonth > 0, we can add a portion of fixed costs per hour
  const fixedCostPerHour = settings.workingHoursPerMonth > 0 
    ? settings.monthlyFixedCosts / settings.workingHoursPerMonth 
    : 0;
  
  const fixedCostAbsorbed = hours * fixedCostPerHour;
  
  const totalCost = materialCost + laborCost + fixedCostAbsorbed;
  
  // Profit margin markup
  const suggestedPrice = totalCost * (1 + settings.profitMarginPercent / 100);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    try {
      await updateSettings({
        monthlyFixedCosts: parseFloat(formData.get('monthlyFixedCosts') as string) || 0,
        workingHoursPerMonth: parseFloat(formData.get('workingHoursPerMonth') as string) || 0,
        hourlyRate: parseFloat(formData.get('hourlyRate') as string) || 0,
        profitMarginPercent: parseFloat(formData.get('profitMarginPercent') as string) || 0,
        monthlyGoal: parseFloat(formData.get('monthlyGoal') as string) || 0,
      });
      toast({ title: 'Configurações salvas!' });
    } catch (err) {
      toast({ title: 'Erro ao salvar configurações', variant: 'destructive' });
    }
  };

  const addCalcMaterial = (inventoryId: string) => {
    if (!inventoryId) return;
    setMaterials([...materials, { inventoryId, quantity: 1 }]);
  };

  const updateCalcMaterial = (index: number, quantity: number) => {
    const newMats = [...materials];
    newMats[index].quantity = quantity;
    setMaterials(newMats);
  };

  const removeCalcMaterial = (index: number) => {
    setMaterials(materials.filter((_, idx) => idx !== index));
  };

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left: Global Settings */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <Settings2 className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Configurações Base</h1>
        </div>
        <p className="text-muted-foreground mb-6">
          Defina as variáveis do seu ateliê para a calculadora funcionar.
        </p>

        <Card className="shadow-soft border-border/50">
          <CardContent className="pt-6">
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="space-y-2">
                <Label>Custos Fixos Mensais (R$)</Label>
                <Input
                  name="monthlyFixedCosts"
                  type="number"
                  step="0.01"
                  defaultValue={settings.monthlyFixedCosts}
                  placeholder="Água, luz, MEI, internet..."
                />
              </div>
              <div className="space-y-2">
                <Label>Horas Trabalhadas no Mês</Label>
                <Input
                  name="workingHoursPerMonth"
                  type="number"
                  defaultValue={settings.workingHoursPerMonth}
                  placeholder="Ex: 160 = 40h x 4 semanas"
                />
              </div>
              <div className="space-y-2">
                <Label>Sua Hora de Trabalho (R$/h)</Label>
                <Input
                  name="hourlyRate"
                  type="number"
                  step="0.01"
                  defaultValue={settings.hourlyRate}
                  placeholder="Quanto você quer ganhar por hora"
                />
              </div>
              <div className="space-y-2">
                <Label>Margem de Lucro Sugerida (%)</Label>
                <Input
                  name="profitMarginPercent"
                  type="number"
                  defaultValue={settings.profitMarginPercent}
                  placeholder="Ex: 30"
                />
              </div>
              <div className="space-y-2">
                <Label>Meta de Faturamento Mensal (R$)</Label>
                <Input
                  name="monthlyGoal"
                  type="number"
                  step="0.01"
                  defaultValue={settings.monthlyGoal || ''}
                  placeholder="Ex: 3000"
                />
                <p className="text-xs text-muted-foreground">Usado para acompanhar o progresso no Dashboard.</p>
              </div>
              <Button type="submit" className="w-full mt-2">
                Salvar Configurações
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Right: Calculator */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <Calculator className="h-6 w-6 text-accent-foreground" />
          <h1 className="text-3xl font-bold text-foreground">Simulador de Preço</h1>
        </div>
        <p className="text-muted-foreground mb-6">
          Calcule o preço de venda de uma nova peça com base no estoque e nas configurações.
        </p>

        <Card className="shadow-soft border-border/50">
          <CardContent className="pt-6 space-y-6">
            {/* Materials Input */}
            <div className="space-y-4 text-sm">
              <Label className="text-base">Mão de Obra</Label>
              <div className="flex items-center gap-4">
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={productionHours}
                  onChange={(e) => setProductionHours(e.target.value)}
                  className="w-32"
                />
                <span className="text-muted-foreground">Horas necessárias para produzir</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-base">Materiais (Selecione do Estoque)</Label>
              </div>

              <Select onValueChange={addCalcMaterial} value="">
                <SelectTrigger>
                  <SelectValue placeholder="Adicionar Insumo..." />
                </SelectTrigger>
                <SelectContent>
                  {inventoryItems.map((inv) => (
                    <SelectItem key={inv.id} value={inv.id}>
                      {inv.name} (R${inv.costPerUnit}/{inv.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {materials.map((mat, index) => {
                const invItem = inventoryItems.find((i) => i.id === mat.inventoryId);
                if (!invItem) return null;
                return (
                  <div key={index} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                    <span className="flex-1 truncate">{invItem.name}</span>
                    <Input
                      type="number"
                      step="0.01"
                      className="w-24 h-8"
                      value={mat.quantity}
                      onChange={(e) => updateCalcMaterial(index, parseFloat(e.target.value) || 0)}
                    />
                    <span className="text-xs text-muted-foreground w-12">{invItem.unit}</span>
                    <Button variant="ghost" size="icon" onClick={() => removeCalcMaterial(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                );
              })}
            </div>

            <hr className="border-border" />

            {/* Results */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Custo dos Materiais:</span>
                <span>R$ {materialCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Mão de Obra ({hours}h):</span>
                <span>R$ {laborCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Rateio Custo Fixo:</span>
                <span>R$ {fixedCostAbsorbed.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold pt-2 border-t border-border/50">
                <span>Custo Total:</span>
                <span>R$ {totalCost.toFixed(2)}</span>
              </div>
            </div>

            <div className="bg-primary/10 p-4 rounded-xl border border-primary/20 text-center">
              <p className="text-sm text-primary font-medium mb-1">Preço Sugerido (+{settings.profitMarginPercent}% Lucro)</p>
              <p className="text-3xl font-bold text-primary">
                R$ {suggestedPrice.toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
