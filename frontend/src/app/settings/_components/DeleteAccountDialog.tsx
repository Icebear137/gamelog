"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import * as Dialog from "@radix-ui/react-dialog";
import * as Label from "@radix-ui/react-label";
import * as Separator from "@radix-ui/react-separator";
import { Text, Heading, Flex } from "@radix-ui/themes";
import { Trash2, AlertTriangle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { dispatchToast } from "@/lib/toast";

export function DeleteAccountDialog() {
  const { logout } = useAuth();
  const router = useRouter();
  const [deletePassword, setDeletePassword] = useState("");
  const [open, setOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: () => api.delete("/api/auth/account", { data: { password: deletePassword } }),
    onSuccess: () => {
      setOpen(false);
      logout();
      router.push("/");
    },
    onError: (err: any) => {
      dispatchToast(err?.response?.data?.error ?? "Failed to delete account", "error");
    },
  });

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-red-900/50 rounded-2xl p-6">
      <Heading size="4" as="h2" color="red" className="mb-4">
        <Flex align="center" gap="2">
          <AlertTriangle size={18} />
          Danger Zone
        </Flex>
      </Heading>

      <Flex align="center" justify="between" gap="4">
        <div>
          <Text as="p" size="2" color="gray" className="font-medium">Delete Account</Text>
          <Text as="p" size="1" color="gray" className="mt-0.5">
            Permanently delete your account and all data. This cannot be undone.
          </Text>
        </div>

        <Dialog.Root open={open} onOpenChange={(v) => { setOpen(v); if (!v) setDeletePassword(""); }}>
          <Dialog.Trigger asChild>
            <button className="shrink-0 flex items-center gap-2 bg-red-900/40 hover:bg-red-900/70 border border-red-800 text-red-400 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              <Trash2 size={15} />
              Delete
            </button>
          </Dialog.Trigger>

          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/60 z-40" />
            <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/5 backdrop-blur-sm border border-red-900/60 rounded-2xl p-6 w-full max-w-sm z-50">
              <Flex align="center" justify="between" className="mb-4">
                <Dialog.Title className="text-red-400 font-bold flex items-center gap-2">
                  <AlertTriangle size={16} />
                  Delete Account
                </Dialog.Title>
                <Dialog.Close asChild>
                  <button className="text-gray-400 hover:text-white"><X size={18} /></button>
                </Dialog.Close>
              </Flex>

              <Dialog.Description className="text-sm text-gray-300 mb-4">
                This action is permanent and cannot be undone. All your games, reviews, and activity will be deleted.
              </Dialog.Description>

              <Separator.Root className="h-px bg-white/8 mb-4" />

              <Flex direction="column" gap="3">
                <div className="space-y-1.5">
                  <Label.Root htmlFor="delete-password" className="block">
                    <Text as="span" size="1" color="gray">Enter your password to confirm</Text>
                  </Label.Root>
                  <input
                    id="delete-password"
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Your password"
                    autoFocus
                    className="w-full bg-white/8 border border-red-900 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-red-600 transition-colors"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => mutation.mutate()}
                    disabled={!deletePassword || mutation.isPending}
                    className="flex items-center gap-2 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Trash2 size={15} />
                    {mutation.isPending ? "Deleting..." : "Confirm Delete"}
                  </button>
                  <Dialog.Close asChild>
                    <button className="bg-white/8 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                      Cancel
                    </button>
                  </Dialog.Close>
                </div>
              </Flex>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </Flex>
    </div>
  );
}
