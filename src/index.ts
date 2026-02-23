import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import { z } from "zod";
import { pool } from "./db";
import { config } from "./config";
import type { ResultSetHeader } from "mysql2";

const app = express();

// comum em hosting com proxy/CDN
app.set("trust proxy", 1);

app.use(helmet());
app.use(morgan("combined"));
app.use(express.json({ limit: "10kb" }));

// CORS: permitir somente a origem configurada.
// Dica: quando o frontend estiver no ar, coloque CORS_ORIGIN com o domínio temporário dele.
app.use(
  cors({
    origin: (origin, callback) => {
      // requests sem Origin (ex.: curl) devem passar
      if (!origin) return callback(null, true);

      // origem única configurada
      if (origin === config.corsOrigin) return callback(null, true);

      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["POST", "GET"],
    allowedHeaders: ["Content-Type"]
  })
);

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200
  })
);

// schema de validação
const submissionSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  message: z.string().trim().min(1).max(2000)
});

// rota raiz (alguns health-checks usam "/")
app.get("/", (_req: Request, res: Response) => res.status(200).send("ok"));

// health simples (não depende do banco)
app.get("/health", (_req: Request, res: Response) => res.json({ ok: true }));

// opcional: readiness que testa o banco (pode te ajudar a diagnosticar)
app.get("/ready", async (_req: Request, res: Response) => {
  try {
    await pool.query("SELECT 1");
    return res.json({ ok: true, db: "up" });
  } catch {
    return res.status(503).json({ ok: false, db: "down" });
  }
});

app.post("/api/submissions", async (req: Request, res: Response) => {
  const parsed = submissionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Dados inválidos",
      details: parsed.error.flatten()
    });
  }

  const { name, email, message } = parsed.data;

  const [result] = await pool.execute<ResultSetHeader>(
    "INSERT INTO submissions (name, email, message, created_at) VALUES (?, ?, ?, NOW())",
    [name, email, message]
  );

  return res.status(201).json({ id: result.insertId });
});

// handler final de erro (não vaza detalhes)
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Erro interno" });
});

console.log("Starting app. PORT env=", process.env.PORT);

app.listen(config.port, "0.0.0.0", () => {
  console.log(`API rodando na porta ${config.port}`);
});