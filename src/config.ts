import dotenv from "dotenv";
import fs from "fs";
import path from "path";

function log(msg: string) {
  try {
    const p = path.resolve(process.cwd(), "startup.log");
    fs.appendFileSync(p, `[${new Date().toISOString()}] ${msg}\n`);
  } catch {
    // não quebra o app se não conseguir escrever
  }
}

dotenv.config();

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    log(`Missing env var: ${name}`);
    throw new Error(`Faltando variável de ambiente: ${name}`);
  }
  return v;
}

// logs úteis para diagnóstico em hosting
log(`Boot config.ts. PORT=${process.env.PORT ?? ""} DB_HOST=${process.env.DB_HOST ?? ""}`);

export const config = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  // em hosting gerenciado, 3000 costuma ser o default mais compatível
  port: Number(process.env.PORT ?? 3000),

  // Em produção, você vai setar CORS_ORIGIN no painel com o domínio do frontend temporário
  // Ex: https://xxxxx.hostingersite.com
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",

  db: {
    // 127.0.0.1 evita resolver localhost -> ::1 (IPv6) que te deu Access Denied
    host: process.env.DB_HOST ?? "127.0.0.1",
    port: Number(process.env.DB_PORT ?? 3306),
    user: required("DB_USER"),
    password: required("DB_PASSWORD"),
    name: required("DB_NAME")
  }
};