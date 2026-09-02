"use client";

import { Eye, EyeOff } from "lucide-react";

import { useUiStore } from "@/store/ui-store";

export function PetPreferenceControl() {
  const petVisible = useUiStore((state) => state.petVisible);
  const setPetVisible = useUiStore((state) => state.setPetVisible);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={petVisible}
      onClick={() => setPetVisible(!petVisible)}
      className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-black/25 p-4 text-left transition hover:border-cyan-300/25 hover:bg-cyan-300/[0.04]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-300/15 bg-cyan-300/[0.07] text-cyan-200">
        {petVisible ? (
          <Eye size={18} aria-hidden="true" />
        ) : (
          <EyeOff size={18} aria-hidden="true" />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-white">
          Show O.R.I.O.N. Prime pet
        </span>
        <span className="mt-1 block text-xs leading-5 text-slate-500">
          Display the status-reactive companion in the lower-right corner.
        </span>
      </span>

      <span
        aria-hidden="true"
        className={`relative h-6 w-11 shrink-0 rounded-full border transition ${
          petVisible
            ? "border-cyan-300/40 bg-cyan-400/30"
            : "border-white/10 bg-white/[0.06]"
        }`}
      >
        <span
          className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow transition ${
            petVisible ? "left-6" : "left-1"
          }`}
        />
      </span>
    </button>
  );
}
