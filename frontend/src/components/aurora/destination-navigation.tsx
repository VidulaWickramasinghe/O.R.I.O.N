"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { destinationForPath, destinationTasks } from "@/lib/aurora-data";
import { cn } from "@/lib/utils";

export function DestinationNavigation() {
  const pathname = usePathname();
  const destination = destinationForPath(pathname);
  const tasks = destinationTasks[destination.label];

  if (tasks.length < 2) return null;

  return (
    <nav
      aria-label={`${destination.label} tasks`}
      className="mb-4 flex max-w-full gap-2 overflow-x-auto rounded-2xl border border-white/[0.07] bg-black/20 p-2"
    >
      {tasks.map((task) => {
        const active =
          pathname === task.href ||
          (task.href === "/context" && pathname === "/memory");

        return (
          <Link
            key={task.href}
            href={task.href}
            title={task.description}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-xl px-3 py-2 text-xs font-semibold transition",
              active
                ? "bg-cyan-300/[0.1] text-cyan-100"
                : "text-slate-500 hover:bg-white/[0.05] hover:text-slate-200",
            )}
          >
            {task.label}
          </Link>
        );
      })}
    </nav>
  );
}
