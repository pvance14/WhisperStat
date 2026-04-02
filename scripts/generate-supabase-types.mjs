import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const outputPath = path.join(process.cwd(), "src", "lib", "database.generated.ts");

const main = async () => {
  const { stdout } = await execFileAsync(
    "npx",
    ["supabase", "gen", "types", "typescript", "--linked", "--schema", "public"],
    {
      cwd: process.cwd(),
      maxBuffer: 10 * 1024 * 1024
    }
  );

  await fs.writeFile(outputPath, stdout, "utf8");
  console.log(`Generated Supabase types at ${outputPath}`);
};

main().catch((error) => {
  console.error(
    "Failed to generate Supabase types. Make sure the project is linked first with `npm run supabase:link -- --project-ref <ref>`."
  );
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
