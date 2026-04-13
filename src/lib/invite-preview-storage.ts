import { createInviteCardImagePng, type PublicInviteImageRecord } from "@/lib/invite-card-image";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import sharp from "sharp";

export const INVITE_PREVIEW_BUCKET = "invite-previews";
const INVITE_CARD_WIDTH = 1024;
const INVITE_CARD_HEIGHT = 1536;
const INVITE_EXPORT_WIDTH = 1500;
const INVITE_EXPORT_HEIGHT = 2100;

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

export async function uploadInviteGeneratedImageOption({
  userId,
  eventId,
  inviteId,
  optionIndex,
  png,
}: {
  userId: string;
  eventId: string;
  inviteId: string;
  optionIndex: number;
  png: Buffer;
}) {
  const supabase = createSupabaseAdminClient();
  const timestamp = Date.now();
  const basePath = `user-assets/${userId}/${eventId}/${inviteId}-${timestamp}-option-${optionIndex + 1}`;
  const sourcePath = `${basePath}-source.png`;
  const previewPath = `${basePath}-preview.png`;
  const sourcePng = await sharp(png)
    .resize(INVITE_CARD_WIDTH, INVITE_CARD_HEIGHT, { fit: "cover" })
    .png()
    .toBuffer();
  const previewPng = await sharp(sourcePng).resize(320, 480, { fit: "cover" }).png().toBuffer();

  const { error: sourceError } = await supabase.storage.from(INVITE_PREVIEW_BUCKET).upload(
    sourcePath,
    sourcePng,
    {
      cacheControl: "3600",
      contentType: "image/png",
      upsert: false,
    },
  );

  if (sourceError) {
    throw new Error(`Failed to upload generated source image: ${sourceError.message}`);
  }

  const { error: previewError } = await supabase.storage.from(INVITE_PREVIEW_BUCKET).upload(
    previewPath,
    previewPng,
    {
      cacheControl: "3600",
      contentType: "image/png",
      upsert: false,
    },
  );
  if (previewError) {
    throw new Error(`Failed to upload generated preview image: ${previewError.message}`);
  }

  const { data: previewPublic } = supabase.storage
    .from(INVITE_PREVIEW_BUCKET)
    .getPublicUrl(previewPath);
  const { data: sourcePublic } = supabase.storage.from(INVITE_PREVIEW_BUCKET).getPublicUrl(sourcePath);

  return {
    sourcePath,
    sourceUrl: `${sourcePublic.publicUrl}?v=${timestamp}`,
    previewPath,
    previewUrl: `${previewPublic.publicUrl}?v=${timestamp}`,
  };
}

export async function finalizeInviteGeneratedImageFromSource({
  userId,
  eventId,
  inviteId,
  sourcePath,
}: {
  userId: string;
  eventId: string;
  inviteId: string;
  sourcePath: string;
}) {
  const supabase = createSupabaseAdminClient();
  const { data: sourceBlob, error: downloadError } = await supabase.storage
    .from(INVITE_PREVIEW_BUCKET)
    .download(sourcePath);

  if (downloadError || !sourceBlob) {
    throw new Error("Unable to load the selected source image.");
  }

  const sourceBuffer = Buffer.from(await sourceBlob.arrayBuffer());
  const highResPng = await sharp(sourceBuffer)
    .resize(INVITE_EXPORT_WIDTH, INVITE_EXPORT_HEIGHT, { fit: "cover" })
    .withMetadata({ density: 300 })
    .png()
    .toBuffer();
  const highResPath = `user-assets/${userId}/${eventId}/${inviteId}-${Date.now()}-selected-high.png`;

  const { error: uploadError } = await supabase.storage.from(INVITE_PREVIEW_BUCKET).upload(
    highResPath,
    highResPng,
    {
      cacheControl: "3600",
      contentType: "image/png",
      upsert: false,
    },
  );

  if (uploadError) {
    throw new Error(`Failed to finalize high-res image: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from(INVITE_PREVIEW_BUCKET).getPublicUrl(highResPath);

  return {
    highResPath,
    highResUrl: `${data.publicUrl}?v=${Date.now()}`,
  };
}
