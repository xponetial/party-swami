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
    "Create a PartySwami invitation background only.",
    "Format: vertical portrait 2:3 ratio for invitation card artwork.",
    `Event context: "${eventTitle}" (${eventType}).`,
    "Hard rules: absolutely no readable text, no letters, no numbers, no logos, no signage, no watermark, no brand marks.",
    "Keep the middle and lower-middle areas less busy for app overlay copy.",
    "Visual style request:",
    sanitizedStylePrompt,
  ].join(" ");
}

