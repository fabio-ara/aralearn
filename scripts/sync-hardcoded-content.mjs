import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const contentRoot = path.join(projectRoot, "content");
const outputPath = path.join(contentRoot, "hardcoded-content.js");

async function findSingleContentSource() {
  const entries = await fs.readdir(contentRoot, { withFileTypes: true });
  const candidates = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".json"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, "pt-BR"));

  if (!candidates.length) {
    throw new Error("Nenhum JSON encontrado em content/. Mantenha exatamente um arquivo-fonte para o hardcoded.");
  }

  if (candidates.length > 1) {
    throw new Error(
      "Há mais de um JSON em content/. Deixe apenas o hardcoded ativo antes de gerar o arquivo runtime: " +
      candidates.join(", ")
    );
  }

  return candidates[0];
}

async function main() {
  const sourceName = await findSingleContentSource();
  const sourcePath = path.join(contentRoot, sourceName);
  const raw = await fs.readFile(sourcePath, "utf8");
  const parsed = JSON.parse(raw);

  const payload = {
    sourceFile: sourceName,
    content: parsed,
    assets: {}
  };

  const output =
    "// Arquivo gerado automaticamente a partir do JSON hardcoded em content/.\n" +
    "// Depois de editar o JSON-fonte, rode: npm run build:hardcoded-content\n" +
    "window.AraLearnBundledContent = " +
    JSON.stringify(payload, null, 2) +
    ";\n";

  await fs.writeFile(outputPath, output, "utf8");
  process.stdout.write(`Hardcoded runtime atualizado em ${path.relative(projectRoot, outputPath)}.\n`);
}

main().catch((error) => {
  process.stderr.write(String((error && error.message) || error) + "\n");
  process.exitCode = 1;
});
