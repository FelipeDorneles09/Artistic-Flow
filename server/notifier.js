import nodemailer from "nodemailer";

/**
 * Serviço de Notificações em Segundo Plano
 * 
 * Este módulo varre o Firestore em busca de pedidos urgentes e estoque baixo
 * e envia e-mails automáticos para os usuários.
 */

// Configuração do Transportador (Requer EMAIL_USER e EMAIL_PASS no .env)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function checkAndNotifyUsers(db) {
  console.log(`[${new Date().toISOString()}] [Notifier] Iniciando varredura de rotina...`);
  
  try {
    // 1. Buscar todos os usuários do sistema
    const usersSnap = await db.collection("users").get();
    
    if (usersSnap.empty) {
      console.log("[Notifier] Nenhum usuário encontrado para notificar.");
      return;
    }

    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;
      
      // O e-mail pode estar no campo 'email' ou ser o próprio ID do documento (se for o e-mail do login)
      const userEmail = userData.email || (userId.includes('@') ? userId : null);

      if (!userEmail) {
        console.warn(`[Notifier] Usuário ${userId} não possui e-mail configurado. Pulando...`);
        continue;
      }

      // 2. Buscar Pedidos Ativos (Não entregues)
      const ordersSnap = await db.collection("users").doc(userId).collection("orders")
        .where("status", "!=", "delivered")
        .get();

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const urgentOrders = [];

      ordersSnap.forEach(doc => {
        const order = doc.data();
        if (!order.deadline) return;

        const deadline = order.deadline.toDate();
        deadline.setHours(0, 0, 0, 0);
        
        // Diferença em dias
        const diffTime = deadline.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Critério: Vencendo hoje, amanhã ou depois de amanhã (<= 2 dias)
        if (diffDays <= 2) {
          urgentOrders.push({
            client: order.clientName,
            product: order.productDescription,
            days: diffDays
          });
        }
      });

      // 3. Buscar Estoque Baixo
      const inventorySnap = await db.collection("users").doc(userId).collection("inventory").get();
      const lowStockItems = [];

      inventorySnap.forEach(doc => {
        const item = doc.data();
        const quantity = parseFloat(item.quantity) || 0;
        const minQty = parseFloat(item.minQuantity) || 0;
        
        if (quantity <= minQty && minQty > 0) {
          lowStockItems.push({
            name: item.name,
            qty: quantity,
            unit: item.unit || 'un'
          });
        }
      });

      // 4. Enviar E-mail se houver algo relevante
      if (urgentOrders.length > 0 || lowStockItems.length > 0) {
        await sendNotificationEmail(userEmail, urgentOrders, lowStockItems);
      }
    }
  } catch (error) {
    console.error("[Notifier] Erro crítico na varredura:", error);
  }
}

async function sendNotificationEmail(email, orders, stock) {
  const orderListHtml = orders.map(o => `
    <li style="margin-bottom: 8px;">
      <strong style="color: ${o.days <= 0 ? '#dc2626' : '#ea580c'};">
        ${o.days === 0 ? 'VENCE HOJE!' : o.days < 0 ? 'ATRASADO!' : 'Vence em ' + o.days + ' dias'}
      </strong><br/>
      ${o.client}: ${o.product}
    </li>
  `).join('');

  const stockListHtml = stock.map(s => `
    <li>${s.name}: <strong>${s.qty} ${s.unit}</strong> (Abaixo do mínimo)</li>
  `).join('');

  const mailOptions = {
    from: `"ArtFlow Alertas" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "📢 ArtFlow: Resumo de Pendências Urgentes",
    html: `
      <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
        <div style="background-color: #064e3b; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">ArtFlow</h1>
          <p style="margin: 5px 0 0; opacity: 0.8;">Seu resumo diário do ateliê</p>
        </div>
        
        <div style="padding: 20px;">
          <p>Olá! Notamos algumas coisas que precisam da sua atenção no seu ateliê hoje:</p>
          
          ${orders.length > 0 ? `
            <h3 style="color: #064e3b; border-bottom: 2px solid #064e3b; padding-bottom: 5px;">Pedidos Próximos do Prazo</h3>
            <ul style="list-style: none; padding: 0;">
              ${orderListHtml}
            </ul>
          ` : ''}
          
          ${stock.length > 0 ? `
            <h3 style="color: #064e3b; border-bottom: 2px solid #064e3b; padding-bottom: 5px; margin-top: 25px;">Materiais em Baixa</h3>
            <ul>
              ${stockListHtml}
            </ul>
          ` : ''}
          
          <div style="margin-top: 30px; text-align: center;">
            <a href="${process.env.VITE_APP_URL || 'https://artflow-calm.web.app'}" 
               style="background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
               Abrir meu Dashboard
            </a>
          </div>
        </div>
        
        <div style="background-color: #f9fafb; padding: 15px; text-align: center; font-size: 12px; color: #666;">
          Este é um alerta automático do ArtFlow. Não responda a este e-mail.
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[Notifier] E-mail enviado para ${email}`);
  } catch (error) {
    console.error(`[Notifier] Falha ao enviar e-mail para ${email}:`, error);
  }
}

/**
 * Envia uma notificação imediata (Real-time)
 */
export async function sendInstantNotification(db, userId, type, data) {
  try {
    // 1. Tentar pegar o e-mail do usuário
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();
    const email = userData?.email || (userId.includes('@') ? userId : null);

    if (!email) return;

    let subject = "";
    let html = "";

    if (type === "new_order") {
      subject = "🆕 Novo Pedido Recebido!";
      html = `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
          <div style="background-color: #064e3b; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Novo Pedido!</h1>
          </div>
          <div style="padding: 20px;">
            <p>Um novo pedido foi registrado no ArtFlow:</p>
            <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px;">
              <p><strong>Cliente:</strong> ${data.clientName}</p>
              <p><strong>Produto:</strong> ${data.productDescription}</p>
              <p><strong>Valor:</strong> R$ ${data.price.toFixed(2)}</p>
            </div>
            <p style="margin-top: 20px;">Acesse o sistema para começar a produção!</p>
          </div>
        </div>
      `;
    } else if (type === "low_stock") {
      subject = "⚠️ Alerta de Estoque Crítico!";
      html = `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
          <div style="background-color: #dc2626; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Estoque Baixo!</h1>
          </div>
          <div style="padding: 20px;">
            <p>O nível de um material atingiu o limite crítico:</p>
            <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; border: 1px solid #fee2e2;">
              <p><strong>Material:</strong> ${data.name}</p>
              <p><strong>Quantidade Atual:</strong> ${data.quantity} ${data.unit || 'un'}</p>
              <p><strong>Mínimo Desejado:</strong> ${data.minQuantity} ${data.unit || 'un'}</p>
            </div>
            <p style="margin-top: 20px;">Recomendamos repor este item o quanto antes.</p>
          </div>
        </div>
      `;
    }

    if (subject && html) {
      await transporter.sendMail({
        from: `"ArtFlow Real-time" <${process.env.EMAIL_USER}>`,
        to: email,
        subject,
        html
      });
      console.log(`[Realtime] Notificação ${type} enviada para ${email}`);
    }
  } catch (error) {
    console.error(`[Realtime] Erro ao enviar notificação imediata:`, error);
  }
}
