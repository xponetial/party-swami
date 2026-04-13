import OpenAI from "openai";

export async function generateInviteBackgroundImageOptions(prompt: string, count = 3) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing.");
  }

  const model = process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-1";
  const client = new OpenAI({ apiKey });
  const result = await client.images.generate({
    model,
    prompt,
    size: "1024x1536",
    n: Math.max(1, Math.min(4, count)),
  });

  const items = (result.data ?? [])
    .map((item) => item.b64_json)
    .filter((value): value is string => Boolean(value))
    .map((b64) => Buffer.from(b64, "base64"));

  if (!items.length) {
    throw new Error("Image generation did not return an image payload.");
  }

  return {
    model,
    pngs: items,
  };
}
