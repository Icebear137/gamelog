import { useToastStore, type ToastType } from "@/lib/stores/toast";

export function dispatchToast(message: string, type: ToastType = "info") {
  useToastStore.getState().add(message, type);
}

export type { ToastType };
