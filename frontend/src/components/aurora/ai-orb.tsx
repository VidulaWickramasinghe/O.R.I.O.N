"use client";

import { Bot } from "lucide-react";
import { useUiStore, OrbState } from "@/store/ui-store";

const gradients: Record<OrbState, string> = {
  idle: "from-[#4F8BFF] via-[#61DFFF] to-[#7B5CFF]",
  thinking: "from-[#7B5CFF] via-[#61DFFF] to-[#4F8BFF]",
  executing: "from-[#4F8BFF] via-[#18E299] to-[#61DFFF]",
  speaking: "from-[#61DFFF] via-[#7B5CFF] to-[#4F8BFF]",
  success: "from-[#18E299] via-[#61DFFF] to-[#4F8BFF]",
  warning: "from-[#FFC857] via-[#61DFFF] to-[#7B5CFF]",
  danger: "from-[#FF5D73] via-[#FFC857] to-[#7B5CFF]",
};

export function AiOrb() {
  const orbState = useUiStore((state) => state.orbState);
  return (
    <div className="fixed bottom-5 right-5 z-40 hidden items-end gap-3 lg:flex">
      <div className="rounded-2xl border border-white/10 bg-[#11151D]/85 px-4 py-3 text-xs text-slate-300 shadow-2xl backdrop-blur-xl">
        <p className="font-bold text-white">O.R.I.O.N. is {orbState}</p>
        <p className="mt-1 text-slate-500">Think. Plan. Act. Learn.</p>
      </div>
      <div className={`relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br ${gradients[orbState]} shadow-[0_0_42px_rgba(97,223,255,0.45)]`}>
        <div className="absolute inset-[-10px] animate-pulse rounded-full border border-[#61DFFF]/30" />
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/30 bg-[#05070B]/55 text-white backdrop-blur-md">
          <Bot size={28} />
        </div>
      </div>
    </div>
  );
}
