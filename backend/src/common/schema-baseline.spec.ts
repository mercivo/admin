import { readdirSync, readFileSync } from "fs";
import { join } from "path";

describe("pre-launch schema baseline", () => {
  const migrationDirectory = join(__dirname, "..", "migrations");
  const migrations = readdirSync(migrationDirectory).filter((file) =>
    file.endsWith(".ts"),
  );

  it("keeps a single authoritative initial-schema migration", () => {
    expect(migrations).toHaveLength(1);
    expect(migrations[0]).toMatch(/-InitialSchema\.ts$/);
  });

  it("does not contain historical data patches in the baseline migration", () => {
    const source = readFileSync(
      join(migrationDirectory, migrations[0]),
      "utf8",
    );
    expect(source).not.toMatch(/`(?:ALTER|UPDATE|INSERT|DELETE)\s/i);
  });
});
