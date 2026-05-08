import express from "express";
import Stripe from "stripe";
import dotenv from "dotenv";
import admin from "firebase-admin";
import bodyParser from "body-parser";
import fs from "fs";
import path from "path";
import cron from "node-cron";
import { checkAndNotifyUsers } from "./notifier.js";
import { setupRealtimeListeners } from "./listeners.js";

dotenv.config();

const stripe = new Stripe(process.env.VITE_STRIPE_SECRET_KEY, { apiVersion: "2022-11-15" });

// Inicializa Firebase Admin usando o arquivo service-account.json na raiz do projeto
const serviceAccountPath = path.resolve(process.cwd(), "service-account.json");
if (!fs.existsSync(serviceAccountPath)) {
  console.error("service-account.json não encontrado na raiz do projeto.");
  process.exit(1);
}
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const app = express();

app.post(
  "/webhook",
  bodyParser.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"]; 
    if (!sig) {
      return res.status(400).send("Missing stripe-signature header");
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.VITE_STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object;
          const userId = session.client_reference_id;
          const subscriptionId = session.subscription || null;

          let currentPeriodEnd = null;
          if (subscriptionId) {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            currentPeriodEnd = subscription.current_period_end;
          }

          if (userId) {
            const userRef = db.collection("users").doc(userId);
            const updateData = {
              stripeSubscriptionId: subscriptionId,
              subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
            };
            if (currentPeriodEnd) {
              updateData.currentPeriodEnd = admin.firestore.Timestamp.fromMillis(currentPeriodEnd * 1000);
            }
            await userRef.set(updateData, { merge: true });
            console.log(`Updated subscription for user ${userId} -> ${subscriptionId}`);
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
                  currentPeriodEnd: admin.firestore.Timestamp.fromMillis(currentPeriodEnd * 1000),
                  subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
                },
                { merge: true }
              );
            });
            await batch.commit();
            console.log(`Updated currentPeriodEnd for subscription ${subscriptionId}`);
          } else {
            console.warn(`Nenhum usuário encontrado com stripeSubscriptionId=${subscriptionId}`);
          }

          break;
        }

        default:
          console.log(`Unhandled event type ${event.type}`);
      }

      res.json({ received: true });
    } catch (err) {
      console.error("Error handling webhook event:", err);
      res.status(500).send("Internal Server Error");
    }
  }
);

const PORT = process.env.VITE_PORT || 4242;
app.listen(PORT, () => {
  console.log(`Stripe webhook server listening on port ${PORT}`);
  
  // Agendamento: Roda todos os dias às 08:00 da manhã
  // Formato: (minuto hora dia-do-mes mes dia-da-semana)
  cron.schedule("0 8 * * *", () => {
    checkAndNotifyUsers(db);
  }, {
    timezone: "America/Sao_Paulo"
  });

  console.log("[Scheduler] Tarefa de notificações agendada para as 08:00 (Brasília).");

  // Ativa o monitoramento em tempo real
  setupRealtimeListeners(db);

  // Opcional: Roda uma vez ao iniciar o servidor para teste (remova se desejar)
  // checkAndNotifyUsers(db);
});
