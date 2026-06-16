"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { dispatchToast } from "@/lib/toast";
import { LeftPanel } from "./_components/LeftPanel";
import { CenterFeed } from "./_components/CenterFeed";
import { RightPanel } from "./_components/RightPanel";
import { CreateClubModal } from "./_components/CreateClubModal";

interface Club {
  id: string;
  name: string;
  description?: string;
  avatar?: string | null;
  genre?: string;
  isPrivate?: boolean;
  isMember: boolean;
  game?: { rawgId: number; name: string; coverImage?: string };
  creator: { id: string; username: string; avatar?: string };
  _count: { members: number; posts: number };
}

export default function ClubsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

  const { data: clubs = [], isLoading } = useQuery<Club[]>({
    queryKey: ["clubs"],
    queryFn: () => api.get("/api/clubs").then(r => r.data),
    staleTime: 2 * 60_000,
  });

  const joinMutation = useMutation({
    mutationFn: ({ id, joined }: { id: string; joined: boolean }) =>
      joined ? api.delete(`/api/clubs/${id}/join`) : api.post(`/api/clubs/${id}/join`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clubs"] }),
    onError: (err: any) => dispatchToast(err?.response?.data?.error ?? "Failed", "error"),
  });

  const myClubs = clubs.filter(c => c.isMember);

  return (
    <div className="grid grid-cols-[240px_1fr_232px] gap-5 items-start px-4 py-6">
      {creating && <CreateClubModal onClose={() => setCreating(false)} />}

      <LeftPanel
        clubs={clubs}
        isLoading={isLoading}
        search={search}
        setSearch={setSearch}
        onJoin={(id, joined) => joinMutation.mutate({ id, joined })}
        user={user}
      />

      <CenterFeed user={user} myClubs={myClubs} />

      <RightPanel
        user={user}
        myClubs={myClubs}
        allClubs={clubs}
        onCreateClub={() => setCreating(true)}
      />
    </div>
  );
}
