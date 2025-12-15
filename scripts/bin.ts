import { createRequire } from "node:module";
import { main, type CliArgs } from "./cli.js";
import { CLI_OPTIONS, generateHelpText } from "./cli-options.js";

function getVersion(): string {
  const require = createRequire(import.meta.url);
  const packageJson = require("../package.json") as { version: string };
  return packageJson.version;
}

export function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {};

  const booleanOpts = CLI_OPTIONS.filter((o) => o.type === "boolean");
  const stringOpts = CLI_OPTIONS.filter((o) => o.type === "string");
  const arrayOpts = CLI_OPTIONS.filter((o) => o.type === "array");

  for (const arg of argv) {
    for (const opt of booleanOpts) {
      if (arg === opt.flag) {
        (args as Record<string, boolean>)[opt.key] = true;
      }
    }
    for (const opt of stringOpts) {
      const prefix = `${opt.flag}=`;
      if (arg.startsWith(prefix)) {
        (args as Record<string, string>)[opt.key] = arg.slice(prefix.length);
      }
    }
    for (const opt of arrayOpts) {
      const prefix = `${opt.flag}=`;
      if (arg.startsWith(prefix)) {
        (args as Record<string, string[]>)[opt.key] = arg
          .slice(prefix.length)
          .split(",");
      }
    }
  }

  return args;
}

export async function run(argv: string[]) {
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(generateHelpText());
    return;
  }

  if (argv.includes("--version") || argv.includes("-v")) {
    console.log(getVersion());
    return;
  }

  const args = parseArgs(argv);
  await main(args);
}

run(process.argv.slice(2)).catch(console.error);
