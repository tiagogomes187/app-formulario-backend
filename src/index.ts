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
app.set("trust proxy", 1);

app.use(helmet());
app.use(morgan("combined"));
app.use(express.json({ limit: "10kb" }));

app.use(
  cors({
    origin: config.corsOrigin,
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

const submissionSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  message: z.string().trim().min(1).max(2000)
});

app.get("/health", (_req: Request, res: Response) => res.json({ ok: true }));

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

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Erro interno" });
});

app.listen(config.port, "0.0.0.0", () => {
  console.log(`API rodando na porta ${config.port}`);
});
