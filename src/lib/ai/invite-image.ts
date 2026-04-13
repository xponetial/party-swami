import OpenAI from "openai";

export async function generateInviteBackgroundImage(prompt: string) {
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
  });

  const b64 = result.data?.[0]?.b64_json;

  if (!b64) {
    throw new Error("Image generation did not return an image payload.");
  }

  return {
    model,
    png: Buffer.from(b64, "base64"),
  };
}
