"use client";

import { useMutation, QueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { dispatchToast } from "@/lib/toast";

interface Params {
  conversationId: string;
  qc: QueryClient;
  scrollToBottom: () => void;
  onSendSuccess: () => void;
  onImageSendSuccess: () => void;
  onGameSendSuccess: () => void;
  onForwardSuccess: (targetConversationId: string) => void;
}

export function useConversationMutations({
  conversationId,
  qc,
  scrollToBottom,
  onSendSuccess,
  onImageSendSuccess,
  onGameSendSuccess,
  onForwardSuccess,
}: Params) {
  const invalidateMessages = () => {
    qc.invalidateQueries({ queryKey: ["messages", conversationId] });
    qc.invalidateQueries({ queryKey: ["conversations"] });
  };
  const afterSend = () => { invalidateMessages(); setTimeout(scrollToBottom, 50); };

  const sendMutation = useMutation({
    mutationFn: ({ body, replyToId }: { body: string; replyToId?: string }) =>
      api.post(`/api/messages/conversations/${conversationId}`, { body, ...(replyToId ? { replyToId } : {}) }),
    onSuccess: () => { onSendSuccess(); afterSend(); },
    onError: (err: any) => { dispatchToast(err?.response?.data?.error ?? "Failed to send message", "error"); },
  });

  const sendImagesMutation = useMutation({
    mutationFn: ({ files, caption, replyToId }: { files: File[]; caption: string; replyToId?: string }) => {
      const form = new FormData();
      files.forEach((f) => form.append("images", f));
      if (caption) form.append("caption", caption);
      if (replyToId) form.append("replyToId", replyToId);
      return api.post(`/api/messages/conversations/${conversationId}/images`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: () => { onImageSendSuccess(); afterSend(); },
    onError: (err: any) => { dispatchToast(err?.response?.data?.error ?? "Failed to send image(s)", "error"); },
  });

  const sendGameMutation = useMutation({
    mutationFn: ({ gameId, caption, replyToId }: { gameId: string; caption: string; replyToId?: string }) =>
      api.post(`/api/messages/conversations/${conversationId}`, {
        gameId, body: caption, ...(replyToId ? { replyToId } : {}),
      }),
    onSuccess: () => { onGameSendSuccess(); afterSend(); },
    onError: (err: any) => { dispatchToast(err?.response?.data?.error ?? "Failed to share game", "error"); },
  });

  const sendAudioMutation = useMutation({
    mutationFn: ({ blob, duration }: { blob: Blob; duration: number }) => {
      const form = new FormData();
      form.append("audio", blob, "voice.webm");
      form.append("duration", String(duration));
      return api.post(`/api/messages/conversations/${conversationId}/audio`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: () => afterSend(),
    onError: (err: any) => { dispatchToast(err?.response?.data?.error ?? "Failed to send voice message", "error"); },
  });

  const sendFileMutation = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return api.post(`/api/messages/conversations/${conversationId}/files`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: () => afterSend(),
    onError: (err: any) => { dispatchToast(err?.response?.data?.error ?? "Failed to send file", "error"); },
  });

  const forwardMutation = useMutation({
    mutationFn: ({ messageId, targetConversationId }: { messageId: string; targetConversationId: string }) =>
      api.post(`/api/messages/conversations/${targetConversationId}/forward`, { messageId }),
    onSuccess: (_, { targetConversationId }) => {
      onForwardSuccess(targetConversationId);
      qc.invalidateQueries({ queryKey: ["messages", targetConversationId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
      dispatchToast("Message forwarded", "success");
    },
    onError: (err: any) => { dispatchToast(err?.response?.data?.error ?? "Failed to forward message", "error"); },
  });

  const pollMutation = useMutation({
    mutationFn: ({ question, options, allowMultiple, endsAt, anonymous }: { question: string; options: string[]; allowMultiple: boolean; endsAt?: string; anonymous?: boolean }) =>
      api.post(`/api/messages/conversations/${conversationId}/polls`, { question, options, allowMultiple, endsAt, anonymous }),
    onSuccess: () => afterSend(),
    onError: (err: any) => { dispatchToast(err?.response?.data?.error ?? "Failed to create poll", "error"); },
  });

  const gameNightMutation = useMutation({
    mutationFn: (data: { title: string; scheduledAt: string; rawgId?: number; platform?: string; note?: string }) =>
      api.post(`/api/messages/conversations/${conversationId}/game-nights`, data),
    onSuccess: () => afterSend(),
    onError: (err: any) => { dispatchToast(err?.response?.data?.error ?? "Failed to schedule game night", "error"); },
  });

  const pinMutation = useMutation({
    mutationFn: (messageId: string | null) =>
      api.post(`/api/messages/conversations/${conversationId}/pin`, { messageId }),
    onError: (err: any) => { dispatchToast(err?.response?.data?.error ?? "Failed to pin message", "error"); },
  });

  return { sendMutation, sendImagesMutation, sendGameMutation, sendAudioMutation, sendFileMutation, forwardMutation, pollMutation, gameNightMutation, pinMutation };
}
