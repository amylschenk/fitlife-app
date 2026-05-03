import { kv } from "@vercel/kv";

const KEY = "fitlife_data";

export async function getData() {
  try {
    const data = await kv.get(KEY);
    return data || getDefault();
  } catch {
    return getDefault();
  }
}

export async function setData(data) {
  await kv.set(KEY, data);
}

export async function patchData(partial) {
  const current = await getData();
  const updated = deepMerge(current, partial);
  await setData(updated);
  return updated;
}

function getDefault() {
  return {
    amy: { completedDays: [] },
    karl: { completedDays: [] },
    quotes: [],
    challenges: [],
    banner: "We are love, health, wealth & abundance — aligned, strong, and unstoppable. Every day we show up for ourselves and each other. 🔥✨",
    mealPlan: { sharedPlan: {}, actual: { amy: {}, karl: {} }, shoppingList: [] },
  };
}

function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}
