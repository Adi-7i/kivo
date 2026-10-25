"use client";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/features/auth/session";
import { apiClient } from "@/lib/api/client";
import { allPages, type HistoryParams } from "./api";

/** Authenticated server state: never carry another identity's placeholder data forward. */
function useOwnedState<T>(
  root: string,
  path: string,
  params: HistoryParams = {},
  enabled: boolean,
  paginated: boolean,
  load: (signal: AbortSignal) => Promise<T>
) {
  const { data: user } = useSession();
  return useQuery<T>({
    queryKey: [root, user?.id, path, params, paginated],
    queryFn: ({ signal }) => load(signal),
    enabled: !!user && enabled,
    retry: false,
    staleTime: 10_000,
  });
}

export function useOwnedQuery<T>(
  root: string,
  path: string,
  params: HistoryParams = {},
  enabled = true
) {
  return useOwnedState<T>(root, path, params, enabled, false, (signal) =>
    apiClient<T>(path, { signal, params })
  );
}
export function useOwnedList<T>(
  root: string,
  path: string,
  params: HistoryParams = {},
  enabled = true
) {
  return useOwnedState<T[]>(root, path, params, enabled, true, (signal) =>
    allPages<T>(path, signal, params)
  );
}
