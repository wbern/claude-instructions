import { describe, it, expect } from "vitest";
import { getScopeOptions, SCOPES } from "../cli-generator.js";

describe("getScopeOptions", () => {
  it("should truncate long paths when terminal is narrow", () => {
    const options = getScopeOptions(40);
    const projectOption = options.find((opt) => opt.value === SCOPES.PROJECT);
    expect(projectOption?.hint?.startsWith("...")).toBe(true);
    expect(projectOption?.hint?.length).toBeLessThanOrEqual(40);
  });

  it("should show full path when terminal is wide enough", () => {
    const options = getScopeOptions(200);
    const projectOption = options.find((opt) => opt.value === SCOPES.PROJECT);
    expect(projectOption?.hint).toContain(process.cwd());
    expect(projectOption?.hint).not.toMatch(/^\.\.\./);
  });

  it("should include .claude/commands in hint for both scopes", () => {
    const options = getScopeOptions(200);
    const projectOption = options.find((opt) => opt.value === SCOPES.PROJECT);
    const userOption = options.find((opt) => opt.value === SCOPES.USER);
    expect(projectOption?.hint).toContain(".claude/commands");
    expect(userOption?.hint).toContain(".claude/commands");
  });
});
