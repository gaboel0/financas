// Copia o banco e o .env.local do projeto para %APPDATA%\FinancasCasa (somente se ainda não existirem).
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dest = path.join(process.env.APPDATA, "FinancasCasa");
const destData = path.join(dest, "data");
fs.mkdirSync(destData, { recursive: true });

const srcDb = path.join(root, "data", "financas.db");
const dstDb = path.join(destData, "financas.db");
if (fs.existsSync(dstDb)) console.log("banco já existe, mantido:", dstDb);
else if (fs.existsSync(srcDb)) {
  const d = new DatabaseSync(srcDb);
  d.exec("PRAGMA wal_checkpoint(TRUNCATE)");
  d.close();
  fs.copyFileSync(srcDb, dstDb);
  console.log("banco copiado ->", dstDb);
} else console.log("sem banco de origem:", srcDb);

const srcEnv = path.join(root, ".env.local");
const dstEnv = path.join(dest, ".env.local");
if (fs.existsSync(dstEnv)) console.log(".env.local já existe, mantido:", dstEnv);
else if (fs.existsSync(srcEnv)) {
  fs.copyFileSync(srcEnv, dstEnv);
  console.log(".env.local copiado ->", dstEnv);
} else console.log("sem .env.local de origem");
