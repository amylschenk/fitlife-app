import { put, head } from "@vercel/blob";

const BLOB_KEY = "fitlife-data.json";

const DEFAULT = {
  amy: { completedDays: [] },
  karl: { completedDays: [] },
  quotes: [],
  challenges: [],
  banner:
    "We are love, health, wealth & abundance — aligned, strong, and unstoppable. Every day we show up for ourselves and each other. 🔥✨",
  mealPlan: { sharedPlan: {}, actual: { amy: {}, karl: {} }, shoppingList: [] },
};

export async function getData() {
  try {
    // head() returns the blob's metadata including its public URL.
    // It throws if the blob doesn't exist yet — that's fine, we return DEFAULT.
    const meta = await head(BLOB_KEY);
    const res = await fetch(meta.url, { cache: "no-store" });
    if (!res.ok) return DEFAULT;
    return await res.json();
  } catch {
    return DEFAULT;
  }
}

export async function setData(data) {
  const json = JSON.stringify(data);
  // allowOverwrite is required by @vercel/blob v2 to overwrite an existing key.
  // Without it, the second save throws.
  await put(BLOB_KEY, json, {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}
