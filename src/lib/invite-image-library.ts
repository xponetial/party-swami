import { SupabaseClient } from "@supabase/supabase-js";

export type InviteLibraryImage = {
  id: string;
  eventId: string | null;
  inviteId: string | null;
  status: "option" | "finalized";
  storagePath: string;
  publicUrl: string;
  width: number;
  height: number;
  estimatedCostUsd: number;
  promptExcerpt: string | null;
  createdAt: string;
};

export async function getInviteImageLibraryForUser(
  supabase: SupabaseClient,
  userId: string,
  { limit = 48 }: { limit?: number } = {},
) {
  const { data = [] } = await supabase
    .from("invite_generated_images")
    .select(
      "id, event_id, invite_id, status, storage_path, public_url, width, height, estimated_cost_usd, prompt_excerpt, created_at",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<
      Array<{
        id: string;
        event_id: string | null;
        invite_id: string | null;
        status: "option" | "finalized";
        storage_path: string;
        public_url: string;
        width: number;
        height: number;
        estimated_cost_usd: number;
        prompt_excerpt: string | null;
        created_at: string;
      }>
    >();

  const safeData = data ?? [];

  return safeData.map((row) => ({
    id: row.id,
    eventId: row.event_id,
    inviteId: row.invite_id,
    status: row.status,
    storagePath: row.storage_path,
    publicUrl: row.public_url,
    width: row.width,
    height: row.height,
    estimatedCostUsd: Number(row.estimated_cost_usd ?? 0),
    promptExcerpt: row.prompt_excerpt,
    createdAt: row.created_at,
  })) satisfies InviteLibraryImage[];
}
