"use client";

import type { CSSProperties } from "react";
import { EyeOff } from "lucide-react";

import { useUiStore, type OrbState } from "@/store/ui-store";

type PetPose = {
  column: number;
  row: number;
  label: string;
};

const PET_POSES: Record<OrbState, PetPose> = {
  idle: { column: 3, row: 0, label: "ready" },
  thinking: { column: 4, row: 5, label: "thinking" },
  executing: { column: 2, row: 1, label: "orchestrating" },
  speaking: { column: 2, row: 3, label: "speaking" },
  success: { column: 3, row: 7, label: "complete" },
  warning: { column: 0, row: 5, label: "needs attention" },
  danger: { column: 1, row: 5, label: "recovering from a failure" },
};

type PetSpriteStyle = CSSProperties & {
  "--orion-pet-x": string;
  "--orion-pet-y": string;
};

export function OrionPet() {
  const orbState = useUiStore((state) => state.orbState);
  const petVisible = useUiStore((state) => state.petVisible);
  const preferenceReady = useUiStore((state) => state.petPreferenceReady);
  const setPetVisible = useUiStore((state) => state.setPetVisible);
  const pose = PET_POSES[orbState];

  if (!preferenceReady || !petVisible) return null;

  const spriteStyle: PetSpriteStyle = {
    "--orion-pet-x": `${pose.column * -144}px`,
    "--orion-pet-y": `${pose.row * -156}px`,
  };

  return (
    <aside
      className="orion-prime-pet group fixed bottom-2 right-2 z-40 h-[146px] w-[133px] sm:bottom-3 sm:right-4 sm:h-[166px] sm:w-[151px]"
      data-pet-state={orbState}
      aria-label={`O.R.I.O.N. Prime pet is ${pose.label}`}
    >
      <span className="sr-only" role="status" aria-live="polite">
        O.R.I.O.N. Prime is {pose.label}.
      </span>

      <button
        type="button"
        onClick={() => setPetVisible(false)}
        aria-label="Hide O.R.I.O.N. pet"
        title="Hide O.R.I.O.N. pet"
        className="absolute right-0 top-0 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-cyan-200/20 bg-[#07101a]/90 text-slate-300 opacity-80 shadow-lg backdrop-blur-md transition hover:border-cyan-200/40 hover:text-cyan-100 focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
      >
        <EyeOff size={14} aria-hidden="true" />
      </button>

      <div
        aria-hidden="true"
        className="orion-prime-sprite absolute bottom-0 left-0 origin-bottom-left scale-[0.88] sm:scale-100"
        style={spriteStyle}
      />
    </aside>
  );
}
