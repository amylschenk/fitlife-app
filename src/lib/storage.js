bash

cat > /home/claude/fitlife-app/src/lib/storage.js << 'EOF'
import { put, head, getDownloadUrl } from "@vercel/blob";

const BLOB_KEY = "fitlife-data.json";

const DEFAULT = {
  amy: { completedDays: [] },
  karl: { completedDays: [] },
  quotes: [],
  challenges: [],
  banner: "We are love, health, wealth & abundance — aligned, strong, and unstoppable. Every day we show up for ourselves and each other. 🔥✨",
  mealPlan: { sharedPlan: {}, actual: { amy: {}, karl: {} }, shoppingList: [] },
};

export async function getData() {
  try {
    const res = await fetch(
      `https://${process.env.BLOB_STORE_ID}.public.blob.vercel-storage.com/${BLOB_KEY}`,
      { next: { revalidate: 0 } }
    );
    if (!res.ok) return DEFAULT;
    return await res.json();
  } catch {
    return DEFAULT;
  }
}

export async function setData(data) {
  const json = JSON.stringify(data);
  await put(BLOB_KEY, json, {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
  });
}
EOF
echo "Done"
Output

Done
Done
