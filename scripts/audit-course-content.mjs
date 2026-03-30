import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const contentDir = path.resolve(__dirname, "..", "content");

const files = fs
  .readdirSync(contentDir)
  .filter((name) => name.endsWith(".json"))
  .sort();

const errors = [];
const warnings = [];

const bannedTextRules = [
  { label: "texto de bastidor", pattern: /\bblueprint\b/i },
  { label: "meta-didática explícita", pattern: /Riscos de compreensão/i },
  { label: "meta-didática explícita", pattern: /\briscos didáticos\b/i },
  { label: "texto genérico de trilha", pattern: /\bA seguir, a mesma ideia reaparece\b/i },
  { label: "texto genérico de fechamento", pattern: /\bUse este quadro como revisão\b/i },
  { label: "popup genérico de vocabulário", pattern: /\bEsses termos pertencem ao vocabulário técnico do tópico\b/i },
  { label: "popup genérico de confusão", pattern: /\bEssas opções apontam confusões que realmente atrapalham\b/i },
  { label: "meta-didática explícita", pattern: /\btropeço\b/i },
  { label: "meta-didática explícita", pattern: /\btropeços\b/i },
  { label: "meta-didática explícita", pattern: /\bo curso quer\b/i },
  { label: "meta-didática explícita", pattern: /\ba lição quer\b/i },
  { label: "meta-didática explícita", pattern: /\bexemplo dado em aula\b/i },
  { label: "meta-didática explícita", pattern: /\bsequência mínima de interação que aparece na aula\b/i },
  { label: "meta-didática explícita", pattern: /\bA aula quer\b/i },
  { label: "meta-didática explícita", pattern: /\bconvenção usada nesta disciplina\b/i },
  { label: "meta-didática explícita", pattern: /\bnesta abordagem local\b/i },
  { label: "meta-didática explícita", pattern: /\bao longo do semestre\b/i },
  { label: "formulação técnica ruim", pattern: /\brotina sem retorno principal\b/i },
  { label: "referência editorial fraca", pattern: /\bnível introdutório\b/i },
  { label: "referência à interface", pattern: /\bformato mobile\b/i },
  { label: "referência à interface", pattern: /\bcaber bem no app\b/i },
  { label: "referência à interface", pattern: /\bjustiça didática\b/i },
  { label: "referência à interface", pattern: /\bno app\b/i },
  { label: "referência à interface", pattern: /\bno celular\b/i },
  { label: "texto editorial", pattern: /\blista original\b/i },
  { label: "texto editorial", pattern: /\brecorte atual\b/i },
  { label: "texto editorial", pattern: /\bdeliberadamente curto\b/i },
  { label: "texto editorial", pattern: /\bvale repetir bastante\b/i },
  { label: "texto editorial", pattern: /\bi\/j corrompido\b/i },
  { label: "referência editorial fraca", pattern: /\bcurso real\b/i },
  { label: "referência editorial fraca", pattern: /\bescopo operacional do curso\b/i },
  { label: "referência editorial fraca", pattern: /\boferta real do curso\b/i },
  { label: "meta-didática explícita", pattern: /\bRiscos mapeados\b/i },
  { label: "dependência de card anterior", pattern: /\bAinda com\b/i },
  { label: "dependência de card anterior", pattern: /\blaço acima\b/i },
  { label: "dependência de card anterior", pattern: /\bfor acima\b/i },
  { label: "dependência de card anterior", pattern: /\bmesmo grafo-base\b/i },
  { label: "dependência de card anterior", pattern: /\bagora compare\b/i },
  { label: "dependência de card anterior", pattern: /\besse mesmo grafo\b/i }
];

const warningTextRules = [
  { label: "referência ao próprio card", pattern: /\bo card\b/i },
  { label: "referência ao próprio card", pattern: /\bdeste card\b/i },
  { label: "referência ao próprio card", pattern: /\bdo card\b/i },
  { label: "arranjo de turma explícito", pattern: /\btrabalho em dupla\b/i },
  { label: "sequenciamento autoral visível", pattern: /\bnos próximos cards\b/i },
  { label: "sequenciamento autoral visível", pattern: /\bUse estes termos nos próximos cards\b/i },
  { label: "frase de apoio genérica", pattern: /\bantes da prática\b/i },
  { label: "frase de apoio genérica", pattern: /\bapós a prática\b/i },
  { label: "frase de apoio genérica", pattern: /\bUse este checklist\b/i },
  { label: "frase de apoio genérica", pattern: /\bmicropráticas\b/i },
  { label: "frase de apoio genérica", pattern: /\bestabilizar a leitura\b/i },
  { label: "frase de apoio genérica", pattern: /\bleitura estável\b/i },
  { label: "frase de apoio genérica", pattern: /\bobjetivo funcional\b/i },
  { label: "foco pouco específico", pattern: /\b[oO] foco é\b/i },
  { label: "foco pouco específico", pattern: /\b[aA]qui o foco é\b/i }
];

const lessonSubtitleAuthorVoice = /^(Apresentar|Fazer|Consolidar|Retomar|Mapear|Mostrar|Separar|Introduzir|Explicar|Comparar|Trabalhar|Guiar|Ensinar|Dar|Reduzir)\b/;

function addIssue(bucket, file, ref, message, sample) {
  const suffix = sample ? ` -> ${sample}` : "";
  bucket.push(`${file}: ${ref}: ${message}${suffix}`);
}

function checkText(file, ref, value) {
  if (typeof value !== "string") return;
  const trimmed = value.trim();
  if (!trimmed) return;
  for (const rule of bannedTextRules) {
    if (rule.pattern.test(trimmed)) {
      addIssue(errors, file, ref, rule.label, trimmed);
    }
  }
  for (const rule of warningTextRules) {
    if (rule.pattern.test(trimmed)) {
      addIssue(warnings, file, ref, rule.label, trimmed);
    }
  }
}

function walkBlock(file, lesson, step, node, refBase, seenIds) {
  if (!node || typeof node !== "object") return;

  if (typeof node.id === "string") {
    seenIds.set(node.id, (seenIds.get(node.id) || 0) + 1);
  }

  for (const key of ["title", "subtitle", "value", "result"]) {
    if (typeof node[key] === "string") {
      checkText(file, `${refBase}.${key}`, node[key]);
    }
  }

  if (node.kind === "simulator" && Array.isArray(node.options) && node.options.length > 1) {
    const firstOptionId = node.options[0] && typeof node.options[0].id === "string" ? node.options[0].id : "";
    if (firstOptionId.endsWith("option-01")) {
      addIssue(
        warnings,
        file,
        `${lesson.id}/${step.id}/${node.id || node.kind}`,
        "simulator começa com a opção original 01 na primeira posição",
        String(node.options[0].value || "")
      );
    }
  }

  if (Array.isArray(node.options)) {
    node.options.forEach((option, index) => {
      walkBlock(file, lesson, step, option, `${refBase}.options[${index}]`, seenIds);
    });
  }

  if (Array.isArray(node.popupBlocks)) {
    node.popupBlocks.forEach((block, index) => {
      walkBlock(file, lesson, step, block, `${refBase}.popupBlocks[${index}]`, seenIds);
    });
  }

  if (Array.isArray(node.blocks)) {
    node.blocks.forEach((block, index) => {
      walkBlock(file, lesson, step, block, `${refBase}.blocks[${index}]`, seenIds);
    });
  }

  if (Array.isArray(node.rows)) {
    node.rows.forEach((row, rowIndex) => {
      row.forEach((cell, cellIndex) => {
        if (typeof cell === "string") {
          checkText(file, `${refBase}.rows[${rowIndex}][${cellIndex}]`, cell);
          return;
        }
        if (cell && typeof cell === "object") {
          walkBlock(file, lesson, step, cell, `${refBase}.rows[${rowIndex}][${cellIndex}]`, seenIds);
        }
      });
    });
  }
}

for (const file of files) {
  const fullPath = path.join(contentDir, file);
  const raw = fs.readFileSync(fullPath, "utf8");
  const data = JSON.parse(raw);
  const seenIds = new Map();

  for (const course of data.courses || []) {
    if (typeof course.id === "string") {
      seenIds.set(course.id, (seenIds.get(course.id) || 0) + 1);
    }
    for (const module of course.modules || []) {
      if (typeof module.id === "string") {
        seenIds.set(module.id, (seenIds.get(module.id) || 0) + 1);
      }
      for (const lesson of module.lessons || []) {
        if (typeof lesson.id === "string") {
          seenIds.set(lesson.id, (seenIds.get(lesson.id) || 0) + 1);
        }
        if (typeof lesson.subtitle === "string" && lessonSubtitleAuthorVoice.test(lesson.subtitle.trim())) {
          addIssue(errors, file, `${lesson.id}.subtitle`, "subtitle em voz de plano de aula", lesson.subtitle.trim());
        }
        if (typeof lesson.subtitle === "string" && /\bo estudante\b/i.test(lesson.subtitle.trim())) {
          addIssue(errors, file, `${lesson.id}.subtitle`, "subtitle em voz indireta de relatório pedagógico", lesson.subtitle.trim());
        }

        for (const step of lesson.steps || []) {
          if (typeof step.id === "string") {
            seenIds.set(step.id, (seenIds.get(step.id) || 0) + 1);
          }
          checkText(file, `${lesson.id}/${step.id}.title`, step.title);
          checkText(file, `${lesson.id}/${step.id}.subtitle`, step.subtitle);

          if (!Array.isArray(step.blocks) || step.blocks.length === 0) {
            addIssue(errors, file, `${lesson.id}/${step.id}`, "step sem blocks[]");
            continue;
          }

          const buttonCount = step.blocks.filter((block) => block && block.kind === "button").length;
          if (buttonCount !== 1) {
            addIssue(errors, file, `${lesson.id}/${step.id}`, "step deve ter exatamente um bloco button", String(buttonCount));
          }
          if (step.blocks[step.blocks.length - 1]?.kind !== "button") {
            addIssue(errors, file, `${lesson.id}/${step.id}`, "último bloco do step deve ser button");
          }

          if (step.type === "lesson_complete") {
            for (const block of step.blocks || []) {
              if ((block.kind === "heading" || block.kind === "paragraph") && block.align !== "center") {
                addIssue(
                  errors,
                  file,
                  `${lesson.id}/${step.id}/${block.id || block.kind}`,
                  "bloco textual de lesson_complete deve estar centralizado",
                  String(block.align || "")
                );
              }
            }
          }

          (step.blocks || []).forEach((block, index) => {
            walkBlock(file, lesson, step, block, `${lesson.id}/${step.id}.blocks[${index}]`, seenIds);
          });
        }
      }
    }
  }

  for (const [id, count] of seenIds.entries()) {
    if (count > 1) {
      addIssue(errors, file, id, "id duplicado", String(count));
    }
  }
}

if (errors.length) {
  console.error("Falhas de auditoria de conteúdo:");
  for (const issue of errors) {
    console.error(`- ${issue}`);
  }
}

if (warnings.length) {
  console.warn("Avisos de auditoria de conteúdo:");
  for (const issue of warnings) {
    console.warn(`- ${issue}`);
  }
}

if (errors.length) {
  process.exit(1);
}

console.log(
  warnings.length
    ? `Auditoria de conteúdo concluída sem erros (${warnings.length} aviso(s)).`
    : "Auditoria de conteúdo concluída sem erros."
);
