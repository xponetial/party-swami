import OpenAI from "openai";

const INVITE_IMAGE_SIZE = "1024x1536";
const TEXT_CHECK_MODEL = process.env.OPENAI_IMAGE_TEXT_CHECK_MODEL?.trim() || "gpt-4.1-mini";
const MAX_GENERATION_ATTEMPTS = 4;

function buildInviteBackgroundPrompt(userPrompt: string) {
  return [
    "Generate a single invitation background image (one scene only).",
    "Vertical 2:3 format (1024x1536).",
    "Elegant, modern, high-end art direction.",
    "Composition: no collage and no split panels.",
    "Keep center and lower-middle zones clean and readable for overlay text.",
    "Place visual interest around edges, with depth of field and cinematic lighting.",
    "Use realistic materials, polished textures, and balanced rich colors.",
    "Strictly no words, letters, numbers, logos, typography, signage, or watermarks.",
    "Final style guidance:",
    userPrompt,
  ].join(" ");
}

async function imageContainsText(client: OpenAI, png: Buffer) {
  try {
    const response = await client.chat.completions.create({
      model: TEXT_CHECK_MODEL,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You detect visible text in images. Return strict JSON only: {\"has_text\": true|false}. Treat single characters, numbers, logos with letters, and watermarks as text.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Does this image contain any visible text, letters, numbers, logo text, signage, or watermark?",
            },
            {
              type: "image_url",
              image_url: { url: `data:image/png;base64,${png.toString("base64")}` },
            },
          ],
        },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as { has_text?: boolean };
    return Boolean(parsed.has_text);
  } catch (error) {
    console.warn("Invite image text check failed, using prompt-only guard.", error);
    return false;
  }
}

export async function generateInviteBackgroundImageOptions(prompt: string, count = 3) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing.");
  }

  const model = process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-1";
  const client = new OpenAI({ apiKey });

  const requestedCount = Math.max(1, Math.min(4, count));
  const promptWithGuards = buildInviteBackgroundPrompt(prompt);
  const items: Buffer[] = [];
  let generatedCandidates = 0;
  let rejectedForText = 0;
  let textChecksRun = 0;

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS && items.length < requestedCount; attempt += 1) {
    const missing = requestedCount - items.length;
    const result = await client.images.generate({
      model,
      prompt: promptWithGuards,
      size: INVITE_IMAGE_SIZE,
      n: missing,
    });

    const candidates = (result.data ?? [])
      .map((item) => item.b64_json)
      .filter((value): value is string => Boolean(value))
      .map((b64) => Buffer.from(b64, "base64"));
    generatedCandidates += candidates.length;

    if (!candidates.length) {
      continue;
    }

    const checks = await Promise.all(candidates.map((candidate) => imageContainsText(client, candidate)));
    textChecksRun += checks.length;
    for (let index = 0; index < candidates.length; index += 1) {
      if (!checks[index]) {
        items.push(candidates[index]);
        if (items.length >= requestedCount) break;
      } else {
        rejectedForText += 1;
      }
    }
  }

  if (items.length < requestedCount) {
    throw new Error("Could not generate text-free images. Please try a different prompt.");
  }

  return {
    model,
    pngs: items.slice(0, requestedCount),
    metrics: {
      requestedCount,
      acceptedCount: items.length,
      generatedCandidates,
      rejectedForText,
      textChecksRun,
    },
  };
}
