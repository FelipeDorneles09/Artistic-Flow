import { sendInstantNotification } from "./notifier.js";

/**
 * Configura Listeners em tempo real para monitorar mudanças no Firestore
 * e disparar e-mails instantaneamente.
 */
export function setupRealtimeListeners(db) {
  console.log("[Listeners] Ativando monitoramento em tempo real (24h)...");

  // Cache para evitar notificações duplicadas de estoque em curto intervalo
  const stockNotificationCache = new Map();

  // 1. Monitorar TODOS os pedidos de TODOS os usuários via Collection Group
  db.collectionGroup("orders").onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        const order = change.doc.data();
        const userId = change.doc.ref.parent.parent.id;
        
        // Verifica se é um documento novo (criado nos últimos 30 segundos)
        // Isso evita enviar e-mail de todos os pedidos antigos ao ligar o servidor
        const createdAt = order.createdAt?.toDate?.() || new Date(order.createdAt);
        const isRecent = (Date.now() - createdAt.getTime()) < 30000;
        
        if (isRecent) {
          console.log(`[Listeners] Novo pedido detectado para o usuário ${userId}`);
          sendInstantNotification(db, userId, "new_order", order);
        }
      }
    });
  }, (error) => {
    console.error("[Listeners] Erro no listener de pedidos:", error);
  });

  // 2. Monitorar TODO o estoque
  db.collectionGroup("inventory").onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      const item = change.doc.data();
      const userId = change.doc.ref.parent.parent.id;
      const itemId = change.doc.id;

      if (change.type === "modified" || change.type === "added") {
        const qty = parseFloat(item.quantity) || 0;
        const minQty = parseFloat(item.minQuantity) || 0;

        if (qty <= minQty && minQty > 0) {
          // Lógica de "Debounce" para estoque: não avisa o mesmo item mais de uma vez por hora
          const cacheKey = `${userId}-${itemId}`;
          const lastNotified = stockNotificationCache.get(cacheKey);
          
          if (!lastNotified || (Date.now() - lastNotified > 3600000)) {
            console.log(`[Listeners] Estoque baixo detectado: ${item.name} para o usuário ${userId}`);
            sendInstantNotification(db, userId, "low_stock", item);
            stockNotificationCache.set(cacheKey, Date.now());
          }
        }
      }
    });
  }, (error) => {
    console.error("[Listeners] Erro no listener de estoque:", error);
  });
}
