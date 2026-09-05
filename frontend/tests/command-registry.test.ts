import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  filterCommands,
  moveCommandSelection,
  ORION_COMMANDS,
  resolveCommandIntent,
} from "@/lib/command-registry";

describe("command registry", () => {
  it("maps every navigation command to a real application route", () => {
    const navigation = ORION_COMMANDS.filter((command) => command.kind === "navigation");
    expect(navigation.length).toBeGreaterThan(10);

    for (const command of navigation) {
      const route = command.href === "/" ? "page.tsx" : `${command.href.slice(1)}/page.tsx`;
      expect(existsSync(resolve(process.cwd(), "src/app", route)), command.id).toBe(true);
    }
  });

  it("requires confirmation metadata for every mutation", () => {
    const mutations = ORION_COMMANDS.filter((command) => command.kind === "mutation");
    expect(mutations.length).toBeGreaterThan(0);
    for (const command of mutations) {
      expect(command.confirmation.length).toBeGreaterThan(20);
      expect(resolveCommandIntent(command).type).toBe("confirm");
    }
  });

  it("searches labels, descriptions, groups, and keywords", () => {
    expect(filterCommands("approval permission").map((command) => command.id)).toContain("open-approvals");
    expect(filterCommands("capability permission").map((command) => command.id)).toContain("open-tools");
    expect(filterCommands("backup recovery").map((command) => command.id)).toEqual(["open-system"]);
    expect(filterCommands("not-a-real-command")).toEqual([]);
  });

  it("does not match a term inside an unrelated word", () => {
    const matches = filterCommands("open missions").map((command) => command.id);
    expect(matches).toContain("open-missions");
    expect(matches).not.toContain("open-tools");
    expect(matches).not.toContain("open-plugins");
  });

  it("keeps keyboard selection in bounds", () => {
    expect(moveCommandSelection(0, "previous", 4)).toBe(3);
    expect(moveCommandSelection(3, "next", 4)).toBe(0);
    expect(moveCommandSelection(3, "next", 0)).toBe(0);
  });
});
