import { useState, useEffect, useCallback } from "react";

export function useData() {
  const [data, setDataState] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/data");
      const d = await res.json();
      setDataState(d);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 20000);
    return () => clearInterval(interval);
  }, [load]);

  const save = useCallback(async (updater) => {
    setDataState(prev => {
      const next = typeof updater === "function" ? updater(prev) : { ...prev, ...updater };
      fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      return next;
    });
  }, []);

  return { data, loading, save, reload: load };
}

export async function askAI(prompt, system) {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, system }),
  });
  const d = await res.json();
  if (d.error) throw new Error(d.error);
  return d.text;
}
