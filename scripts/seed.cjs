/**
 * seed.js — Script de dados de teste para o ArtFlow
 *
 * Uso:
 *   node scripts/seed.js <UID_DO_USUARIO>
 *
 * Como obter seu UID:
 *   1. Acesse o Firebase Console → Authentication → Users
 *   2. Copie o User UID da sua conta
 *
 * Requires: firebase-admin (já deve estar no projeto ou instale com: npm install firebase-admin)
 */

const admin = require("firebase-admin");
const path  = require("path");

// ─── Auth via service account ───────────────────────────────────────────────
const serviceAccount = require(path.resolve(__dirname, "../service-account.json"));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// ─── Target user ────────────────────────────────────────────────────────────
const USER_ID = process.argv[2];
if (!USER_ID) {
  console.error("\n❌  Informe o UID do usuário como argumento.");
  console.error("    Uso: node scripts/seed.js <UID_DO_USUARIO>\n");
  process.exit(1);
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const ts  = (d) => admin.firestore.Timestamp.fromDate(d);
const now = () => admin.firestore.FieldValue.serverTimestamp();

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// ─── Seed data ───────────────────────────────────────────────────────────────

async function seedPricingSettings() {
  console.log("⚙️  Configurações de precificação...");
  await db.collection("users").doc(USER_ID).collection("pricingSettings").doc("default").set({
    monthlyFixedCosts: 450,
    workingHoursPerMonth: 120,
    hourlyRate: 18,
    profitMarginPercent: 35,
    monthlyGoal: 3500,
  });
  console.log("   ✅ Configurações salvas.");
}

async function seedInventory() {
  console.log("📦 Estoque...");
  const col = db.collection("users").doc(USER_ID).collection("inventory");

  const items = [
    { name: "Fio de Macramê 3mm",   quantity: 200, unit: "metro",   costPerUnit: 0.80, minQuantity: 30 },
    { name: "Fio de Macramê 5mm",   quantity: 80,  unit: "metro",   costPerUnit: 1.20, minQuantity: 20 },
    { name: "Argola de Madeira 5cm",quantity: 45,  unit: "unidade", costPerUnit: 1.50, minQuantity: 10 },
    { name: "Argola de Madeira 8cm",quantity: 12,  unit: "unidade", costPerUnit: 2.80, minQuantity: 15 },
    { name: "Miçangas Redondas",    quantity: 300, unit: "unidade", costPerUnit: 0.10, minQuantity: 50 },
    { name: "Contas de Madeira",    quantity: 120, unit: "unidade", costPerUnit: 0.25, minQuantity: 40 },
    { name: "Tinta Acrílica Branca",quantity: 3,   unit: "unidade", costPerUnit: 12.00, minQuantity: 2 },
    { name: "Tinta Acrílica Preta", quantity: 1,   unit: "unidade", costPerUnit: 12.00, minQuantity: 2 },
    { name: "Verniz Fosco",         quantity: 2,   unit: "unidade", costPerUnit: 18.00, minQuantity: 1 },
    { name: "Palha de Buriti",      quantity: 0.8, unit: "kg",      costPerUnit: 32.00, minQuantity: 0.5 },
  ];

  const ids = {};
  for (const item of items) {
    const ref = await col.add({ ...item, createdAt: now(), updatedAt: now() });
    ids[item.name] = ref.id;
    console.log(`   ✅ ${item.name}`);
  }
  return ids;
}

async function seedOrders(inventoryIds) {
  console.log("📋 Pedidos...");
  const col = db.collection("users").doc(USER_ID).collection("orders");

  const orders = [
    // ── Delivered (past months) ────────────────────────────────────────────
    {
      clientName: "Fernanda Ramos",
      productDescription: "Quadro de Macramê com argola 30cm",
      deadline: ts(daysAgo(20)),
      price: 180,
      status: "delivered",
      referenceImage: "",
      clientPhone: "51999001001",
      createdAt: ts(daysAgo(35)),
      deliveredAt: ts(daysAgo(20)),
      materials: [
        { id: inventoryIds["Fio de Macramê 3mm"], name: "Fio de Macramê 3mm", quantity: "15" },
        { id: inventoryIds["Argola de Madeira 8cm"], name: "Argola de Madeira 8cm", quantity: "1" },
      ],
      deductedMaterials: {
        [inventoryIds["Fio de Macramê 3mm"]]: 15,
        [inventoryIds["Argola de Madeira 8cm"]]: 1,
      },
    },
    {
      clientName: "Cláudia Mendes",
      productDescription: "Par de Brincos de Macramê",
      deadline: ts(daysAgo(15)),
      price: 55,
      status: "delivered",
      referenceImage: "",
      clientPhone: "51988002002",
      createdAt: ts(daysAgo(25)),
      deliveredAt: ts(daysAgo(15)),
      materials: [
        { id: inventoryIds["Fio de Macramê 3mm"], name: "Fio de Macramê 3mm", quantity: "3" },
        { id: inventoryIds["Miçangas Redondas"], name: "Miçangas Redondas", quantity: "20" },
      ],
      deductedMaterials: {
        [inventoryIds["Fio de Macramê 3mm"]]: 3,
        [inventoryIds["Miçangas Redondas"]]: 20,
      },
    },
    {
      clientName: "Raquel Oliveira",
      productDescription: "Bolsa Tote de Palha de Buriti",
      deadline: ts(daysAgo(10)),
      price: 220,
      status: "delivered",
      referenceImage: "",
      clientPhone: "51977003003",
      createdAt: ts(daysAgo(18)),
      deliveredAt: ts(daysAgo(10)),
      materials: [
        { id: inventoryIds["Palha de Buriti"], name: "Palha de Buriti", quantity: "0.3" },
      ],
      deductedMaterials: { [inventoryIds["Palha de Buriti"]]: 0.3 },
    },
    {
      clientName: "Tatiane Sousa",
      productDescription: "Colar de Macramê com pedras",
      deadline: ts(daysAgo(5)),
      price: 95,
      status: "delivered",
      referenceImage: "",
      clientPhone: "51966004004",
      createdAt: ts(daysAgo(12)),
      deliveredAt: ts(daysAgo(5)),
      materials: [
        { id: inventoryIds["Fio de Macramê 3mm"], name: "Fio de Macramê 3mm", quantity: "5" },
        { id: inventoryIds["Contas de Madeira"], name: "Contas de Madeira", quantity: "15" },
      ],
      deductedMaterials: {
        [inventoryIds["Fio de Macramê 3mm"]]: 5,
        [inventoryIds["Contas de Madeira"]]: 15,
      },
    },
    {
      clientName: "Beatriz Lima",
      productDescription: "Mobile Decorativo de Macramê",
      deadline: ts(daysAgo(2)),
      price: 145,
      status: "delivered",
      referenceImage: "",
      clientPhone: "51955005005",
      createdAt: ts(daysAgo(8)),
      deliveredAt: ts(daysAgo(2)),
      materials: [
        { id: inventoryIds["Fio de Macramê 5mm"], name: "Fio de Macramê 5mm", quantity: "8" },
        { id: inventoryIds["Argola de Madeira 5cm"], name: "Argola de Madeira 5cm", quantity: "3" },
      ],
      deductedMaterials: {
        [inventoryIds["Fio de Macramê 5mm"]]: 8,
        [inventoryIds["Argola de Madeira 5cm"]]: 3,
      },
    },

    // ── Ready (prontos para entrega) ───────────────────────────────────────
    {
      clientName: "Juliana Castro",
      productDescription: "Tapete de Macramê 60x40cm",
      deadline: ts(daysFromNow(1)),
      price: 260,
      status: "ready",
      referenceImage: "",
      clientPhone: "51944006006",
      createdAt: ts(daysAgo(7)),
      materials: [
        { id: inventoryIds["Fio de Macramê 5mm"], name: "Fio de Macramê 5mm", quantity: "20" },
      ],
      deductedMaterials: { [inventoryIds["Fio de Macramê 5mm"]]: 20 },
    },
    {
      clientName: "Amanda Ferreira",
      productDescription: "Porta-Vaso de Macramê (kit 2)",
      deadline: ts(daysFromNow(2)),
      price: 120,
      status: "ready",
      referenceImage: "",
      clientPhone: "51933007007",
      createdAt: ts(daysAgo(5)),
      materials: [
        { id: inventoryIds["Fio de Macramê 3mm"], name: "Fio de Macramê 3mm", quantity: "12" },
        { id: inventoryIds["Argola de Madeira 5cm"], name: "Argola de Madeira 5cm", quantity: "2" },
      ],
      deductedMaterials: {
        [inventoryIds["Fio de Macramê 3mm"]]: 12,
        [inventoryIds["Argola de Madeira 5cm"]]: 2,
      },
    },

    // ── Finishing (acabamento) ─────────────────────────────────────────────
    {
      clientName: "Renata Alves",
      productDescription: "Quadro Mandala de Macramê 50cm",
      deadline: ts(daysFromNow(4)),
      price: 310,
      status: "finishing",
      referenceImage: "",
      clientPhone: "51922008008",
      createdAt: ts(daysAgo(4)),
      materials: [
        { id: inventoryIds["Fio de Macramê 3mm"], name: "Fio de Macramê 3mm", quantity: "25" },
        { id: inventoryIds["Argola de Madeira 8cm"], name: "Argola de Madeira 8cm", quantity: "1" },
      ],
      deductedMaterials: {
        [inventoryIds["Fio de Macramê 3mm"]]: 25,
        [inventoryIds["Argola de Madeira 8cm"]]: 1,
      },
    },

    // ── Production (em produção) ───────────────────────────────────────────
    {
      clientName: "Carla Santana",
      productDescription: "Conjunto Brincos + Colar Boho",
      deadline: ts(daysFromNow(6)),
      price: 130,
      status: "production",
      referenceImage: "",
      clientPhone: "51911009009",
      createdAt: ts(daysAgo(3)),
      materials: [
        { id: inventoryIds["Fio de Macramê 3mm"], name: "Fio de Macramê 3mm", quantity: "6" },
        { id: inventoryIds["Miçangas Redondas"], name: "Miçangas Redondas", quantity: "40" },
      ],
      deductedMaterials: {
        [inventoryIds["Fio de Macramê 3mm"]]: 6,
        [inventoryIds["Miçangas Redondas"]]: 40,
      },
    },
    {
      clientName: "Priscila Nunes",
      productDescription: "Painel Boho Macramê P/ Cabeceira",
      deadline: ts(daysFromNow(10)),
      price: 450,
      status: "production",
      referenceImage: "",
      clientPhone: "51900010010",
      createdAt: ts(daysAgo(2)),
      materials: [
        { id: inventoryIds["Fio de Macramê 5mm"], name: "Fio de Macramê 5mm", quantity: "35" },
        { id: inventoryIds["Argola de Madeira 8cm"], name: "Argola de Madeira 8cm", quantity: "2" },
        { id: inventoryIds["Contas de Madeira"], name: "Contas de Madeira", quantity: "30" },
      ],
      deductedMaterials: {
        [inventoryIds["Fio de Macramê 5mm"]]: 35,
        [inventoryIds["Argola de Madeira 8cm"]]: 2,
        [inventoryIds["Contas de Madeira"]]: 30,
      },
    },

    // ── To Buy (a comprar) ─────────────────────────────────────────────────
    {
      clientName: "Larissa Campos",
      productDescription: "Tapete Redondo de Palha 80cm",
      deadline: ts(daysFromNow(14)),
      price: 380,
      status: "to_buy",
      referenceImage: "",
      clientPhone: "51889011011",
      createdAt: ts(daysAgo(1)),
      materials: [
        { id: inventoryIds["Palha de Buriti"], name: "Palha de Buriti", quantity: "0.6" },
      ],
      deductedMaterials: {},
    },
    {
      clientName: "Gisele Martins",
      productDescription: "Cortina de Macramê 1,5m",
      deadline: ts(daysFromNow(20)),
      price: 520,
      status: "to_buy",
      referenceImage: "",
      clientPhone: "51878012012",
      createdAt: ts(new Date()),
      materials: [
        { id: inventoryIds["Fio de Macramê 5mm"], name: "Fio de Macramê 5mm", quantity: "50" },
        { id: inventoryIds["Tinta Acrílica Branca"], name: "Tinta Acrílica Branca", quantity: "1" },
      ],
      deductedMaterials: {},
    },
  ];

  for (const order of orders) {
    await col.add(order);
    console.log(`   ✅ ${order.clientName} — ${order.productDescription} [${order.status}]`);
  }
}

async function seedInventoryHistory(inventoryIds) {
  console.log("📜 Histórico de estoque...");
  const col = db.collection("users").doc(USER_ID).collection("inventoryHistory");

  const entries = [
    {
      itemId: inventoryIds["Fio de Macramê 3mm"],
      itemName: "Fio de Macramê 3mm",
      eventType: "item_created",
      previousQty: 0, newQty: 200, delta: 200, unit: "metro",
      note: "Item criado no estoque",
      createdAt: ts(daysAgo(40)),
    },
    {
      itemId: inventoryIds["Fio de Macramê 5mm"],
      itemName: "Fio de Macramê 5mm",
      eventType: "item_created",
      previousQty: 0, newQty: 80, delta: 80, unit: "metro",
      note: "Item criado no estoque",
      createdAt: ts(daysAgo(40)),
    },
    {
      itemId: inventoryIds["Fio de Macramê 3mm"],
      itemName: "Fio de Macramê 3mm",
      eventType: "order_deduction",
      previousQty: 200, newQty: 185, delta: -15, unit: "metro",
      note: "Dedução de pedido",
      relatedOrderClient: "Fernanda Ramos",
      relatedOrderProduct: "Quadro de Macramê com argola 30cm",
      createdAt: ts(daysAgo(35)),
    },
    {
      itemId: inventoryIds["Fio de Macramê 3mm"],
      itemName: "Fio de Macramê 3mm",
      eventType: "order_deduction",
      previousQty: 185, newQty: 182, delta: -3, unit: "metro",
      note: "Dedução de pedido",
      relatedOrderClient: "Cláudia Mendes",
      relatedOrderProduct: "Par de Brincos de Macramê",
      createdAt: ts(daysAgo(25)),
    },
    {
      itemId: inventoryIds["Fio de Macramê 3mm"],
      itemName: "Fio de Macramê 3mm",
      eventType: "manual_add",
      previousQty: 150, newQty: 200, delta: 50, unit: "metro",
      note: "Reposição de estoque",
      createdAt: ts(daysAgo(15)),
    },
    {
      itemId: inventoryIds["Fio de Macramê 3mm"],
      itemName: "Fio de Macramê 3mm",
      eventType: "price_change",
      previousQty: 200, newQty: 200, delta: 0, unit: "metro",
      note: "Custo atualizado: R$ 0.60 → R$ 0.80",
      previousCost: 0.60, newCost: 0.80,
      createdAt: ts(daysAgo(10)),
    },
    {
      itemId: inventoryIds["Tinta Acrílica Preta"],
      itemName: "Tinta Acrílica Preta",
      eventType: "item_created",
      previousQty: 0, newQty: 1, delta: 1, unit: "unidade",
      note: "Item criado no estoque",
      createdAt: ts(daysAgo(30)),
    },
    {
      itemId: inventoryIds["Argola de Madeira 8cm"],
      itemName: "Argola de Madeira 8cm",
      eventType: "order_deduction",
      previousQty: 14, newQty: 12, delta: -2, unit: "unidade",
      note: "Dedução de pedido",
      relatedOrderClient: "Priscila Nunes",
      relatedOrderProduct: "Painel Boho Macramê P/ Cabeceira",
      createdAt: ts(daysAgo(2)),
    },
  ];

  for (const entry of entries) {
    await col.add(entry);
  }
  console.log(`   ✅ ${entries.length} entradas adicionadas.`);
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🌱 Seeding dados para o usuário: ${USER_ID}\n`);

  await seedPricingSettings();
  const inventoryIds = await seedInventory();
  await seedOrders(inventoryIds);
  await seedInventoryHistory(inventoryIds);

  console.log(`
✅ Seed concluído com sucesso!

📊 Resumo do que foi criado:
   • Configurações de precificação (meta: R$3.500/mês)
   • 10 itens de estoque (2 com estoque abaixo do mínimo para testar alertas)
   • 12 pedidos: 5 entregues · 2 prontos · 1 acabamento · 2 produção · 2 a comprar
   • Histórico de estoque com 8 entradas (incl. price_change)

🔥 Acesse o app e veja os dados no Dashboard!
`);

  process.exit(0);
}

main().catch((err) => {
  console.error("\n❌ Erro durante o seed:", err.message);
  process.exit(1);
});
