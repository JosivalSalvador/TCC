import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function globalTeardown() {
  const rootDir = path.resolve(__dirname, "..");

  console.log(
    "🧹 [TEARDOWN] A desligar os contentores e a apagar a base de dados...",
  );
  // O -v apaga os volumes, garantindo um ambiente limpo para a próxima vez
  execSync("docker compose -f docker-compose.yml down -v", {
    stdio: "inherit",
    cwd: rootDir,
  });

  console.log("✨ [TEARDOWN] Tudo limpo com sucesso!");
}

export default globalTeardown;
