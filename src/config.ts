import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

function log(msg: string) {
  try {
    const p = path.resolve(process.cwd(), "startup.log");
    fs.appendFileSync(p, `[${new Date().toISOString()}] ${msg}\n`);
  } catch {
    // se não conseguir escrever, não quebra o app
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

log(`Boot config.ts. PORT env=${process.env.PORT ?? ""} DB_HOST env=${process.env.DB_HOST ?? ""}`);

export const config = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 3000),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  db: {
    host: process.env.DB_HOST ?? "127.0.0.1",
    port: Number(process.env.DB_PORT ?? 3306),
    user: required("DB_USER"),
    password: required("DB_PASSWORD"),
    name: required("DB_NAME")
  }
};
