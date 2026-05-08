import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { checkAndNotifyUsers } from "../server/notifier.js";

/**
 * Endpoint de Cron para a Vercel
 * Roda o resumo diário de notificações.
 */
export default async function handler(req, res) {
  // 1. Proteção Simples (Evitar que qualquer um dispare o e-mail)
  // Recomenda-se adicionar uma variável CRON_SECRET no Vercel
  const authHeader = req.headers.authorization;
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Não autorizado" });
  }

  try {
    // 2. Inicializar Firebase Admin (se ainda não estiver inicializado)
    if (!admin.apps.length) {
      const serviceAccountPath = path.resolve(process.cwd(), "service-account.json");
      
      if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
      } else {
        // Fallback para variável de ambiente se o arquivo não existir (comum em produção)
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
          const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
          });
        } else {
          throw new Error("Service Account do Firebase não encontrada.");
        }
      }
    }

    const db = admin.firestore();
    
    // 3. Executar a varredura
    await checkAndNotifyUsers(db);

    return res.status(200).json({ success: true, message: "Resumo diário processado com sucesso." });
  } catch (error) {
    console.error("[Cron Error]", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
