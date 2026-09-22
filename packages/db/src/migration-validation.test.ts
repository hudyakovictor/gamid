import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { validateMigrations } from "../../../scripts/validate-migrations.js";

const REPO_ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "../../..");

/**
 * This test mirrors `pnpm validate:migrations` so the migration gate is also
 * enforced by `pnpm test` (a mandatory CI step). Because the CI workflow file
 * itself cannot be updated in this environment (missing `workflows`
 * permission), the migration validator is nested inside an already-executed CI
 * command; `pnpm validate:migrations` remains available as a direct command.
 */

test("validate:migrations passes for the canonical repository state", () => {
  const summary = validateMigrations({ cwd: REPO_ROOT });
  assert.ok(summary.some((line) => line.includes("drift check passed")));
});

test("validate:migrations FAILS when legacy infra/migrations/** returns with files", () => {
  const tempRoot = mkdtempSync(join(tmpdir(), "sa-migr-validate-"));
  try {
    const infraDir = join(tempRoot, "infra", "migrations");
    mkdirSync(infraDir, { recursive: true });
    writeFileSync(join(infraDir, "0001_foundation.sql"), "CREATE TABLE legacy (id TEXT);\n");
    assert.throws(
      () => validateMigrations({ cwd: tempRoot }),
      /Legacy infra\/migrations\/\*\* must not contain files/
    );
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
