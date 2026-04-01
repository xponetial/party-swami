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
