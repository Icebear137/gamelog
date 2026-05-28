"use client";

import * as Toast from "@radix-ui/react-toast";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import clsx from "clsx";
import { useToastStore } from "@/lib/stores/toast";
import type { ToastType } from "@/lib/stores/toast";

const icons: Record<ToastType, React.ReactNode> = {
  error: <AlertCircle size={16} className="text-red-400 shrink-0" />,
  success: <CheckCircle size={16} className="text-green-400 shrink-0" />,
  info: <Info size={16} className="text-blue-400 shrink-0" />,
};

const styles: Record<ToastType, string> = {
  error: "border-red-800 bg-white/5 backdrop-blur-sm",
  success: "border-green-800 bg-white/5 backdrop-blur-sm",
  info: "border-blue-800 bg-white/5 backdrop-blur-sm",
};

export default function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const remove = useToastStore((s) => s.remove);

  return (
    <Toast.Provider swipeDirection="right" duration={4000}>
      {toasts.map((t) => (
        <Toast.Root
          key={t.id}
          open
          onOpenChange={(open) => { if (!open) remove(t.id); }}
          className={clsx(
            "flex items-start gap-3 border rounded-xl px-4 py-3 shadow-xl w-80",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:slide-in-from-right-4 data-[state=closed]:slide-out-to-right-4",
            "data-[state=open]:fade-in data-[state=closed]:fade-out",
            styles[t.type]
          )}
        >
          {icons[t.type]}
          <Toast.Description className="text-sm text-gray-200 flex-1 leading-snug">
            {t.message}
          </Toast.Description>
          <Toast.Action asChild altText="Dismiss">
            <button onClick={() => remove(t.id)} className="text-gray-500 hover:text-gray-300 transition-colors mt-0.5">
              <X size={14} />
            </button>
          </Toast.Action>
        </Toast.Root>
      ))}
      <Toast.Viewport className="fixed bottom-4 right-4 flex flex-col gap-2 z-100 outline-none" />
    </Toast.Provider>
  );
}
