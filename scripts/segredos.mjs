#!/usr/bin/env node
/**
 * Verificação de segredos antes do commit (regra da família: ../CLAUDE.md > Segurança dos dados pessoais).
 *   node scripts/segredos.mjs        → confere o que está no stage (é o que o pre-commit roda)
 *   node scripts/segredos.mjs --tudo → confere todos os arquivos versionados
 * Também barra backup e exportação de dados pessoais (o repositório só leva código).
 * Se o gitleaks estiver instalado, ele roda também.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

const tudo = process.argv.includes("--tudo");
const git = (...args) => execFileSync("git", args, { encoding: "utf8" });

const arquivos = (tudo ? git("ls-files") : git("diff", "--cached", "--name-only", "--diff-filter=ACMR"))
  .split("\n")
  .filter(Boolean);

const PADROES = [
  ["token do GitHub", /\b(gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/],
  ["chave da Anthropic", /\bsk-ant-[A-Za-z0-9_-]{20,}/],
  ["chave da OpenAI", /\bsk-(proj-)?[A-Za-z0-9]{32,}/],
  ["chave da AWS", /\bAKIA[0-9A-Z]{16}\b/],
  ["chave privada", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["JWT (chave do Supabase)", /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/],
  ["service_role do Supabase", /service_role["']?\s*[:=]\s*["']?eyJ/i],
  ["token da Vercel", /\bvercel_[A-Za-z0-9]{20,}/i],
  ["variável de segredo preenchida", /^\s*(BRAPI_TOKEN|SUPABASE_SERVICE_ROLE_KEY|NEXT_PUBLIC_SUPABASE_ANON_KEY|ANTHROPIC_API_KEY)\s*=\s*\S{8,}/m],
];
const IGNORAR = /(^|\/)(package-lock\.json|.*\.(png|jpe?g|gif|webp|ico|woff2?|ttf|pdf|zip))$/;

const problemas = [];
for (const f of arquivos) {
  if (/(^|\/)\.env(\.|$)/.test(f) && !f.endsWith(".env.local.example")) {
    problemas.push(`${f}: arquivo .env não pode ir para o git`);
    continue;
  }
  if (/(^|\/)irineu-backup[^/]*$|\.(csv|ofx|qif)$/i.test(f)) {
    problemas.push(`${f}: backup ou extrato com dado pessoal não pode ir para o git`);
    continue;
  }
  if (IGNORAR.test(f) || !existsSync(f)) continue;
  const texto = tudo ? readFileSync(f, "utf8") : git("show", `:${f}`);
  for (const [nome, re] of PADROES) {
    const m = texto.match(re);
    if (m) {
      const linha = texto.slice(0, m.index).split("\n").length;
      problemas.push(`${f}:${linha}: parece ${nome}`);
    }
  }
}

const gitleaks = spawnSync("gitleaks", ["version"], { encoding: "utf8" });
if (gitleaks.status === 0) {
  const r = spawnSync("gitleaks", tudo ? ["dir", ".", "--no-banner", "--redact"] : ["git", "--staged", "--no-banner", "--redact"], { stdio: "inherit" });
  if (r.status !== 0) problemas.push("gitleaks encontrou possíveis segredos (veja acima)");
}

if (problemas.length) {
  console.error("\n✗ Commit barrado: possível segredo ou arquivo proibido.\n");
  for (const p of problemas) console.error("  - " + p);
  console.error("\nTire o segredo do arquivo (ele vai no .env.local ou na Vercel) e tente de novo.\n");
  process.exit(1);
}
console.log(`✓ Sem segredos em ${arquivos.length} ${arquivos.length === 1 ? "arquivo" : "arquivos"}${gitleaks.status === 0 ? " (com gitleaks)" : ""}.`);
