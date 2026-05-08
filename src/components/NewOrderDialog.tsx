import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Plus, Trash2, ImagePlus, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useOrderStore } from '@/store/orderStore';
import { useInventoryStore } from '@/store/inventoryStore';
import { useToast } from '@/hooks/use-toast';
import { Material, Order } from '@/types/order';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

interface NewOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editingOrder?: Order | null | any;
}

interface MaterialInput {
  id: string;
  inventoryId?: string;
  name: string;
  quantity: string;
}

export function NewOrderDialog({ open, onOpenChange, editingOrder }: NewOrderDialogProps) {
  const { toast } = useToast();
  const addOrder = useOrderStore((state) => state.addOrder);
  const updateOrder = useOrderStore((state) => state.updateOrder);
  const { items: inventoryItems, addItem: addInventoryItem, updateItem: updateInventoryItem } = useInventoryStore();

  const [formData, setFormData] = useState({
    clientName: '',
    productDescription: '',
    deadline: undefined as Date | undefined,
    price: '',
    clientPhone: '',
    referenceImage: '',
  });

  const [materials, setMaterials] = useState<MaterialInput[]>([
    { id: crypto.randomUUID(), name: '', quantity: '', inventoryId: 'new' },
  ]);

  useEffect(() => {
    if (editingOrder && open) {
      setFormData({
        clientName: editingOrder.clientName,
        productDescription: editingOrder.productDescription,
        deadline: new Date(editingOrder.deadline),
        price: editingOrder.price.toString(),
        clientPhone: editingOrder.clientPhone || '',
        referenceImage: editingOrder.referenceImage || '',
      });
      setMaterials(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        editingOrder.materials?.map((m: any) => {
          // Relinks old UUIDs that didn't have true Firebase IDs to the inventory item created with the same name
          const matchedInv = inventoryItems.find((inv) => inv.id === m.id || inv.name.toLowerCase() === m.name?.toLowerCase());
          return {
            id: crypto.randomUUID(),
            inventoryId: matchedInv ? matchedInv.id : 'new',
            name: matchedInv ? matchedInv.name : m.name,
            quantity: m.quantity,
          };
        }) || [{ id: crypto.randomUUID(), name: '', quantity: '', inventoryId: 'new' }]
      );
    } else if (open) {
      resetForm();
    }
  }, [open, editingOrder]);

  const addMaterial = () => {
    setMaterials([...materials, { id: crypto.randomUUID(), name: '', quantity: '', inventoryId: 'new' }]);
  };

  const removeMaterial = (id: string) => {
    if (materials.length > 1) {
      setMaterials(materials.filter((m) => m.id !== id));
    }
  };

  const updateMaterial = (id: string, updates: Partial<MaterialInput>) => {
    setMaterials((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updates } : m))
    );
  };

  const resetForm = () => {
    setFormData({
      clientName: '',
      productDescription: '',
      deadline: undefined,
      price: '',
      clientPhone: '',
      referenceImage: '',
    });
    setMaterials([{ id: crypto.randomUUID(), name: '', quantity: '', inventoryId: 'new' }]);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: 'Arquivo muito grande',
          description: 'A imagem deve ter no máximo 2MB.',
          variant: 'destructive',
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, referenceImage: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.deadline) {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione uma data de entrega.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const processedMaterials: Material[] = [];

      for (const m of materials) {
        const name = m.name?.trim() || '';
        const qtyStr = m.quantity?.trim() || '1';

        if (m.inventoryId && m.inventoryId !== 'new') {
          const invItem = inventoryItems.find((i) => i.id === m.inventoryId);
          if (invItem) {
            processedMaterials.push({ id: invItem.id, name: invItem.name, quantity: qtyStr });
          }
        } else {
          if (name) {
            // Create the item in inventory with 0 quantity so it exists for future tracking
            const newId = await addInventoryItem({
              name,
              quantity: 0,
              unit: 'unidade',
              costPerUnit: 0,
            });
            processedMaterials.push({ id: newId, name, quantity: qtyStr });
          }
        }
      }

      if (editingOrder) {
        await updateOrder(editingOrder.id, {
          clientName: formData.clientName,
          productDescription: formData.productDescription,
          deadline: formData.deadline,
          price: parseFloat(formData.price) || 0,
          materials: processedMaterials,
          clientPhone: formData.clientPhone.replace(/\D/g, ''),
          referenceImage: formData.referenceImage,
        });

        toast({
          title: 'Pedido atualizado!',
          description: `Pedido de ${formData.clientName} foi atualizado com sucesso.`,
        });
      } else {
        await addOrder({
          clientName: formData.clientName,
          productDescription: formData.productDescription,
          deadline: formData.deadline,
          price: parseFloat(formData.price) || 0,
          materials: processedMaterials,
          clientPhone: formData.clientPhone.replace(/\D/g, ''),
          status: 'to_buy',
          referenceImage: formData.referenceImage,
        });

        toast({
          title: 'Pedido criado!',
          description: `Pedido adicionado.`,
        });
      }

      resetForm();
      onOpenChange(false);
    } catch (err) {
      console.error('Erro ao salvar pedido', err);
      toast({
        title: 'Erro',
        description: editingOrder
          ? 'Não foi possível atualizar o pedido. Tente novamente.'
          : 'Não foi possível criar o pedido. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {editingOrder ? 'Editar Pedido' : 'Novo Pedido'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="clientName">Nome do Cliente</Label>
            <Input
              id="clientName"
              placeholder="Ex: Maria Silva"
              value={formData.clientName}
              onChange={(e) =>
                setFormData({ ...formData, clientName: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="productDescription">Descrição do Produto</Label>
            <Input
              id="productDescription"
              placeholder="Ex: 50 lembrancinhas de batizado"
              value={formData.productDescription}
              onChange={(e) =>
                setFormData({ ...formData, productDescription: e.target.value })
              }
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data de Entrega</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !formData.deadline && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.deadline ? (
                      format(formData.deadline, 'PPP', { locale: ptBR })
                    ) : (
                      <span>Selecione</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.deadline}
                    onSelect={(date) =>
                      setFormData({ ...formData, deadline: date })
                    }
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Valor (R$)</Label>
              <Input
                id="price"
                type="number"
                placeholder="0,00"
                value={formData.price}
                onChange={(e) =>
                  setFormData({ ...formData, price: e.target.value })
                }
                required
              />
            </div>
          </div>

          {/* Materials Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Materiais (Saída do Estoque)</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addMaterial}
                className="text-primary hover:text-primary/80 gap-1"
              >
                <Plus className="h-4 w-4" />
                Adicionar
              </Button>
            </div>

            <div className="space-y-2">
              {materials.map((material) => (
                <div key={material.id} className="flex flex-col gap-2 p-3 bg-muted/20 rounded-md border border-border/50">
                  <div className="flex gap-2 items-start">
                    <div className="flex-1 space-y-2 min-w-0">
                      <Select
                        value={material.inventoryId || 'new'}
                        onValueChange={(val) => {
                          if (val !== 'new') {
                            const selectedInv = inventoryItems.find((i) => i.id === val);
                            updateMaterial(material.id, { inventoryId: val, name: selectedInv ? selectedInv.name : '' });
                          } else {
                            updateMaterial(material.id, { inventoryId: 'new', name: '' });
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione do estoque ou novo..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">+ Novo Insumo Não Cadastrado</SelectItem>
                          {inventoryItems.map((inv) => (
                            <SelectItem key={inv.id} value={inv.id}>
                              {inv.name} (Disp: {inv.quantity} {inv.unit})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {(!material.inventoryId || material.inventoryId === 'new') && (
                        <div className="space-y-2 mt-2">
                          <Input
                            placeholder="Nome do novo material"
                            value={material.name}
                            onChange={(e) => updateMaterial(material.id, { name: e.target.value })}
                          />
                        </div>
                      )}
                    </div>
                    <div className="w-20 shrink-0">
                      <Input
                        placeholder="Qtd."
                        value={material.quantity}
                        onChange={(e) => updateMaterial(material.id, { quantity: e.target.value })}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMaterial(material.id)}
                      disabled={materials.length === 1}
                      className="text-muted-foreground hover:text-destructive shrink-0 mt-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientPhone">Telefone (WhatsApp)</Label>
            <Input
              id="clientPhone"
              placeholder="(11) 99999-9999"
              value={formData.clientPhone}
              onChange={(e) =>
                setFormData({ ...formData, clientPhone: e.target.value })
              }
            />
          </div>

          {/* Reference Image */}
          <div className="space-y-2">
            <Label>Foto de Referência (Opcional)</Label>
            {formData.referenceImage ? (
              <div className="relative w-full h-48 rounded-lg overflow-hidden border border-border bg-muted group">
                <img
                  src={formData.referenceImage}
                  alt="Referência"
                  className="w-full h-full object-cover"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => setFormData({ ...formData, referenceImage: '' })}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer bg-muted/10 hover:bg-muted/20 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <ImagePlus className="w-8 h-8 mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Clique para fazer upload
                    </p>
                    <p className="text-xs text-muted-foreground/60">
                      PNG, JPG ou WEBP (Max 2MB)
                    </p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                </label>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">
              {editingOrder ? 'Atualizar Pedido' : 'Criar Pedido'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
