/**
 * seed_dashboard.cjs — Script de dados focados em popular o Dashboard
 *
 * Gera um volume alto de pedidos nos últimos 30 dias e dias futuros,
 * sem gerar déficits ("to_buy") para manter o dashboard verde e focado
 * em receitas, margens e produtividade, ideal para tirar screenshots.
 *
 * Opcionalmente apaga os dados antigos antes de popular. // usage: node scripts/seed_dashboard.cjs <UID_DO_USUARIO> --clear
 *
 * Uso:
 *   node scripts/seed_dashboard.cjs <UID_DO_USUARIO> [--clear]
 */

const admin = require("firebase-admin");
const path = require("path");

// ─── Auth ────────────────────────────────────────────────────────────────
const serviceAccount = require(path.resolve(__dirname, "../service-account.json"));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// ─── Argumentos ────────────────────────────────────────────────────────────
const USER_ID = process.argv[2];
const CLEAR_OLD_DATA = process.argv.includes("--clear");

if (!USER_ID || USER_ID === "--clear") {
  console.error("\n❌  Informe o UID do usuário como argumento.");
  console.error("    Uso: node scripts/seed_dashboard.cjs <UID_DO_USUARIO> [--clear]\n");
  process.exit(1);
}

// ─── Helpers de Data (usando timestamp do momento como base) ──────────────
const ts = (d) => admin.firestore.Timestamp.fromDate(d);
const now = () => admin.firestore.FieldValue.serverTimestamp();

function getDateOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

// ─── Deletar Coleções Antigas ─────────────────────────────────────────────────
async function clearCollection(collectionPath) {
  const query = db.collection(collectionPath);
  const snapshot = await query.get();
  const batchSize = snapshot.size;
  if (batchSize === 0) return;

  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}

async function clearOldData() {
  console.log("🧹 Apagando dados antigos (orders, inventory, inventoryHistory)...");
  await clearCollection(`users/${USER_ID}/orders`);
  await clearCollection(`users/${USER_ID}/inventory`);
  await clearCollection(`users/${USER_ID}/inventoryHistory`);
  console.log("   ✅ Limpeza concluída.");
}

// ─── Seed Data ───────────────────────────────────────────────────────────────

async function seedPricingSettings() {
  console.log("⚙️  Configurações de precificação (focadas p/ screenshot alto lucro)...");
  await db.collection("users").doc(USER_ID).collection("pricingSettings").doc("default").set({
    monthlyFixedCosts: 850,
    workingHoursPerMonth: 160,
    hourlyRate: 35,
    profitMarginPercent: 40,
    monthlyGoal: 8500, // Meta financeira do mês (alta para o dashboard ficar verde/cheio)
  });
  console.log("   ✅ Configurações salvas.");
}

async function seedInventory() {
  console.log("📦 Criando Estoque com folga...");
  const col = db.collection("users").doc(USER_ID).collection("inventory");

  // Quantidades altas para garantir que nenhum pedido vai causar alerta grave no kanban ("to_buy")
  const items = [
    { name: "Couro Ecológico Premium", quantity: 50,  unit: "metro", costPerUnit: 35.00, minQuantity: 5 },
    { name: "Ferragens Douradas Kit",  quantity: 200, unit: "kit",   costPerUnit: 12.50, minQuantity: 20 },
    { name: "Tecido Linho Cru",        quantity: 100, unit: "metro", costPerUnit: 24.00, minQuantity: 10 },
    { name: "Fio de Algodão Cru 5mm",  quantity: 300, unit: "metro", costPerUnit: 1.50,  minQuantity: 40 },
    { name: "Argolas de Madeira (G)",  quantity: 150, unit: "unidade",costPerUnit: 6.00,  minQuantity: 15 },
    { name: "Fecho Magnético Oculto",  quantity: 120, unit: "unidade",costPerUnit: 4.50,  minQuantity: 20 },
  ];

  const ids = {};
  for (const item of items) {
    const ref = await col.add({ ...item, createdAt: now(), updatedAt: now() });
    ids[item.name] = ref.id;
  }
  console.log(`   ✅ ${items.length} itens de estoque cadastrados (com saldo positivo).`);
  return ids;
}

async function seedOrders(invIds) {
  console.log("📋 Gerando volume alto de pedidos (+30 pedidos, c/ receita)...");
  const col = db.collection("users").doc(USER_ID).collection("orders");
  const historyCol = db.collection("users").doc(USER_ID).collection("inventoryHistory");

  const clients = ["Isabela Martins", "Roberto Almeida", "Juliana Costa", "Fernando Reis", "Patrícia Lima", "Carla Diniz", "Miguel Souza", "Letícia Vieira", "Thiago Nogueira", "Camila Ferreira"];
  
  const products = [
    { desc: "Bolsa Couro Caramelo Clássica", basePrice: 420 },
    { desc: "Tote Bag Linho c/ Detalhes", basePrice: 280 },
    { desc: "Mochila Pequena Elegance", basePrice: 350 },
    { desc: "Painel Macramê Gigante Decoração", basePrice: 550 },
    { desc: "Suporte de Plantas Macramê Premium", basePrice: 120 },
    { desc: "Shoulder Bag Couro Preto", basePrice: 380 },
  ];

  let added = 0;

  // 1. PEDIDOS ENTREGUES (Últimos 30 dias - compor a receita realizada)
  // Gerando 25 pedidos entregues para dar um bom volume financeiro
  for (let i = 0; i < 25; i++) {
    const p = products[i % products.length];
    const createdDaysAgo = Math.floor(Math.random() * 20) + 10; // 10 a 30 dias atrás
    const deliveredDaysAgo = Math.floor(Math.random() * 9) + 1;  // 1 a 9 dias atrás
    
    const priceVariance = Math.floor(Math.random() * 50) - 20; 
    const finalPrice = p.basePrice + priceVariance;

    const reqMats = [];
    if (p.desc.includes("Couro") || p.desc.includes("Bag") || p.desc.includes("Mochila")) {
      reqMats.push({ id: invIds["Couro Ecológico Premium"], name: "Couro Ecológico Premium", quantity: "0.8" });
      reqMats.push({ id: invIds["Ferragens Douradas Kit"], name: "Ferragens Douradas Kit", quantity: "1" });
    } else {
      reqMats.push({ id: invIds["Fio de Algodão Cru 5mm"], name: "Fio de Algodão Cru 5mm", quantity: "20" });
      reqMats.push({ id: invIds["Argolas de Madeira (G)"], name: "Argolas de Madeira (G)", quantity: "2" });
    }

    const deductedMats = {};
    reqMats.forEach(m => { deductedMats[m.id] = parseFloat(m.quantity); });

    const clientName = clients[Math.floor(Math.random() * clients.length)] + ` (Entregue ${i+1})`;
    
    await col.add({
      clientName,
      productDescription: p.desc,
      deadline: ts(getDateOffset(-deliveredDaysAgo + 2)),
      price: finalPrice,
      status: "delivered",
      referenceImage: `https://picsum.photos/400/400?random=${Math.random()}`,
      clientPhone: "119999900" + (10 + i),
      createdAt: ts(getDateOffset(-createdDaysAgo)),
      deliveredAt: ts(getDateOffset(-deliveredDaysAgo)), 
      materials: reqMats,
      deductedMaterials: deductedMats,
    });
    
    for (const m of reqMats) {
      await historyCol.add({
        itemId: m.id, itemName: m.name, eventType: "order_deduction",
        previousQty: 0, newQty: 0, unit: "un", delta: -parseFloat(m.quantity),
        relatedOrderClient: clientName, relatedOrderProduct: p.desc,
        createdAt: ts(getDateOffset(-deliveredDaysAgo))
      });
    }
    added++;
  }

  // 2. PEDIDOS PRONTOS E ACABAMENTO (Receita pendente e radar - 8 pedidos)
  for (let i = 0; i < 8; i++) {
    const p = products[i % products.length];
    const createdDaysAgo = Math.floor(Math.random() * 8) + 2; // 2 a 10 dias
    const deadlineOffset = Math.floor(Math.random() * 6) - 1; // -1 a +5 dias do hoje (alguns estourando, outros perto)
    
    const finalPrice = p.basePrice + 25;
    const reqMats = [ { id: invIds["Tecido Linho Cru"], name: "Tecido Linho Cru", quantity: "1.5" } ];
    
    const clientName = clients[Math.floor(Math.random() * clients.length)];
    const productDesc = p.desc + " (Premium)";

    await col.add({
      clientName,
      productDescription: productDesc,
      deadline: ts(getDateOffset(deadlineOffset)),
      price: finalPrice,
      status: i % 3 === 0 ? "ready" : "finishing",
      referenceImage: `https://picsum.photos/400/400?random=${Math.random()}`,
      clientPhone: "11999990050",
      createdAt: ts(getDateOffset(-createdDaysAgo)),
      materials: reqMats,
      deductedMaterials: { [invIds["Tecido Linho Cru"]]: 1.5 },
    });

    for (const m of reqMats) {
      await historyCol.add({
        itemId: m.id, itemName: m.name, eventType: "order_deduction",
        previousQty: 0, newQty: 0, unit: "un", delta: -parseFloat(m.quantity),
        relatedOrderClient: clientName, relatedOrderProduct: productDesc,
        createdAt: ts(getDateOffset(-createdDaysAgo))
      });
    }
    added++;
  }

  // 3. PEDIDOS EM PRODUÇÃO (sem estresse de estoque - 12 pedidos)
  for (let i = 0; i < 12; i++) {
    const p = products[(i + 3) % products.length];
    const createdDaysAgo = Math.floor(Math.random() * 5); // 0 a 5
    const deadlineOffset = Math.floor(Math.random() * 14) + 3; // entregar daqui a 3-17 dias
    
    const reqMats = [ { id: invIds["Couro Ecológico Premium"], name: "Couro Ecológico Premium", quantity: "0.5" } ];
    
    const clientName = clients[Math.floor(Math.random() * clients.length)];

    await col.add({
      clientName,
      productDescription: p.desc,
      deadline: ts(getDateOffset(deadlineOffset)),
      price: p.basePrice,
      status: "production",
      referenceImage: `https://picsum.photos/400/400?random=${Math.random()}`,
      clientPhone: "11999990099",
      createdAt: ts(getDateOffset(-createdDaysAgo)),
      materials: reqMats,
      deductedMaterials: { [invIds["Couro Ecológico Premium"]]: 0.5 },
    });

    for (const m of reqMats) {
      await historyCol.add({
        itemId: m.id, itemName: m.name, eventType: "order_deduction",
        previousQty: 0, newQty: 0, unit: "un", delta: -parseFloat(m.quantity),
        relatedOrderClient: clientName, relatedOrderProduct: p.desc,
        createdAt: ts(getDateOffset(-createdDaysAgo))
      });
    }
    added++;
  }

  console.log(`   ✅ ${added} pedidos inseridos. Todos sem déficits de "to_buy".`);
}

async function main() {
  console.log(`\n📸 Preparando o Dashboard para Prints Bonitos (Mês Lucrativo!)`);
  console.log(`👤 Usuário: ${USER_ID}\n`);

  if (CLEAR_OLD_DATA) {
    await clearOldData();
  } else {
    console.log("⚠️  Aviso: Gerando dados por cima dos existentes. Use '--clear' para uma lousa em branco se desejar.");
  }

  await seedPricingSettings();
  const inventoryIds = await seedInventory();
  await seedOrders(inventoryIds);

  console.log(`
🚀 Tudo pronto! 
Agora abra o ArtFlow.
- Vá no Dashboard e coloque o filtro "Últimos 30 dias" ou "Este mês".
- Observe os gráficos polpudos e o radar cheio.
- Para gerar prints ainda melhores, mude manualmente uns 2 itens pro status 'to_buy' no Kanban, para colorir aquele indicador de laranja!
`);

  process.exit(0);
}

main().catch((err) => {
  console.error("\n❌ Erro durante a geração das massas de teste:", err.message);
  process.exit(1);
});
