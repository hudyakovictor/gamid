import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const manifestPath = resolve(process.cwd(), "assets/asset-manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
  manifestStatus: string;
  assets: Array<{
    assetId: string;
    path: string;
  }>;
};

if (manifest.manifestStatus !== "draft") {
  throw new Error("Asset manifest must remain draft until provenance is verified");
}

const ids = new Set<string>();
for (const asset of manifest.assets) {
  if (ids.has(asset.assetId)) {
    throw new Error(`Duplicate assetId: ${asset.assetId}`);
  }
  ids.add(asset.assetId);

  if (!asset.path.startsWith("assets/") || asset.path.includes("..")) {
    throw new Error(`Asset path is outside the asset root: ${asset.path}`);
  }

  if (!existsSync(resolve(process.cwd(), asset.path))) {
    throw new Error(`Asset file is missing: ${asset.path}`);
  }
}

console.log(`Asset manifest validation passed: ${manifest.assets.length} draft assets are registered.`);
