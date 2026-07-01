import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const packageJson = '{ "type": "commonjs" }\n';

const ensureNextMetadata = async (nextDir) => {
  const packageJsonPath = path.join(nextDir, "package.json");
  const routesManifestPath = path.join(nextDir, "routes-manifest.json");
  const deterministicRoutesManifestPath = path.join(
    nextDir,
    "routes-manifest-deterministic.json",
  );

  if (!existsSync(packageJsonPath)) {
    await mkdir(nextDir, { recursive: true });
    await writeFile(packageJsonPath, packageJson);
  }

  if (
    existsSync(routesManifestPath) &&
    !existsSync(deterministicRoutesManifestPath)
  ) {
    await copyFile(routesManifestPath, deterministicRoutesManifestPath);
  }
};

const appNextDir = path.join(process.cwd(), ".next");
await ensureNextMetadata(appNextDir);

if (process.env.VERCEL) {
  const vercelRootNextDir = path.resolve(process.cwd(), "..", ".next");
  await mkdir(vercelRootNextDir, { recursive: true });
  await writeFile(path.join(vercelRootNextDir, "package.json"), packageJson);

  const appRoutesManifestPath = path.join(appNextDir, "routes-manifest.json");
  if (existsSync(appRoutesManifestPath)) {
    await copyFile(
      appRoutesManifestPath,
      path.join(vercelRootNextDir, "routes-manifest-deterministic.json"),
    );
  }
}
