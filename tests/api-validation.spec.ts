import { expect, test } from "@playwright/test";

test("public RSVP API rejects invalid payloads", async ({ request }) => {
  const response = await request.post("/api/rsvp", {
    headers: {
      "x-forwarded-for": "198.51.100.10",
    },
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

test("public RSVP API rate limits repeated attempts", async ({ request }) => {
  const headers = {
    "x-forwarded-for": "198.51.100.44",
  };

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const response = await request.post("/api/rsvp", {
      headers,
      data: {
        slug: "party-genie-rate-limit-test",
        guestToken: "guest-token",
        status: "confirmed",
        plusOneCount: 0,
      },
    });

    expect(response.status()).toBe(400);
  }

  const limitedResponse = await request.post("/api/rsvp", {
    headers,
    data: {
      slug: "party-genie-rate-limit-test",
      guestToken: "guest-token",
      status: "confirmed",
      plusOneCount: 0,
    },
  });

  expect(limitedResponse.status()).toBe(429);
  expect(limitedResponse.headers()["retry-after"]).toBeTruthy();

  const body = await limitedResponse.json();
  expect(body.ok).toBe(false);
  expect(body.message).toMatch(/too many rsvp attempts/i);
});

test("AI generation APIs require auth", async ({ request }) => {
  const endpoints = [
    "/api/ai/generate-plan",
    "/api/ai/generate-invite-copy",
    "/api/ai/generate-shopping-list",
    "/api/ai/revise-plan",
  ];

  for (const endpoint of endpoints) {
    const data =
      endpoint === "/api/ai/revise-plan"
        ? {
            eventId: "74bde7c8-48a2-43b0-95e7-8c69181b7a50",
            changeType: "budget_adjustment",
            instructions: "Reduce the overall cost by twenty percent.",
          }
        : {
            eventId: "74bde7c8-48a2-43b0-95e7-8c69181b7a50",
          };

    const response = await request.post(endpoint, { data });

    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.message).toMatch(/signed in/i);
  }
});

test("AI usage API requires auth", async ({ request }) => {
  const response = await request.get("/api/usage/me");

  expect(response.status()).toBe(401);

  const body = await response.json();
  expect(body.ok).toBe(false);
  expect(body.message).toMatch(/signed in/i);
});

test("invite send API requires auth before mail configuration", async ({ request }) => {
  const response = await request.post("/api/invites/send", {
    data: {
      eventId: "74bde7c8-48a2-43b0-95e7-8c69181b7a50",
      deliveryType: "invite",
      sendMode: "pending_only",
    },
  });

  expect(response.status()).toBe(401);

  const body = await response.json();
  expect(body.ok).toBe(false);
  expect(body.message).toMatch(/signed in/i);
});

test("event plan API requires auth", async ({ request }) => {
  const response = await request.get("/api/events/74bde7c8-48a2-43b0-95e7-8c69181b7a50/plan");

  expect(response.status()).toBe(401);

  const body = await response.json();
  expect(body.ok).toBe(false);
  expect(body.message).toMatch(/signed in/i);
});

test("event plan restore API requires auth", async ({ request }) => {
  const response = await request.post("/api/events/74bde7c8-48a2-43b0-95e7-8c69181b7a50/plan/restore", {
    data: {
      versionId: "8565be1f-b6dd-47d9-92ff-d10d8073128f",
    },
  });

  expect(response.status()).toBe(401);

  const body = await response.json();
  expect(body.ok).toBe(false);
  expect(body.message).toMatch(/signed in/i);
});
