import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const contentRoot = path.join(projectRoot, "content");
const outputPath = path.join(contentRoot, "hardcoded-content.js");

async function findContentSources() {
  const entries = await fs.readdir(contentRoot, { withFileTypes: true });
  const sourceFiles = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".json"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, "pt-BR"));

  if (!sourceFiles.length) {
    throw new Error("Nenhum JSON encontrado em content/. Mantenha pelo menos um arquivo-fonte para o hardcoded.");
  }

  return sourceFiles;
}

async function loadContentSource(sourceName) {
  const sourcePath = path.join(contentRoot, sourceName);
  const raw = await fs.readFile(sourcePath, "utf8");
  const parsed = JSON.parse(raw);

  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.courses)) {
    throw new Error(`Arquivo inválido em content/${sourceName}. Esperado um objeto com courses[].`);
  }

  return {
    sourceName,
    appTitle: typeof parsed.appTitle === "string" ? parsed.appTitle.trim() : "",
    courses: parsed.courses
  };
}

function resolveBundledAppTitle(sources) {
  const titles = [...new Set(sources.map((source) => source.appTitle).filter(Boolean))];
  if (titles.length > 1) {
    throw new Error(
      "Os JSONs em content/ usam appTitle diferentes. Unifique antes de gerar o runtime: " +
      titles.join(", ")
    );
  }
  return titles[0] || "AraLearn";
}

function collectBundledCourses(sources) {
  const seenCourseIds = new Map();
  return sources.flatMap((source) =>
    source.courses.map((course, courseIndex) => {
      const courseId = typeof course?.id === "string" ? course.id.trim() : "";
      if (!courseId) {
        throw new Error(`Curso sem id em content/${source.sourceName} na posição ${courseIndex + 1}.`);
      }

      const duplicateSource = seenCourseIds.get(courseId);
      if (duplicateSource) {
        throw new Error(
          `Curso duplicado com id "${courseId}" em content/${duplicateSource} e content/${source.sourceName}.`
        );
      }

      seenCourseIds.set(courseId, source.sourceName);
      return course;
    })
  );
}

async function main() {
  const sourceNames = await findContentSources();
  const sources = await Promise.all(sourceNames.map(loadContentSource));

  const payload = {
    sourceFiles: sourceNames,
    content: {
      appTitle: resolveBundledAppTitle(sources),
      courses: collectBundledCourses(sources)
    },
    assets: {}
  };

  const output =
    "// Arquivo gerado automaticamente a partir dos JSONs hardcoded em content/.\n" +
    "// Depois de editar os JSONs-fonte, rode: npm run build:hardcoded-content\n" +
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
