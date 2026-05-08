import Stripe from "stripe";
import admin from "firebase-admin";

const stripe = new Stripe(process.env.VITE_STRIPE_SECRET_KEY, {
  apiVersion: "2022-11-15",
});

if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  } catch (error) {
    console.error("Erro ao inicializar Firebase:", error);
  }
}

const db = admin.firestore();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // Verifica token Firebase
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Não autorizado" });
  }

  let uid;
  try {
    const decoded = await admin.auth().verifyIdToken(authHeader.split("Bearer ")[1]);
    uid = decoded.uid;
  } catch {
    return res.status(401).json({ error: "Token inválido" });
  }

  // Busca stripeCustomerId do Firestore
  const userSnap = await db.collection("users").doc(uid).get();
  if (!userSnap.exists) {
    return res.status(404).json({ error: "Usuário não encontrado" });
  }

  const { stripeCustomerId } = userSnap.data();
  if (!stripeCustomerId) {
    return res.status(400).json({ error: "Nenhuma assinatura encontrada" });
  }

  try {
    const origin = req.headers.origin || "https://artflow-teal.vercel.app";
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${origin}/dashboard`,
    });
    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("Erro ao criar sessão do portal:", err);
    return res.status(500).json({ error: "Erro ao criar sessão do portal" });
  }
}
