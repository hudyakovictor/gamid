import type { ScenarioPackage } from "../../contracts/src/scenario.js";
import type { DatabaseHandle } from "./database.js";

export type FoundationSeedInput = {
  scenario: ScenarioPackage;
  userId?: string;
  externalId?: string;
};

export function seedFoundation({
  sqlite,
  scenario,
  userId = "seed-user-001",
  externalId = "fixture:seed-user-001"
}: DatabaseHandle & FoundationSeedInput): void {
  const now = new Date().toISOString();
  const transaction = sqlite.transaction(() => {
    sqlite.prepare(`
      INSERT INTO users (user_id, external_id, created_at)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id) DO NOTHING
    `).run(userId, externalId, now);

    sqlite.prepare(`
      INSERT INTO scenarios (
        scenario_id,
        version,
        scenario_level,
        mode,
        content_version,
        data_version,
        future_hash,
        package_json,
        review_status,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(scenario_id, version) DO UPDATE SET
        version = excluded.version,
        scenario_level = excluded.scenario_level,
        mode = excluded.mode,
        content_version = excluded.content_version,
        data_version = excluded.data_version,
        future_hash = excluded.future_hash,
        package_json = excluded.package_json,
        review_status = excluded.review_status,
        updated_at = excluded.updated_at
    `).run(
      scenario.scenarioId,
      scenario.version,
      scenario.scenarioLevel,
      scenario.mode,
      scenario.contentVersion,
      scenario.dataVersion,
      scenario.futureHash,
      JSON.stringify(scenario),
      scenario.reviewStatus,
      now,
      now
    );
  });

  transaction();
}
