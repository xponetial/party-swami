import { expect, test } from "@playwright/test";

test("public RSVP API rejects invalid payloads", async ({ request }) => {
  const response = await request.post("/api/rsvp", {
    data: {
      slug: "",
      guestToken: "",
      status: "invalid",
      plusOneCount: -1,
    },
  });

  expect(response.status()).toBe(400);

  const body = await response.json();
  expect(body.ok).toBe(false);
  expect(typeof body.message).toBe("string");
});

test("AI generation APIs require auth", async ({ request }) => {
  const endpoints = [
    "/api/ai/generate-plan",
    "/api/ai/generate-invite-copy",
    "/api/ai/generate-shopping-list",
  ];

  for (const endpoint of endpoints) {
    const response = await request.post(endpoint, {
      data: {
        eventId: "74bde7c8-48a2-43b0-95e7-8c69181b7a50",
      },
    });

    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.message).toMatch(/signed in/i);
  }
});
