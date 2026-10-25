"use client";
import * as React from "react";
import { todayInKolkata } from "@/features/onboarding/money";
const subscribe = () => () => {};
/** A deterministic server snapshot, with the local IST calendar read only after hydration. */
export function useTodayInKolkata() {
  return React.useSyncExternalStore(subscribe, todayInKolkata, () => "");
}
