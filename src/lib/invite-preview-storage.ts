import { createInviteCardImagePng, type PublicInviteImageRecord } from "@/lib/invite-card-image";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const INVITE_PREVIEW_BUCKET = "invite-previews";

export function getInvitePreviewPath(eventId: string, inviteId: string) {
  return `${eventId}/${inviteId}.png`;
}

export async function uploadInvitePreviewImage({
  eventId,
  inviteId,
  invite,
}: {
  eventId: string;
  inviteId: string;
  invite: PublicInviteImageRecord;
}) {
  const supabase = createSupabaseAdminClient();
  const filePath = getInvitePreviewPath(eventId, inviteId);
  const png = await createInviteCardImagePng(invite);

  const { error: uploadError } = await supabase.storage
    .from(INVITE_PREVIEW_BUCKET)
    .upload(filePath, png, {
      cacheControl: "60",
      contentType: "image/png",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Failed to upload invite preview image: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from(INVITE_PREVIEW_BUCKET).getPublicUrl(filePath);

  return {
    filePath,
    publicUrl: `${data.publicUrl}?v=${Date.now()}`,
  };
}

function sanitizeFileName(fileName: string) {
  return fileName.toLowerCase().replace(/[^a-z0-9._-]/g, "-");
}

export async function uploadInviteEditableImage({
  userId,
  eventId,
  inviteId,
  file,
}: {
  userId: string;
  eventId: string;
  inviteId: string;
  file: File;
}) {
  const supabase = createSupabaseAdminClient();
  const safeName = sanitizeFileName(file.name);
  const path = `user-assets/${userId}/${eventId}/${inviteId}-${Date.now()}-${safeName}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(INVITE_PREVIEW_BUCKET)
    .upload(path, bytes, {
      cacheControl: "3600",
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Failed to upload editable invite image: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from(INVITE_PREVIEW_BUCKET).getPublicUrl(path);

  return {
    filePath: path,
    publicUrl: `${data.publicUrl}?v=${Date.now()}`,
  };
}

export async function uploadInviteGeneratedImage({
  userId,
  eventId,
  inviteId,
  png,
}: {
  userId: string;
  eventId: string;
  inviteId: string;
  png: Buffer;
}) {
  const supabase = createSupabaseAdminClient();
  const filePath = `user-assets/${userId}/${eventId}/${inviteId}-${Date.now()}-ai-generated.png`;

  const { error: uploadError } = await supabase.storage
    .from(INVITE_PREVIEW_BUCKET)
    .upload(filePath, png, {
      cacheControl: "3600",
      contentType: "image/png",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Failed to upload generated invite image: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from(INVITE_PREVIEW_BUCKET).getPublicUrl(filePath);

  return {
    filePath,
    publicUrl: `${data.publicUrl}?v=${Date.now()}`,
  };
}
