#!/usr/bin/env node
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) =>
  function __init() {
    return (fn && (res = (0, fn[__getOwnPropNames(fn)[0]])((fn = 0))), res);
  };
var __commonJS = (cb, mod) =>
  function __require() {
    return (
      mod ||
        (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod),
      mod.exports
    );
  };
var __copyProps = (to, from, except, desc) => {
  if ((from && typeof from === "object") || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, {
          get: () => from[key],
          enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable,
        });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (
  (target = mod != null ? __create(__getProtoOf(mod)) : {}),
  __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule
      ? __defProp(target, "default", { value: mod, enumerable: true })
      : target,
    mod,
  )
);

// node_modules/.pnpm/tsup@8.5.1_jiti@2.6.1_postcss@8.5.6_tsx@4.20.6_typescript@5.9.3_yaml@2.8.1/node_modules/tsup/assets/esm_shims.js
import path from "path";
import { fileURLToPath } from "url";
var init_esm_shims = __esm({
  "node_modules/.pnpm/tsup@8.5.1_jiti@2.6.1_postcss@8.5.6_tsx@4.20.6_typescript@5.9.3_yaml@2.8.1/node_modules/tsup/assets/esm_shims.js"() {
    "use strict";
  },
});

// node_modules/.pnpm/picocolors@1.1.1/node_modules/picocolors/picocolors.js
var require_picocolors = __commonJS({
  "node_modules/.pnpm/picocolors@1.1.1/node_modules/picocolors/picocolors.js"(
    exports,
    module,
  ) {
    "use strict";
    init_esm_shims();
    var p = process || {};
    var argv = p.argv || [];
    var env = p.env || {};
    var isColorSupported =
      !(!!env.NO_COLOR || argv.includes("--no-color")) &&
      (!!env.FORCE_COLOR ||
        argv.includes("--color") ||
        p.platform === "win32" ||
        ((p.stdout || {}).isTTY && env.TERM !== "dumb") ||
        !!env.CI);
    var formatter =
      (open, close, replace = open) =>
      (input) => {
        let string = "" + input,
          index = string.indexOf(close, open.length);
        return ~index
          ? open + replaceClose(string, close, replace, index) + close
          : open + string + close;
      };
    var replaceClose = (string, close, replace, index) => {
      let result = "",
        cursor = 0;
      do {
        result += string.substring(cursor, index) + replace;
        cursor = index + close.length;
        index = string.indexOf(close, cursor);
      } while (~index);
      return result + string.substring(cursor);
    };
    var createColors = (enabled = isColorSupported) => {
      let f = enabled ? formatter : () => String;
      return {
        isColorSupported: enabled,
        reset: f("\x1B[0m", "\x1B[0m"),
        bold: f("\x1B[1m", "\x1B[22m", "\x1B[22m\x1B[1m"),
        dim: f("\x1B[2m", "\x1B[22m", "\x1B[22m\x1B[2m"),
        italic: f("\x1B[3m", "\x1B[23m"),
        underline: f("\x1B[4m", "\x1B[24m"),
        inverse: f("\x1B[7m", "\x1B[27m"),
        hidden: f("\x1B[8m", "\x1B[28m"),
        strikethrough: f("\x1B[9m", "\x1B[29m"),
        black: f("\x1B[30m", "\x1B[39m"),
        red: f("\x1B[31m", "\x1B[39m"),
        green: f("\x1B[32m", "\x1B[39m"),
        yellow: f("\x1B[33m", "\x1B[39m"),
        blue: f("\x1B[34m", "\x1B[39m"),
        magenta: f("\x1B[35m", "\x1B[39m"),
        cyan: f("\x1B[36m", "\x1B[39m"),
        white: f("\x1B[37m", "\x1B[39m"),
        gray: f("\x1B[90m", "\x1B[39m"),
        bgBlack: f("\x1B[40m", "\x1B[49m"),
        bgRed: f("\x1B[41m", "\x1B[49m"),
        bgGreen: f("\x1B[42m", "\x1B[49m"),
        bgYellow: f("\x1B[43m", "\x1B[49m"),
        bgBlue: f("\x1B[44m", "\x1B[49m"),
        bgMagenta: f("\x1B[45m", "\x1B[49m"),
        bgCyan: f("\x1B[46m", "\x1B[49m"),
        bgWhite: f("\x1B[47m", "\x1B[49m"),
        blackBright: f("\x1B[90m", "\x1B[39m"),
        redBright: f("\x1B[91m", "\x1B[39m"),
        greenBright: f("\x1B[92m", "\x1B[39m"),
        yellowBright: f("\x1B[93m", "\x1B[39m"),
        blueBright: f("\x1B[94m", "\x1B[39m"),
        magentaBright: f("\x1B[95m", "\x1B[39m"),
        cyanBright: f("\x1B[96m", "\x1B[39m"),
        whiteBright: f("\x1B[97m", "\x1B[39m"),
        bgBlackBright: f("\x1B[100m", "\x1B[49m"),
        bgRedBright: f("\x1B[101m", "\x1B[49m"),
        bgGreenBright: f("\x1B[102m", "\x1B[49m"),
        bgYellowBright: f("\x1B[103m", "\x1B[49m"),
        bgBlueBright: f("\x1B[104m", "\x1B[49m"),
        bgMagentaBright: f("\x1B[105m", "\x1B[49m"),
        bgCyanBright: f("\x1B[106m", "\x1B[49m"),
        bgWhiteBright: f("\x1B[107m", "\x1B[49m"),
      };
    };
    module.exports = createColors();
    module.exports.createColors = createColors;
  },
});

// scripts/bin.ts
init_esm_shims();

// scripts/cli.ts
init_esm_shims();
import {
  select,
  text,
  groupMultiselect,
  isCancel,
  intro,
  outro,
  confirm,
  note,
  log,
} from "@clack/prompts";
import os2 from "os";

// node_modules/.pnpm/diff@8.0.2/node_modules/diff/libesm/index.js
init_esm_shims();

// node_modules/.pnpm/diff@8.0.2/node_modules/diff/libesm/diff/base.js
init_esm_shims();
var Diff = class {
  diff(oldStr, newStr, options = {}) {
    let callback;
    if (typeof options === "function") {
      callback = options;
      options = {};
    } else if ("callback" in options) {
      callback = options.callback;
    }
    const oldString = this.castInput(oldStr, options);
    const newString = this.castInput(newStr, options);
    const oldTokens = this.removeEmpty(this.tokenize(oldString, options));
    const newTokens = this.removeEmpty(this.tokenize(newString, options));
    return this.diffWithOptionsObj(oldTokens, newTokens, options, callback);
  }
  diffWithOptionsObj(oldTokens, newTokens, options, callback) {
    var _a;
    const done = (value) => {
      value = this.postProcess(value, options);
      if (callback) {
        setTimeout(function () {
          callback(value);
        }, 0);
        return void 0;
      } else {
        return value;
      }
    };
    const newLen = newTokens.length,
      oldLen = oldTokens.length;
    let editLength = 1;
    let maxEditLength = newLen + oldLen;
    if (options.maxEditLength != null) {
      maxEditLength = Math.min(maxEditLength, options.maxEditLength);
    }
    const maxExecutionTime =
      (_a = options.timeout) !== null && _a !== void 0 ? _a : Infinity;
    const abortAfterTimestamp = Date.now() + maxExecutionTime;
    const bestPath = [{ oldPos: -1, lastComponent: void 0 }];
    let newPos = this.extractCommon(
      bestPath[0],
      newTokens,
      oldTokens,
      0,
      options,
    );
    if (bestPath[0].oldPos + 1 >= oldLen && newPos + 1 >= newLen) {
      return done(
        this.buildValues(bestPath[0].lastComponent, newTokens, oldTokens),
      );
    }
    let minDiagonalToConsider = -Infinity,
      maxDiagonalToConsider = Infinity;
    const execEditLength = () => {
      for (
        let diagonalPath = Math.max(minDiagonalToConsider, -editLength);
        diagonalPath <= Math.min(maxDiagonalToConsider, editLength);
        diagonalPath += 2
      ) {
        let basePath;
        const removePath = bestPath[diagonalPath - 1],
          addPath = bestPath[diagonalPath + 1];
        if (removePath) {
          bestPath[diagonalPath - 1] = void 0;
        }
        let canAdd = false;
        if (addPath) {
          const addPathNewPos = addPath.oldPos - diagonalPath;
          canAdd = addPath && 0 <= addPathNewPos && addPathNewPos < newLen;
        }
        const canRemove = removePath && removePath.oldPos + 1 < oldLen;
        if (!canAdd && !canRemove) {
          bestPath[diagonalPath] = void 0;
          continue;
        }
        if (!canRemove || (canAdd && removePath.oldPos < addPath.oldPos)) {
          basePath = this.addToPath(addPath, true, false, 0, options);
        } else {
          basePath = this.addToPath(removePath, false, true, 1, options);
        }
        newPos = this.extractCommon(
          basePath,
          newTokens,
          oldTokens,
          diagonalPath,
          options,
        );
        if (basePath.oldPos + 1 >= oldLen && newPos + 1 >= newLen) {
          return (
            done(
              this.buildValues(basePath.lastComponent, newTokens, oldTokens),
            ) || true
          );
        } else {
          bestPath[diagonalPath] = basePath;
          if (basePath.oldPos + 1 >= oldLen) {
            maxDiagonalToConsider = Math.min(
              maxDiagonalToConsider,
              diagonalPath - 1,
            );
          }
          if (newPos + 1 >= newLen) {
            minDiagonalToConsider = Math.max(
              minDiagonalToConsider,
              diagonalPath + 1,
            );
          }
        }
      }
      editLength++;
    };
    if (callback) {
      (function exec() {
        setTimeout(function () {
          if (editLength > maxEditLength || Date.now() > abortAfterTimestamp) {
            return callback(void 0);
          }
          if (!execEditLength()) {
            exec();
          }
        }, 0);
      })();
    } else {
      while (editLength <= maxEditLength && Date.now() <= abortAfterTimestamp) {
        const ret = execEditLength();
        if (ret) {
          return ret;
        }
      }
    }
  }
  addToPath(path3, added, removed, oldPosInc, options) {
    const last = path3.lastComponent;
    if (
      last &&
      !options.oneChangePerToken &&
      last.added === added &&
      last.removed === removed
    ) {
      return {
        oldPos: path3.oldPos + oldPosInc,
        lastComponent: {
          count: last.count + 1,
          added,
          removed,
          previousComponent: last.previousComponent,
        },
      };
    } else {
      return {
        oldPos: path3.oldPos + oldPosInc,
        lastComponent: { count: 1, added, removed, previousComponent: last },
      };
    }
  }
  extractCommon(basePath, newTokens, oldTokens, diagonalPath, options) {
    const newLen = newTokens.length,
      oldLen = oldTokens.length;
    let oldPos = basePath.oldPos,
      newPos = oldPos - diagonalPath,
      commonCount = 0;
    while (
      newPos + 1 < newLen &&
      oldPos + 1 < oldLen &&
      this.equals(oldTokens[oldPos + 1], newTokens[newPos + 1], options)
    ) {
      newPos++;
      oldPos++;
      commonCount++;
      if (options.oneChangePerToken) {
        basePath.lastComponent = {
          count: 1,
          previousComponent: basePath.lastComponent,
          added: false,
          removed: false,
        };
      }
    }
    if (commonCount && !options.oneChangePerToken) {
      basePath.lastComponent = {
        count: commonCount,
        previousComponent: basePath.lastComponent,
        added: false,
        removed: false,
      };
    }
    basePath.oldPos = oldPos;
    return newPos;
  }
  equals(left, right, options) {
    if (options.comparator) {
      return options.comparator(left, right);
    } else {
      return (
        left === right ||
        (!!options.ignoreCase && left.toLowerCase() === right.toLowerCase())
      );
    }
  }
  removeEmpty(array) {
    const ret = [];
    for (let i = 0; i < array.length; i++) {
      if (array[i]) {
        ret.push(array[i]);
      }
    }
    return ret;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  castInput(value, options) {
    return value;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  tokenize(value, options) {
    return Array.from(value);
  }
  join(chars) {
    return chars.join("");
  }
  postProcess(changeObjects, options) {
    return changeObjects;
  }
  get useLongestToken() {
    return false;
  }
  buildValues(lastComponent, newTokens, oldTokens) {
    const components = [];
    let nextComponent;
    while (lastComponent) {
      components.push(lastComponent);
      nextComponent = lastComponent.previousComponent;
      delete lastComponent.previousComponent;
      lastComponent = nextComponent;
    }
    components.reverse();
    const componentLen = components.length;
    let componentPos = 0,
      newPos = 0,
      oldPos = 0;
    for (; componentPos < componentLen; componentPos++) {
      const component = components[componentPos];
      if (!component.removed) {
        if (!component.added && this.useLongestToken) {
          let value = newTokens.slice(newPos, newPos + component.count);
          value = value.map(function (value2, i) {
            const oldValue = oldTokens[oldPos + i];
            return oldValue.length > value2.length ? oldValue : value2;
          });
          component.value = this.join(value);
        } else {
          component.value = this.join(
            newTokens.slice(newPos, newPos + component.count),
          );
        }
        newPos += component.count;
        if (!component.added) {
          oldPos += component.count;
        }
      } else {
        component.value = this.join(
          oldTokens.slice(oldPos, oldPos + component.count),
        );
        oldPos += component.count;
      }
    }
    return components;
  }
};

// node_modules/.pnpm/diff@8.0.2/node_modules/diff/libesm/diff/line.js
init_esm_shims();
var LineDiff = class extends Diff {
  constructor() {
    super(...arguments);
    this.tokenize = tokenize;
  }
  equals(left, right, options) {
    if (options.ignoreWhitespace) {
      if (!options.newlineIsToken || !left.includes("\n")) {
        left = left.trim();
      }
      if (!options.newlineIsToken || !right.includes("\n")) {
        right = right.trim();
      }
    } else if (options.ignoreNewlineAtEof && !options.newlineIsToken) {
      if (left.endsWith("\n")) {
        left = left.slice(0, -1);
      }
      if (right.endsWith("\n")) {
        right = right.slice(0, -1);
      }
    }
    return super.equals(left, right, options);
  }
};
var lineDiff = new LineDiff();
function diffLines(oldStr, newStr, options) {
  return lineDiff.diff(oldStr, newStr, options);
}
function tokenize(value, options) {
  if (options.stripTrailingCr) {
    value = value.replace(/\r\n/g, "\n");
  }
  const retLines = [],
    linesAndNewlines = value.split(/(\n|\r\n)/);
  if (!linesAndNewlines[linesAndNewlines.length - 1]) {
    linesAndNewlines.pop();
  }
  for (let i = 0; i < linesAndNewlines.length; i++) {
    const line = linesAndNewlines[i];
    if (i % 2 && !options.newlineIsToken) {
      retLines[retLines.length - 1] += line;
    } else {
      retLines.push(line);
    }
  }
  return retLines;
}

// scripts/cli.ts
var import_picocolors = __toESM(require_picocolors(), 1);

// scripts/cli-generator.ts
init_esm_shims();
import fs from "fs-extra";
import path2 from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
import os from "os";
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = path2.dirname(__filename2);
var VARIANTS = {
  WITH_BEADS: "with-beads",
  WITHOUT_BEADS: "without-beads",
};
var SCOPES = {
  PROJECT: "project",
  USER: "user",
};
var DIRECTORIES = {
  CLAUDE: ".claude",
  COMMANDS: "commands",
  DOWNLOADS: "downloads",
};
var TEMPLATE_SOURCE_FILES = ["CLAUDE.md", "AGENTS.md"];
var ELLIPSIS = "...";
function truncatePathFromLeft(pathStr, maxLength) {
  if (pathStr.length <= maxLength) {
    return pathStr;
  }
  const truncated = pathStr.slice(-(maxLength - ELLIPSIS.length));
  const firstSlash = truncated.indexOf("/");
  if (firstSlash > 0) {
    return ELLIPSIS + truncated.slice(firstSlash);
  }
  return ELLIPSIS + truncated;
}
var VARIANT_OPTIONS = [
  {
    value: VARIANTS.WITH_BEADS,
    label: "With Beads",
    hint: "Includes Beads task tracking",
  },
  {
    value: VARIANTS.WITHOUT_BEADS,
    label: "Without Beads",
    hint: "Standard commands only",
  },
];
function getScopeOptions(terminalWidth = 80) {
  const projectPath = path2.join(
    process.cwd(),
    DIRECTORIES.CLAUDE,
    DIRECTORIES.COMMANDS,
  );
  const userPath = path2.join(
    os.homedir(),
    DIRECTORIES.CLAUDE,
    DIRECTORIES.COMMANDS,
  );
  return [
    {
      value: SCOPES.PROJECT,
      label: "Project/Repository",
      hint: truncatePathFromLeft(projectPath, terminalWidth),
    },
    {
      value: SCOPES.USER,
      label: "User (Global)",
      hint: truncatePathFromLeft(userPath, terminalWidth),
    },
  ];
}
async function checkExistingFiles(outputPath, variant, scope, options) {
  const sourcePath = path2.join(
    __dirname2,
    "..",
    DIRECTORIES.DOWNLOADS,
    variant || VARIANTS.WITH_BEADS,
  );
  const destinationPath = outputPath || getDestinationPath(outputPath, scope);
  if (!destinationPath) {
    return [];
  }
  const files = await fs.readdir(sourcePath);
  const existingFiles = [];
  const prefix = options?.commandPrefix || "";
  for (const file of files) {
    const destFileName = prefix + file;
    const destFilePath = path2.join(destinationPath, destFileName);
    const sourceFilePath = path2.join(sourcePath, file);
    if (await fs.pathExists(destFilePath)) {
      const existingContent = await fs.readFile(destFilePath, "utf-8");
      const newContent = await fs.readFile(sourceFilePath, "utf-8");
      existingFiles.push({
        filename: destFileName,
        existingContent,
        newContent,
        isIdentical: existingContent === newContent,
      });
    }
  }
  return existingFiles;
}
async function getCommandsGroupedByCategory(variant) {
  const sourcePath = path2.join(
    __dirname2,
    "..",
    DIRECTORIES.DOWNLOADS,
    variant || VARIANTS.WITH_BEADS,
  );
  const metadataPath = path2.join(sourcePath, "commands-metadata.json");
  const metadataContent = await fs.readFile(metadataPath, "utf-8");
  const metadata = JSON.parse(metadataContent);
  const grouped = {};
  for (const [filename, data] of Object.entries(metadata)) {
    const category = data.category;
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push({
      value: filename,
      label: filename,
      selectedByDefault: data.selectedByDefault !== false,
    });
  }
  for (const category of Object.keys(grouped)) {
    grouped[category].sort((a, b) => {
      const orderA = metadata[a.value].order;
      const orderB = metadata[b.value].order;
      return orderA - orderB;
    });
  }
  return grouped;
}
function getDestinationPath(outputPath, scope) {
  if (outputPath) {
    return outputPath;
  }
  if (scope === SCOPES.PROJECT) {
    return path2.join(process.cwd(), DIRECTORIES.CLAUDE, DIRECTORIES.COMMANDS);
  }
  if (scope === SCOPES.USER) {
    return path2.join(os.homedir(), DIRECTORIES.CLAUDE, DIRECTORIES.COMMANDS);
  }
  return void 0;
}
function extractTemplateBlocks(content) {
  const blocks = [];
  const withCommandsRegex =
    /<claude-commands-template\s+commands="([^"]+)">([\s\S]*?)<\/claude-commands-template>/g;
  for (const match of content.matchAll(withCommandsRegex)) {
    blocks.push({
      content: match[2].trim(),
      commands: match[1].split(",").map((c) => c.trim()),
    });
  }
  const withoutCommandsRegex =
    /<claude-commands-template>([\s\S]*?)<\/claude-commands-template>/g;
  for (const match of content.matchAll(withoutCommandsRegex)) {
    blocks.push({
      content: match[1].trim(),
    });
  }
  return blocks;
}
async function generateToDirectory(outputPath, variant, scope, options) {
  const sourcePath = path2.join(
    __dirname2,
    "..",
    DIRECTORIES.DOWNLOADS,
    variant || VARIANTS.WITH_BEADS,
  );
  const destinationPath = getDestinationPath(outputPath, scope);
  if (!destinationPath) {
    throw new Error("Either outputPath or scope must be provided");
  }
  const allFiles = await fs.readdir(sourcePath);
  let files = options?.commands
    ? allFiles.filter((f) => options.commands.includes(f))
    : allFiles;
  if (options?.skipFiles) {
    files = files.filter((f) => !options.skipFiles.includes(f));
  }
  if (options?.commands || options?.skipFiles) {
    await fs.ensureDir(destinationPath);
    for (const file of files) {
      await fs.copy(
        path2.join(sourcePath, file),
        path2.join(destinationPath, file),
      );
    }
  } else {
    await fs.copy(sourcePath, destinationPath, {});
  }
  if (options?.commandPrefix) {
    for (const file of files) {
      const oldPath = path2.join(destinationPath, file);
      const newPath = path2.join(destinationPath, options.commandPrefix + file);
      await fs.rename(oldPath, newPath);
    }
  }
  let templateInjected = false;
  if (!options?.skipTemplateInjection) {
    let templateSourcePath = null;
    for (const filename of TEMPLATE_SOURCE_FILES) {
      const candidatePath = path2.join(process.cwd(), filename);
      if (await fs.pathExists(candidatePath)) {
        templateSourcePath = candidatePath;
        break;
      }
    }
    if (templateSourcePath) {
      const sourceContent = await fs.readFile(templateSourcePath, "utf-8");
      const templates = extractTemplateBlocks(sourceContent);
      if (templates.length > 0) {
        for (const file of files) {
          const commandName = path2.basename(file, ".md");
          const actualFileName = options?.commandPrefix
            ? options.commandPrefix + file
            : file;
          const filePath = path2.join(destinationPath, actualFileName);
          let content = await fs.readFile(filePath, "utf-8");
          let modified = false;
          for (const template of templates) {
            if (template.commands && !template.commands.includes(commandName)) {
              continue;
            }
            content = content + "\n\n" + template.content;
            modified = true;
          }
          if (modified) {
            await fs.writeFile(filePath, content);
          }
        }
        templateInjected = true;
      }
    }
  }
  return {
    success: true,
    filesGenerated: files.length,
    variant,
    templateInjectionSkipped: options?.skipTemplateInjection,
    templateInjected,
  };
}

// scripts/cli.ts
var pc = process.env.FORCE_COLOR
  ? import_picocolors.default.createColors(true)
  : import_picocolors.default;
function splitChangeIntoLines(value) {
  const lines = value.split("\n");
  if (lines[lines.length - 1] === "") lines.pop();
  return lines;
}
function formatCompactDiff(oldContent, newContent, contextLines = 3) {
  const changes = diffLines(oldContent, newContent);
  const lines = [];
  const allLines = [];
  let oldLineNum = 1;
  let newLineNum = 1;
  for (const change of changes) {
    const changeLines = splitChangeIntoLines(change.value);
    for (const text2 of changeLines) {
      if (change.added) {
        allLines.push({
          text: text2,
          type: "added",
          oldLineNum: -1,
          newLineNum: newLineNum++,
        });
      } else if (change.removed) {
        allLines.push({
          text: text2,
          type: "removed",
          oldLineNum: oldLineNum++,
          newLineNum: -1,
        });
      } else {
        allLines.push({
          text: text2,
          type: "unchanged",
          oldLineNum: oldLineNum++,
          newLineNum: newLineNum++,
        });
      }
    }
  }
  let i = 0;
  while (i < allLines.length) {
    if (allLines[i].type === "unchanged") {
      i++;
      continue;
    }
    const hunkStart = Math.max(0, i - contextLines);
    let hunkEnd = i;
    while (hunkEnd < allLines.length) {
      if (allLines[hunkEnd].type !== "unchanged") {
        hunkEnd++;
      } else {
        let nextChange = hunkEnd;
        while (
          nextChange < allLines.length &&
          nextChange < hunkEnd + contextLines * 2 + 1
        ) {
          if (allLines[nextChange].type !== "unchanged") break;
          nextChange++;
        }
        if (
          nextChange < allLines.length &&
          nextChange < hunkEnd + contextLines * 2 + 1 &&
          allLines[nextChange].type !== "unchanged"
        ) {
          hunkEnd = nextChange + 1;
        } else {
          break;
        }
      }
    }
    hunkEnd = Math.min(allLines.length, hunkEnd + contextLines);
    const hunkLines = allLines.slice(hunkStart, hunkEnd);
    const firstOldLine =
      hunkLines.find((l) => l.oldLineNum > 0)?.oldLineNum || 1;
    const firstNewLine =
      hunkLines.find((l) => l.newLineNum > 0)?.newLineNum || 1;
    const oldCount = hunkLines.filter((l) => l.type !== "added").length;
    const newCount = hunkLines.filter((l) => l.type !== "removed").length;
    lines.push(
      pc.cyan(
        `@@ -${firstOldLine},${oldCount} +${firstNewLine},${newCount} @@`,
      ),
    );
    for (let j = hunkStart; j < hunkEnd; j++) {
      const line = allLines[j];
      if (line.type === "added") {
        lines.push(pc.bgGreen(pc.black(`+ ${line.text}`)));
      } else if (line.type === "removed") {
        lines.push(pc.bgRed(pc.black(`- ${line.text}`)));
      } else {
        lines.push(pc.dim(`  ${line.text}`));
      }
    }
    lines.push("");
    i = hunkEnd;
  }
  return lines.join("\n").trimEnd();
}
function getDiffStats(oldContent, newContent) {
  const changes = diffLines(oldContent, newContent);
  let added = 0;
  let removed = 0;
  for (const change of changes) {
    const lineCount = splitChangeIntoLines(change.value).length;
    if (change.added) added += lineCount;
    else if (change.removed) removed += lineCount;
  }
  return { added, removed };
}
var BATMAN_LOGO = `
       _==/          i     i          \\==_
     /XX/            |\\___/|            \\XX\\
   /XXXX\\            |XXXXX|            /XXXX\\
  |XXXXXX\\_         _XXXXXXX_         _/XXXXXX|
 XXXXXXXXXXXxxxxxxxXXXXXXXXXXXxxxxxxxXXXXXXXXXXX
|XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX|
XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
|XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX|
 XXXXXX/^^^^"\\XXXXXXXXXXXXXXXXXXXXX/^^^^^\\XXXXXX
  |XXX|       \\XXX/^^\\XXXXX/^^\\XXX/       |XXX|
    \\XX\\       \\X/    \\XXX/    \\X/       /XX/
       "\\       "      \\X/      "       /"

            @wbern/claude-instructions
`;
async function main(args) {
  intro(BATMAN_LOGO);
  let variant;
  let scope;
  let commandPrefix;
  let selectedCommands;
  if (args?.variant && args?.scope && args?.prefix !== void 0) {
    variant = args.variant;
    scope = args.scope;
    commandPrefix = args.prefix;
    selectedCommands = args.commands;
  } else {
    variant = await select({
      message: "Select variant",
      options: [...VARIANT_OPTIONS],
    });
    if (isCancel(variant)) {
      return;
    }
    const terminalWidth = process.stdout.columns || 80;
    const uiOverhead = 25;
    scope = await select({
      message: "Select installation scope",
      options: getScopeOptions(terminalWidth - uiOverhead),
    });
    if (isCancel(scope)) {
      return;
    }
    commandPrefix = await text({
      message: "Command prefix (optional)",
      placeholder: "e.g. my-",
    });
    if (isCancel(commandPrefix)) {
      return;
    }
    const groupedCommands = await getCommandsGroupedByCategory(variant);
    const enabledCommandValues = Object.values(groupedCommands)
      .flat()
      .filter((cmd) => cmd.selectedByDefault)
      .map((cmd) => cmd.value);
    selectedCommands = await groupMultiselect({
      message: "Select commands to install (Enter to accept all)",
      options: groupedCommands,
      initialValues: enabledCommandValues,
    });
    if (isCancel(selectedCommands)) {
      return;
    }
  }
  const existingFiles = await checkExistingFiles(void 0, variant, scope, {
    commandPrefix,
    commands: selectedCommands,
  });
  const skipFiles = [];
  for (const file of existingFiles) {
    if (file.isIdentical) {
      log.info(`${file.filename} is identical, skipping`);
      skipFiles.push(file.filename);
      continue;
    }
    const stats = getDiffStats(file.existingContent, file.newContent);
    const diff = formatCompactDiff(file.existingContent, file.newContent);
    note(diff, `Diff: ${file.filename}`);
    log.info(`+${stats.added} -${stats.removed}`);
    const shouldOverwrite = await confirm({
      message: `Overwrite ${file.filename}?`,
    });
    if (!shouldOverwrite) {
      skipFiles.push(file.filename);
    }
  }
  const result = await generateToDirectory(void 0, variant, scope, {
    commandPrefix,
    skipTemplateInjection: args?.skipTemplateInjection,
    commands: selectedCommands,
    skipFiles,
  });
  const fullPath =
    scope === "project"
      ? `${process.cwd()}/.claude/commands`
      : `${os2.homedir()}/.claude/commands`;
  outro(
    `Installed ${result.filesGenerated} commands to ${fullPath}

If Claude Code is already running, restart it to pick up the new commands.

Happy TDD'ing!`,
  );
}

// scripts/bin.ts
var STRING_ARGS = ["variant", "scope", "prefix"];
var ARRAY_ARGS = ["commands"];
var BOOLEAN_FLAGS = [
  { flag: "--skip-template-injection", key: "skipTemplateInjection" },
];
function parseArgs(argv) {
  const args = {};
  for (const arg of argv) {
    for (const { flag, key } of BOOLEAN_FLAGS) {
      if (arg === flag) {
        args[key] = true;
      }
    }
    for (const key of STRING_ARGS) {
      const prefix = `--${key}=`;
      if (arg.startsWith(prefix)) {
        args[key] = arg.slice(prefix.length);
      }
    }
    for (const key of ARRAY_ARGS) {
      const prefix = `--${key}=`;
      if (arg.startsWith(prefix)) {
        args[key] = arg.slice(prefix.length).split(",");
      }
    }
  }
  return args;
}
async function run(argv) {
  const args = parseArgs(argv);
  await main(args);
}
run(process.argv.slice(2)).catch(console.error);
export { parseArgs, run };
