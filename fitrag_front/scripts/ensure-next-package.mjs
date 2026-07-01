import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const nextDir = path.join(process.cwd(), ".next");
const packageJsonPath = path.join(nextDir, "package.json");

if (!existsSync(packageJsonPath)) {
  await mkdir(nextDir, { recursive: true });
  await writeFile(packageJsonPath, '{ "type": "commonjs" }\n');
}
