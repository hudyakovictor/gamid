import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const sourceRoot = resolve(process.cwd(), "apps/game-client/src");
// Reveal-only response fields may be referenced by the post-seal UI. The
// public projection and runtime boundary tests verify that their values are
// not present before the server reveal; this static gate focuses on patterns
// that would fabricate hidden state or move authoritative scoring to the client.
const forbiddenPatterns = [
  /hiddenLayer/,
  /futureSeries/,
  /revealLayer/,
  /calculateProcessScore/,
  /state\.score/,
  /scenario\.outcome/
];

function collectTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory()
      ? collectTypeScriptFiles(path)
      : path.endsWith(".ts") && !path.endsWith(".test.ts") ? [path] : [];
  });
}

const violations: string[] = [];
for (const filePath of collectTypeScriptFiles(sourceRoot)) {
  const source = readFileSync(filePath, "utf8");
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(source)) {
      violations.push(`${filePath}: forbidden public-client pattern ${pattern}`);
    }
  }
}

if (violations.length > 0) {
  throw new Error(`Public client boundary validation failed:\n${violations.join("\n")}`);
}

console.log("Public client boundary validation passed: no hidden/future truth or client-authoritative scoring found.");
