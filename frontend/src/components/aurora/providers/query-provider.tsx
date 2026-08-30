"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useEffect, useState } from "react";

import { ORION_API_MUTATION_EVENT } from "@/lib/api/client";

type QueryProviderProps = {
  children: ReactNode;
};

export function AuroraQueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchInterval: false,
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 30_000,
          },
        },
      })
  );

  useEffect(() => {
    const invalidate = () => {
      void queryClient.invalidateQueries({ refetchType: "active" });
    };
    window.addEventListener(ORION_API_MUTATION_EVENT, invalidate);
    return () => window.removeEventListener(ORION_API_MUTATION_EVENT, invalidate);
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
