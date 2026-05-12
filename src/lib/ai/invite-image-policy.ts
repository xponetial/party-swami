export const MAX_INVITE_IMAGE_PROMPT_LENGTH = 260;

function clampText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return value.slice(0, maxLength).trim();
}

export function sanitizeInviteImagePrompt(rawPrompt: string) {
  let value = rawPrompt ?? "";

  value = value.replace(/https?:\/\/\S+/gi, " ");
  value = value.replace(/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/gi, " ");
  value = value.replace(/\+?\d[\d\s().-]{6,}\d/g, " ");
  value = value.replace(/[`~#$%^*_=+<>[\]{}|\\]/g, " ");
  value = value.replace(/[\u0000-\u001F\u007F]/g, " ");
  value = value.replace(/\s+/g, " ").trim();
  value = clampText(value, MAX_INVITE_IMAGE_PROMPT_LENGTH);

  const textIntentPattern =
    /\b(text|word|words|letter|letters|number|numbers|caption|headline|slogan|logo|watermark|brand name|title)\b/i;
  const hadTextIntent = textIntentPattern.test(value);

  // Remove explicit text/logo intent terms from the user prompt body.
  value = value.replace(textIntentPattern, "decorative detail");
  value = value.replace(/\s+/g, " ").trim();

  if (!value) {
    value = "Elegant celebration mood with tasteful colors and festive details.";
  }

  return {
    sanitizedPrompt: value,
    hadTextIntent,
  };
}

export function buildPartySwamiInviteImagePrompt({
  eventTitle,
  eventType,
  sanitizedStylePrompt,
}: {
  eventTitle: string;
  eventType: string;
  sanitizedStylePrompt: string;
}) {
  return [
    "Create one Party Swami invitation background image only.",
    "Style: elegant, modern, high-end design.",
    "Format: vertical portrait source image (1024x1536), with composition safe for final 5:7 output (1500x2100).",
    `Event context: "${eventTitle}" (${eventType}).`,
    "Composition: single unified scene (no collage, no split panels).",
    "Place subject elements around the edges and keep the center area uncluttered for text overlay.",
    "Use depth of field and cinematic lighting.",
    "Lighting: professional and polished; soft or vibrant depending on the event mood.",
    "Details: high-end textures, realistic materials, rich balanced colors appropriate to the theme.",
    "Hard rules: absolutely no readable text, no letters, no numbers, no logos, no signage, no watermark, no brand marks.",
    "Avoid any typography and avoid any branding.",
    "User style request:",
    sanitizedStylePrompt,
  ].join(" ");
}
