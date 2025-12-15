import { describe, it, expect, vi } from "vitest";
import { parseArgs } from "./bin.js";
import { CLI_OPTIONS } from "./cli-options.js";
import type { CliArgs } from "./cli.js";

vi.mock("./cli.js", () => ({
  main: vi.fn().mockResolvedValue(undefined),
}));

describe("parseArgs", () => {
  it("should parse command line arguments", () => {
    const args = parseArgs([
      "--variant=with-beads",
      "--scope=project",
      "--prefix=my-",
    ]);

    expect(args).toEqual({
      variant: "with-beads",
      scope: "project",
      prefix: "my-",
    });
  });

  it("should parse --skip-template-injection flag", () => {
    const args = parseArgs(["--skip-template-injection"]);

    expect(args).toEqual({
      skipTemplateInjection: true,
    });
  });

  it("should parse --commands as comma-separated list", () => {
    const args = parseArgs(["--commands=red,green,commit"]);

    expect(args).toEqual({
      commands: ["red", "green", "commit"],
    });
  });

  it("should parse --update-existing flag", () => {
    const args = parseArgs(["--update-existing"]);

    expect(args).toEqual({
      updateExisting: true,
    });
  });

  it("should parse --overwrite flag", () => {
    const args = parseArgs(["--overwrite"]);

    expect(args).toEqual({
      overwrite: true,
    });
  });

  it("should parse --skip-on-conflict flag", () => {
    const args = parseArgs(["--skip-on-conflict"]);

    expect(args).toEqual({
      skipOnConflict: true,
    });
  });
});

describe("run", () => {
  it("should pass parsed args to main", async () => {
    const { run } = await import("./bin.js");
    const { main } = await import("./cli.js");

    await run(["--variant=with-beads", "--scope=project", "--prefix=my-"]);

    expect(main).toHaveBeenCalledWith({
      variant: "with-beads",
      scope: "project",
      prefix: "my-",
    });
  });

  it("should print help and not call main when --help is passed", async () => {
    const { run } = await import("./bin.js");
    const { main } = await import("./cli.js");

    vi.mocked(main).mockClear();
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await run(["--help"]);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Usage:"));
    expect(main).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("should print version and not call main when --version is passed", async () => {
    const { run } = await import("./bin.js");
    const { main } = await import("./cli.js");

    vi.mocked(main).mockClear();
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await run(["--version"]);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringMatching(/^\d+\.\d+\.\d+/),
    );
    expect(main).not.toHaveBeenCalled();

    // Also test short flag -v
    vi.mocked(main).mockClear();
    consoleSpy.mockClear();

    await run(["-v"]);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringMatching(/^\d+\.\d+\.\d+/),
    );
    expect(main).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("should print all parameters from CLI_OPTIONS in help output", async () => {
    const { run } = await import("./bin.js");

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await run(["--help"]);

    const output = consoleSpy.mock.calls[0][0];
    for (const opt of CLI_OPTIONS) {
      expect(output).toContain(opt.flag);
    }

    consoleSpy.mockRestore();
  });
});

describe("CLI_OPTIONS consistency", () => {
  it("should have CLI_OPTIONS keys matching CliArgs interface keys", () => {
    const cliOptionsKeys = CLI_OPTIONS.map((opt) => opt.key).sort();

    // This object uses `satisfies` to ensure compile-time type checking
    // that all CliArgs keys are present. At runtime, we extract and compare.
    const cliArgsKeysObject: Record<string, undefined> = {
      variant: undefined,
      scope: undefined,
      prefix: undefined,
      commands: undefined,
      skipTemplateInjection: undefined,
      updateExisting: undefined,
      overwrite: undefined,
      skipOnConflict: undefined,
    } satisfies Record<keyof Required<CliArgs>, undefined>;

    const cliArgsKeys = Object.keys(cliArgsKeysObject).sort();

    expect(cliOptionsKeys).toEqual(cliArgsKeys);
  });

  it("should mark variant, scope, and prefix as required for non-interactive mode", () => {
    const requiredOptions = CLI_OPTIONS.filter(
      (opt) => opt.requiredForNonInteractive,
    );
    const requiredKeys = requiredOptions.map((opt) => opt.key).sort();

    expect(requiredKeys).toEqual(["prefix", "scope", "variant"]);
  });
});
