import axe from "axe-core";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { InterfacePreferencesPanel } from "@/components/aurora/interface-preferences-panel";
import { UserSettingsPanel } from "@/components/aurora/panels/UserSettingsPanel";
import {
  INTERFACE_PREFERENCES_STORAGE_KEY,
  readInterfacePreferences,
  writeInterfacePreferences,
} from "@/lib/interface-preferences";
import { useUiStore } from "@/store/ui-store";
import type { UserSettingItem, UserSettingsProfile } from "@/types/orion";

const settings: UserSettingItem[] = [
  ["display_name", "O.R.I.O.N. User", []],
  ["role_title", "System Architect", []],
  ["environment_mode", "production", ["production", "development", "demo"]],
  ["default_workspace_id", "", []],
  ["safety_level", "strict", ["strict", "balanced", "experimental"]],
  ["voice_mode", "text_first", ["text_first", "voice_first", "muted"]],
  ["theme_mode", "aurora_dark", ["aurora_dark", "midnight", "glass_cyan"]],
  ["preferred_model", "default", ["default", "fast", "reasoning"]],
  ["developer_mode_enabled", "false", ["true", "false"]],
  ["demo_mode_preference", "false", ["true", "false"]],
  ["startup_briefing_enabled", "true", ["true", "false"]],
].map(([key, value, options]) => ({
  key: String(key),
  value: String(value),
  description: `${String(key)} preference`,
  updated_at: "2026-09-02T00:00:00",
  options: options as string[],
}));

const profile: UserSettingsProfile = {
  settings,
  settings_map: Object.fromEntries(
    settings.map((setting) => [setting.key, setting.value]),
  ),
  profile_summary: "Local profile",
};

describe("Aurora settings control plane", () => {
  beforeEach(() => {
    useUiStore.setState({
      sidebarMode: "expanded",
      contextOpen: true,
      petVisible: true,
      petPreferenceReady: true,
      reducedMotion: false,
      uiDensity: "comfortable",
      use24HourTime: true,
      interfacePreferenceReady: true,
    });
  });

  afterEach(() => cleanup());

  it("exposes every backend-supported profile setting in coherent groups", () => {
    render(
      <UserSettingsPanel
        profile={profile}
        loadingKey=""
        message=""
        setProfile={() => undefined}
        updateSetting={() => undefined}
        resetSettings={() => undefined}
      />,
    );

    for (const label of [
      "Display name",
      "Role or title",
      "Environment mode",
      "Default workspace ID",
      "Safety profile",
      "Voice behaviour",
      "Aurora theme",
      "Preferred model",
      "Developer mode",
      "Prefer portfolio demo mode",
      "Startup briefing",
    ]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    expect(screen.getByText("11")).toBeTruthy();
  });

  it("writes governed toggles and confirms a full profile reset", async () => {
    const user = userEvent.setup();
    const updateSetting = vi.fn();
    const resetSettings = vi.fn();
    render(
      <UserSettingsPanel
        profile={profile}
        loadingKey=""
        message=""
        setProfile={() => undefined}
        updateSetting={updateSetting}
        resetSettings={resetSettings}
      />,
    );

    await user.click(
      screen.getByRole("switch", { name: /startup briefing/i }),
    );
    expect(updateSetting).toHaveBeenCalledWith(
      "startup_briefing_enabled",
      "false",
    );

    await user.click(screen.getByRole("button", { name: "Reset profile" }));
    expect(resetSettings).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Confirm reset" }));
    expect(resetSettings).toHaveBeenCalledOnce();
  });

  it("applies every device-only interface preference immediately", async () => {
    const user = userEvent.setup();
    render(<InterfacePreferencesPanel />);

    await user.click(
      screen.getByRole("switch", { name: /show left sidebar/i }),
    );
    expect(useUiStore.getState().sidebarMode).toBe("hidden");

    await user.click(screen.getByRole("switch", { name: /reduce motion/i }));
    expect(useUiStore.getState().reducedMotion).toBe(true);

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Interface density" }),
      "compact",
    );
    expect(useUiStore.getState().uiDensity).toBe("compact");

    await user.click(
      screen.getByRole("button", { name: "Reset interface" }),
    );
    expect(useUiStore.getState().sidebarMode).toBe("expanded");
    expect(useUiStore.getState().reducedMotion).toBe(false);
    expect(useUiStore.getState().uiDensity).toBe("comfortable");
  });

  it("validates and persists interface preference data", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
    };

    writeInterfacePreferences(
      { reducedMotion: true, uiDensity: "compact", use24HourTime: false },
      storage,
    );
    expect(values.has(INTERFACE_PREFERENCES_STORAGE_KEY)).toBe(true);
    expect(readInterfacePreferences(storage)).toEqual({
      reducedMotion: true,
      uiDensity: "compact",
      use24HourTime: false,
    });

    values.set(INTERFACE_PREFERENCES_STORAGE_KEY, "not-json");
    expect(readInterfacePreferences(storage).uiDensity).toBe("comfortable");
  });

  it("passes an automated accessibility scan", async () => {
    const { container } = render(
      <main>
        <h1>User settings</h1>
        <InterfacePreferencesPanel />
        <UserSettingsPanel
          profile={profile}
          loadingKey=""
          message=""
          setProfile={() => undefined}
          updateSetting={() => undefined}
          resetSettings={() => undefined}
        />
      </main>,
    );

    const results = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(results.violations).toEqual([]);
  });
});
