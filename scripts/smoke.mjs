import fs from "node:fs/promises";
import path from "node:path";

const cwd = process.cwd();

const requiredFiles = [
  "package.json",
  "vite.config.ts",
  "src/main.tsx",
  "src/app/router.tsx",
  "src/lib/supabase.ts",
  "supabase/config.toml",
  "supabase/seed.sql",
  "supabase/migrations/20260401161000_phase_2_foundation.sql",
  "aiDocs/evidence/phase_2_voice_pipeline_boundaries.md",
  "aiDocs/evidence/logging_and_smoke_conventions.md",
  "aiDocs/evidence/demo_fallback_spec.md"
];

const optionalFiles = [".env", ".env.example", "vercel.json"];

const exists = async (target) => {
  try {
    await fs.access(path.join(cwd, target));
    return true;
  } catch {
    return false;
  }
};

const main = async () => {
  const missingRequired = [];
  for (const file of requiredFiles) {
    if (!(await exists(file))) {
      missingRequired.push(file);
    }
  }

  const optionalPresence = {};
  for (const file of optionalFiles) {
    optionalPresence[file] = await exists(file);
  }

  const result = {
    timestamp: new Date().toISOString(),
    scaffoldReady: missingRequired.length === 0,
    missingRequired,
    optionalPresence,
    notes: [
      "This smoke script checks repository foundation, not live Supabase connectivity.",
      "Use npm run typecheck and npm run build after npm install for code-level verification."
    ]
  };

  console.log(JSON.stringify(result, null, 2));

  if (missingRequired.length > 0) {
    process.exitCode = 1;
  }
};

void main();
