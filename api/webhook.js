import Stripe from "stripe";
import admin from "firebase-admin";

const stripe = new Stripe(process.env.VITE_STRIPE_SECRET_KEY, {
  apiVersion: "2022-11-15",
});

// Inicializar o Firebase Admin
if (!admin.apps.length) {
  try {
    // Lemos a chave do Firebase de uma variável de ambiente (Mais seguro e funciona na Vercel)
    // Na Vercel, crie a variável 'FIREBASE_SERVICE_ACCOUNT' e cole todo o conteúdo do seu service-account.json lá.
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error("Erro ao inicializar Firebase:", error);
  }
}

const db = admin.firestore();

// Precisamos desativar o bodyParser padrão da Vercel para ler o "raw body", pois a Stripe precisa dele para verificar a assinatura
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper para ler o body da requisição
async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

// Converte timestamp Unix (segundos) do Stripe para Firestore Timestamp
// Usa o construtor direto para evitar problemas de ponto flutuante no fromMillis()
function stripeTimestampToFirestore(unixSeconds) {
  const seconds = Math.trunc(Number(unixSeconds)); // garante inteiro puro
  if (!Number.isFinite(seconds)) {
    throw new Error(`Timestamp inválido recebido do Stripe: ${unixSeconds}`);
  }
  return new admin.firestore.Timestamp(seconds, 0);
}

export default async function handler(req, res) {
  // Apenas aceitar método POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const sig = req.headers["stripe-signature"];
  
  if (!sig) {
    return res.status(400).send("Faltando o header stripe-signature");
  }

  // Lemos o corpo bruto (raw) da requisição
  const reqBuffer = await buffer(req);

  let event;

  try {
    // Verifica a assinatura
    event = stripe.webhooks.constructEvent(
      reqBuffer,
      sig,
      process.env.VITE_STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Falha na verificação da assinatura do Webhook:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    // Processamento dos eventos
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.client_reference_id;
        const subscriptionId = session.subscription || null;
        const customerId = session.customer || null;

        let currentPeriodEnd = null;
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          currentPeriodEnd = subscription.current_period_end;
        }

        if (userId) {
          const userRef = db.collection("users").doc(userId);
          const updateData = {
            stripeSubscriptionId: subscriptionId,
            stripeCustomerId: customerId,
            subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
          };
          if (currentPeriodEnd) {
            updateData.currentPeriodEnd = stripeTimestampToFirestore(currentPeriodEnd);
          }
          await userRef.set(updateData, { merge: true });
          console.log(`[checkout.session.completed] user=${userId} sub=${subscriptionId} customer=${customerId}`);
        } else {
          console.warn("checkout.session.completed without client_reference_id");
        }

        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        if (!subscriptionId) break;

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const currentPeriodEnd = subscription.current_period_end;

        const usersSnap = await db.collection("users").where("stripeSubscriptionId", "==", subscriptionId).get();
        if (!usersSnap.empty) {
          const batch = db.batch();
          usersSnap.forEach((doc) => {
            const ref = db.collection("users").doc(doc.id);
            batch.set(
              ref,
              {
                currentPeriodEnd: stripeTimestampToFirestore(currentPeriodEnd),
                subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
              },
              { merge: true }
            );
          });
          await batch.commit();
          console.log(`[invoice.payment_succeeded] currentPeriodEnd atualizado para assinatura ${subscriptionId}`);
        } else {
          console.warn(`[invoice.payment_succeeded] Nenhum usuário encontrado com stripeSubscriptionId=${subscriptionId}`);
        }

        break;
      }

      // Disparado quando a assinatura é cancelada (pelo usuário ou por falha de pagamento)
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const subscriptionId = subscription.id;

        const usersSnap = await db.collection("users").where("stripeSubscriptionId", "==", subscriptionId).get();
        if (!usersSnap.empty) {
          const batch = db.batch();
          usersSnap.forEach((doc) => {
            const ref = db.collection("users").doc(doc.id);
            batch.set(
              ref,
              {
                stripeSubscriptionId: null,
                currentPeriodEnd: null,
                subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
              },
              { merge: true }
            );
          });
          await batch.commit();
          console.log(`[customer.subscription.deleted] Assinatura ${subscriptionId} cancelada no Firestore`);
        } else {
          console.warn(`[customer.subscription.deleted] Nenhum usuário encontrado com stripeSubscriptionId=${subscriptionId}`);
        }

        break;
      }

      // Disparado em renovações e mudanças de plano — garante sincronia
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const subscriptionId = subscription.id;
        const status = subscription.status; // active, past_due, canceled, etc.

        // Na API version 2025+, current_period_end foi movido para items.data[0]
        // Suportamos ambas as versões com fallback
        const currentPeriodEnd =
          subscription.current_period_end
          ?? subscription.items?.data?.[0]?.current_period_end;

        if (!currentPeriodEnd) {
          console.warn(`[customer.subscription.updated] current_period_end não encontrado na assinatura ${subscriptionId}`);
          break;
        }

        const usersSnap = await db.collection("users").where("stripeSubscriptionId", "==", subscriptionId).get();
        if (!usersSnap.empty) {
          const batch = db.batch();
          usersSnap.forEach((doc) => {
            const ref = db.collection("users").doc(doc.id);
            batch.set(
              ref,
              {
                currentPeriodEnd: stripeTimestampToFirestore(currentPeriodEnd),
                stripeSubscriptionStatus: status,
                subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
              },
              { merge: true }
            );
          });
          await batch.commit();
          console.log(`[customer.subscription.updated] Assinatura ${subscriptionId} -> status: ${status}, currentPeriodEnd: ${new Date(currentPeriodEnd * 1000).toISOString()}`);
        } else {
          console.warn(`[customer.subscription.updated] Nenhum usuário encontrado com stripeSubscriptionId=${subscriptionId}`);
        }

        break;
      }

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    // Responder ao Stripe para confirmar recebimento
    res.status(200).json({ received: true });
  } catch (err) {
    console.error("Erro interno ao processar webhook:", err);
    res.status(500).send("Internal Server Error");
  }
}
