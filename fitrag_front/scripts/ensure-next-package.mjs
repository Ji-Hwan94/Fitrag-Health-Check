import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const ensurePackageJson = async (nextDir) => {
  const packageJsonPath = path.join(nextDir, "package.json");

  if (!existsSync(packageJsonPath)) {
    await mkdir(nextDir, { recursive: true });
    await writeFile(packageJsonPath, '{ "type": "commonjs" }\n');
  }
};

await ensurePackageJson(path.join(process.cwd(), ".next"));

if (process.env.VERCEL) {
  await ensurePackageJson(path.resolve(process.cwd(), "..", ".next"));
}
