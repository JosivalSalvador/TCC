import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function globalSetup() {
  // Aponta para a raiz do monorepo
  const rootDir = path.resolve(__dirname, "..");

  console.log("🚀 [SETUP] A iniciar o Docker (Postgres, API e Web)...");
  // O --wait garante que o Playwright só avança quando o Postgres estiver "healthy"
  execSync("docker compose -f docker-compose.yml up -d --wait", {
    stdio: "inherit",
    cwd: rootDir,
  });

  console.log("🌱 [SETUP] A executar as Migrations e o Seed...");
  // Utiliza os scripts exatos que tens no package.json da raiz
  execSync("npm run db:deploy", { stdio: "inherit", cwd: rootDir });
  execSync("npm run db:seed", { stdio: "inherit", cwd: rootDir });

  console.log("✅ [SETUP] Ambiente pronto! A iniciar os testes E2E...");
}

export default globalSetup;
