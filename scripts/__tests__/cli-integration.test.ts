import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execSync } from "child_process";
import fs from "fs-extra";
import path from "path";
import os from "os";

const PROJECT_ROOT = path.join(import.meta.dirname, "../..");
const BIN_PATH = path.join(PROJECT_ROOT, "bin", "cli.js");

describe("CLI Integration", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "claude-instructions-test-"),
    );
  });

  afterEach(() => {
    fs.removeSync(tempDir);
  });

  it("should have built CLI binary", () => {
    expect(fs.existsSync(BIN_PATH)).toBe(true);
  });

  it("should have shebang in CLI binary", () => {
    const content = fs.readFileSync(BIN_PATH, "utf-8");
    expect(content.startsWith("#!/usr/bin/env node")).toBe(true);
  });

  it("should export main function from cli module", async () => {
    const { main } = await import("../cli.js");
    expect(typeof main).toBe("function");
  });

  it("should have downloads directory with variants", () => {
    const downloadsDir = path.join(PROJECT_ROOT, "downloads");
    expect(fs.existsSync(path.join(downloadsDir, "with-beads"))).toBe(true);
    expect(fs.existsSync(path.join(downloadsDir, "without-beads"))).toBe(true);
  });

  it("should have package.json with correct bin entry", () => {
    const pkgJson = fs.readJsonSync(path.join(PROJECT_ROOT, "package.json"));
    expect(pkgJson.bin).toBe("./bin/cli.js");
  });

  it("should have package.json with files array including bin and downloads", () => {
    const pkgJson = fs.readJsonSync(path.join(PROJECT_ROOT, "package.json"));
    expect(pkgJson.files).toContain("bin");
    expect(pkgJson.files).toContain("downloads");
  });

  it(
    "should run CLI from packed tarball without immediate failure",
    { timeout: 30000 },
    async () => {
      // Pack the package to temp dir (doesn't affect repo)
      execSync("pnpm pack --pack-destination " + tempDir, {
        cwd: PROJECT_ROOT,
        stdio: "pipe",
      });

      // Find the tarball
      const files = fs.readdirSync(tempDir);
      const tarball = files.find((f) => f.endsWith(".tgz"));
      expect(tarball).toBeDefined();

      // Extract it
      const extractDir = path.join(tempDir, "extracted");
      fs.mkdirSync(extractDir);
      execSync(`tar -xzf ${path.join(tempDir, tarball!)} -C ${extractDir}`);

      const packageDir = path.join(extractDir, "package");

      // Install dependencies in isolated temp dir (package.json already exists from tarball)
      execSync("pnpm install", { cwd: packageDir, stdio: "pipe" });

      // Run the CLI with a timeout - it should start and wait for input, not crash
      const cliPath = path.join(packageDir, "bin", "cli.js");

      const { spawnSync } = await import("child_process");
      const result = spawnSync("node", [cliPath], {
        timeout: 1000,
        stdio: "pipe",
        cwd: packageDir,
      });

      // Should timeout waiting for input (null status) or exit cleanly, not crash with code 1
      expect(result.status).not.toBe(1);
    },
  );
});
