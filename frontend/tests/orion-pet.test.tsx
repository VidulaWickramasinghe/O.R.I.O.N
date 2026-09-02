import axe from "axe-core";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { OrionPet } from "@/components/aurora/orion-pet";
import { PetPreferenceControl } from "@/components/aurora/pet-preference-control";
import {
  PET_VISIBILITY_STORAGE_KEY,
  readPetVisibility,
  writePetVisibility,
} from "@/lib/pet-preference";
import { useUiStore } from "@/store/ui-store";

describe("O.R.I.O.N. Prime pet", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };

  beforeEach(() => {
    values.clear();
    useUiStore.setState({
      orbState: "idle",
      petVisible: true,
      petPreferenceReady: true,
    });
  });

  afterEach(() => {
    cleanup();
    useUiStore.setState({ petVisible: true, petPreferenceReady: false });
  });

  it("renders the status-reactive Prime sprite and removes it on request", async () => {
    const user = userEvent.setup();
    const { container } = render(<OrionPet />);

    expect(
      screen.getByLabelText("O.R.I.O.N. Prime pet is ready"),
    ).toBeTruthy();
    expect(
      container.querySelector(".orion-prime-sprite"),
    ).toBeTruthy();

    await user.click(
      screen.getByRole("button", { name: "Hide O.R.I.O.N. pet" }),
    );

    expect(useUiStore.getState().petVisible).toBe(false);
    expect(
      screen.queryByLabelText("O.R.I.O.N. Prime pet is ready"),
    ).toBeNull();
  });

  it("lets the settings switch restore a hidden pet", async () => {
    const user = userEvent.setup();
    useUiStore.setState({ petVisible: false });
    render(<PetPreferenceControl />);

    const toggle = screen.getByRole("switch", {
      name: /show o\.r\.i\.o\.n\. prime pet/i,
    });
    expect(toggle.getAttribute("aria-checked")).toBe("false");

    await user.click(toggle);

    expect(toggle.getAttribute("aria-checked")).toBe("true");
    expect(useUiStore.getState().petVisible).toBe(true);
  });

  it("persists show and hide choices without failing open on missing data", () => {
    expect(readPetVisibility(storage)).toBe(true);

    writePetVisibility(false, storage);
    expect(storage.getItem(PET_VISIBILITY_STORAGE_KEY)).toBe("false");
    expect(readPetVisibility(storage)).toBe(false);

    writePetVisibility(true, storage);
    expect(readPetVisibility(storage)).toBe(true);
  });

  it("passes an automated accessibility scan", async () => {
    const { container } = render(
      <main>
        <h1>Appearance</h1>
        <PetPreferenceControl />
        <OrionPet />
      </main>,
    );

    const results = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(results.violations).toEqual([]);
  });
});
