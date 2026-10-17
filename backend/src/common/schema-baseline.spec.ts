import { readdirSync, readFileSync } from "fs";
import { join } from "path";

describe("schema migration history", () => {
  const migrationDirectory = join(__dirname, "..", "migrations");
  const migrations = readdirSync(migrationDirectory).filter((file) => file.endsWith(".ts")).sort();

  it("keeps one authoritative initial migration followed by ordered forward migrations", () => {
    expect(migrations[0]).toMatch(/-InitialSchema\.ts$/);
    expect(migrations.filter(file => /-InitialSchema\.ts$/.test(file))).toHaveLength(1);
    expect(migrations.map(file => Number(file.split('-')[0]))).toEqual([...migrations.map(file => Number(file.split('-')[0]))].sort((a, b) => a - b));
  });

  it("does not contain historical data patches in the baseline migration", () => {
    const source = readFileSync(
      join(migrationDirectory, migrations[0]),
      "utf8",
    );
    expect(source).not.toMatch(/`(?:ALTER|UPDATE|INSERT|DELETE)\s/i);
  });
});
