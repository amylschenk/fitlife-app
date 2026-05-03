import { useState } from "react";
import { useRouter } from "next/router";
import { useData, askAI } from "@/hooks/useData";
import { DAYS, MEALS, FOODS } from "@/data";

const C = {
  card: { background: "#111118", border: "1px solid #1f1f2e", borderRadius: 16, padding: 24 },
  label: { fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 4 },
};

function timeAgo(ts) {
  const d = Date.now() - ts;
  const m = Math.floor(d / 60000), h = Math.floor(d / 3600000), dy = Math.floor(d / 86400000);
  if (m < 1) return "just now"; if (m < 60) return `${m}m ago`; if (h < 24) return `${h}h ago`; return `${dy}d ago`;
}

function getStreak(days) {
  if (!days?.length) return 0;
  const s = [...days].sort((a, b) => b - a);
  let streak = 1;
  for (let i = 1; i < s.length; i++) { if (s[i-1] - s[i] === 1) streak++; else break; }
  return streak;
}

export default function Home() {
  const router = useRouter();
  const { data, loading, save } = useData();
  const [activeTab, setActiveTab] = useState("home");
  const [newQuote, setNewQuote] = useState("");
  const [quoteAuthor, setQuoteAuthor] = useState("Amy");
  const [posting, setPosting] = useState(false);
  const [bannerEditing, setBannerEditing] = useState(false);
  const [bannerDraft, setBannerDraft] = useState("");
  const [horoscope, setHoroscope] = useState({ sign: null, text: "", loading: false });
  const [challengeForm, setChallengeForm] = useState({ from: "Amy", to: "Karl", title: "", description: "", days: "7", exercises: "" });
  const [challengeSent, setChallengeSent] = useState(false);
  const [mealDay, setMealDay] = useState("Monday");
  const [mealSubTab, setMealSubTab] = useState("plan");
  const [trackUser, setTrackUser] = useState("Amy");
  const [shoppingList, setShoppingList] = useState([]);
  const [generatingList, setGeneratingList] = useState(false);

  if (loading || !data) return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#a78bfa", fontSize: 16 }}>Loading FitLife...</div>
    </div>
  );

  const amyDone = (data.amy?.completedDays || []).length;
  const karlDone = (data.karl?.completedDays || []).length;
  const amyPct = Math.round((amyDone / 15) * 100);
  const karlPct = Math.round((karlDone / 15) * 100);
  const leader = amyDone > karlDone ? "Amy" : karlDone > amyDone ? "Karl" : "Tied";

  const postQuote = async () => {
    if (!newQuote.trim() || posting) return;
    setPosting(true);
    save(d => ({ ...d, quotes: [{ text: newQuote.trim(), author: quoteAuthor, timestamp: Date.now() }, ...(d.quotes || [])].slice(0, 30) }));
    setNewQuote(""); setPosting(false);
  };

  const fetchHoroscope = async (sign) => {
    if (horoscope.sign === sign && horoscope.text) { setHoroscope({ sign: null, text: "", loading: false }); return; }
    setHoroscope({ sign, text: "", loading: true });
    try {
      const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
      const text = await askAI(
        `Give me today's horoscope for ${sign} for ${today}. Make it upbeat, specific, and relevant to someone doing a fitness challenge and manifesting their goals. 3-4 sentences. No intro — just dive in.`,
        "You are an upbeat, insightful astrologer. Give vivid, empowering daily horoscopes."
      );
      setHoroscope({ sign, text, loading: false });
    } catch { setHoroscope({ sign, text: "The stars are being shy — try again!", loading: false }); }
  };

  const sendChallenge = async () => {
    if (!challengeForm.title.trim() || !challengeForm.exercises.trim()) return;
    save(d => ({ ...d, challenges: [{ id: Date.now(), ...challengeForm, timestamp: Date.now(), accepted: false, completed: false }, ...(d.challenges || [])].slice(0, 20) }));
    setChallengeForm({ from: "Amy", to: "Karl", title: "", description: "", days: "7", exercises: "" });
    setChallengeSent(true); setTimeout(() => setChallengeSent(false), 3000);
  };

  const getPlannedCal = (day) => MEALS.reduce((sum, meal) => {
    const items = data.mealPlan?.sharedPlan?.[`${day}-${meal}`] || [];
    return sum + items.reduce((s, i) => s + (i.cal * (i.qty || 1)), 0);
  }, 0);

  const getActualCal = (user, day) => MEALS.reduce((sum, meal) => {
    const items = (data.mealPlan?.actual?.[user.toLowerCase()] || {})[`${day}-${meal}`] || [];
    return sum + items.reduce((s, i) => s + (i.cal * (i.qty || 1)), 0);
  }, 0);

  const tabs = [["home","🏠"],["challenges","⚡"],["meals","🥗"],["board","✨"]];

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", paddingBottom: 80 }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, background: "radial-gradient(ellipse at 30% 20%,rgba(139,92,246,.08) 0%,transparent 60%),radial-gradient(ellipse at 70% 80%,rgba(236,72,153,.06) 0%,transparent 60%)" }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 780, margin: "0 auto", padding: "0 16px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", padding: "32px 0 20px" }}>
          <div style={{ fontSize: 10, letterSpacing: ".35em", color: "#a78bfa", textTransform: "uppercase", marginBottom: 8 }}>Accountability HQ</div>
          <h1 style={{ fontSize: "clamp(1.6rem,5vw,2.4rem)", fontWeight: 400, margin: 0, background: "linear-gradient(135deg,#f0ebe0 0%,#e9d5ff 50%,#fbcfe8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Amy 🔥 & Karl 💪
          </h1>
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: 4, background: "#111118", borderRadius: 10, padding: 4, marginBottom: 20 }}>
          {tabs.map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id)} style={{ flex: 1, padding: "9px 4px", borderRadius: 7, border: "none", cursor: "pointer", background: activeTab === id ? "linear-gradient(135deg,#7c3aed,#db2777)" : "transparent", color: activeTab === id ? "#fff" : "#6b7280", fontSize: 13, transition: "all .2s" }}>{label} {id === "home" ? "Home" : id === "challenges" ? "Challenges" : id === "meals" ? "Meals" : "Board"}</button>
          ))}
        </div>

        {/* ─── HOME TAB ─── */}
        {activeTab === "home" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

            {/* Pending challenge alert */}
            {(data.challenges || []).filter(c => !c.accepted && !c.completed).length > 0 && (
              <div onClick={() => setActiveTab("challenges")} style={{ background: "linear-gradient(135deg,#450a0a,#1e0a2e)", border: "1px solid #fca5a544", borderRadius: 14, padding: "14px 20px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 20 }}>⚡</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#fca5a5" }}>New Challenge Waiting!</div>
                    <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{(data.challenges || []).filter(c => !c.accepted && !c.completed).map(c => `"${c.title}" from ${c.from}`).join(" · ")}</div>
                  </div>
                </div>
                <span style={{ fontSize: 12, color: "#fca5a5" }}>View →</span>
              </div>
            )}

            {/* Manifestation banner */}
            {bannerEditing ? (
              <div style={{ background: "linear-gradient(135deg,#0f0a1e,#1a0a2e)", border: "1px solid #7c3aed66", borderRadius: 16, padding: 20 }}>
                <div style={{ fontSize: 11, color: "#a78bfa", letterSpacing: ".15em", textTransform: "uppercase", marginBottom: 10 }}>✨ Edit Manifestation</div>
                <textarea value={bannerDraft} onChange={e => setBannerDraft(e.target.value)} rows={3} style={{ width: "100%", background: "#1a1a2a", border: "1px solid #2d2d3d", borderRadius: 10, padding: "12px 14px", color: "#f0ebe0", fontSize: 14, outline: "none", resize: "none", lineHeight: 1.7, boxSizing: "border-box" }} />
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button onClick={() => setBannerEditing(false)} style={{ flex: 1, padding: 9, borderRadius: 8, border: "1px solid #374151", background: "transparent", color: "#6b7280", cursor: "pointer" }}>Cancel</button>
                  <button onClick={() => { save(d => ({ ...d, banner: bannerDraft })); setBannerEditing(false); }} style={{ flex: 2, padding: 9, borderRadius: 8, border: "none", background: "linear-gradient(135deg,#7c3aed,#db2777)", color: "#fff", cursor: "pointer", fontWeight: 600 }}>✨ Save</button>
                </div>
              </div>
            ) : (
              <div style={{ position: "relative", overflow: "hidden", borderRadius: 16, background: "linear-gradient(135deg,#0f0a1e,#1a0a2e,#0a1020)", border: "1px solid #7c3aed44", padding: "18px 20px 14px" }}>
                <style>{`@keyframes marquee{0%{transform:translateX(100%)}100%{transform:translateX(-100%)}}.manifest{display:inline-block;animation:marquee 20s linear infinite;white-space:nowrap}.manifest:hover{animation-play-state:paused}`}</style>
                <div style={{ fontSize: 10, letterSpacing: ".2em", color: "#a78bfa", textTransform: "uppercase", marginBottom: 8 }}>✨ Our Manifestation ✨</div>
                <div style={{ overflow: "hidden" }}>
                  <div className="manifest" style={{ fontSize: 15, fontStyle: "italic", color: "#e9d5ff", lineHeight: 1.6 }}>
                    {data.banner}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{data.banner}
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                  <button onClick={() => { setBannerDraft(data.banner); setBannerEditing(true); }} style={{ background: "none", border: "1px solid #2d2047", borderRadius: 8, padding: "4px 10px", color: "#7c3aed", fontSize: 11, cursor: "pointer" }}>✏️ Edit</button>
                </div>
              </div>
            )}

            {/* Head to head */}
            <div style={{ background: "linear-gradient(135deg,#1a1a2e,#1e1528)", border: "1px solid #2d2047", borderRadius: 16, padding: "16px 20px", textAlign: "center" }}>
              {leader === "Tied"
                ? <div style={{ fontSize: 16, color: "#e9d5ff" }}>⚡ Dead even — {amyDone}/15 days. Game on.</div>
                : <div>
                    <span style={{ fontSize: 16 }}>🏆 <strong style={{ color: "#a78bfa" }}>{leader}</strong> is leading — </span>
                    <span style={{ fontSize: 13, color: "#9ca3af" }}>Amy {amyDone} · Karl {karlDone}</span>
                    {amyDone < karlDone && <div style={{ fontSize: 13, color: "#fca5a5", marginTop: 4 }}>🔥 Amy — Karl is ahead. Aries don't lose.</div>}
                    {karlDone < amyDone && <div style={{ fontSize: 13, color: "#fca5a5", marginTop: 4 }}>💪 Karl — Amy is leading. Pick it up.</div>}
                  </div>
              }
            </div>

            {/* Stat cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[
                { name: "Amy", done: amyDone, pct: amyPct, streak: getStreak(data.amy?.completedDays), days: data.amy?.completedDays || [], color: "#ec4899", emoji: "🔥", sign: "Aries ♈", signKey: "Aries", route: "/amy" },
                { name: "Karl", done: karlDone, pct: karlPct, streak: getStreak(data.karl?.completedDays), days: data.karl?.completedDays || [], color: "#7c3aed", emoji: "💪", sign: "Virgo ♍", signKey: "Virgo", route: "/karl" },
              ].map(p => (
                <div key={p.name} style={{ background: "#111118", border: `1px solid ${p.done < (p.name === "Amy" ? karlDone : amyDone) ? "#7f1d1d" : "#1f1f2e"}`, borderRadius: 16, padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 600 }}>{p.emoji} {p.name}</div>
                      <button onClick={() => fetchHoroscope(p.signKey)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 11, color: p.color, marginTop: 2, textDecoration: "underline dotted" }}>
                        {horoscope.sign === p.signKey && horoscope.loading ? "Loading..." : p.sign}
                      </button>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 24, fontWeight: 700, color: p.color }}>{p.pct}%</div>
                      <div style={{ fontSize: 11, color: "#6b7280" }}>{p.done}/15</div>
                    </div>
                  </div>
                  {horoscope.sign === p.signKey && horoscope.text && (
                    <div style={{ background: `${p.color}11`, border: `1px solid ${p.color}33`, borderRadius: 8, padding: "10px 12px", marginBottom: 12, fontSize: 12, color: "#e9d5ff", lineHeight: 1.6, fontStyle: "italic" }}>✨ {horoscope.text}</div>
                  )}
                  <div style={{ height: 6, background: "#1f1f2e", borderRadius: 3, overflow: "hidden", marginBottom: 12 }}>
                    <div style={{ height: "100%", width: `${p.pct}%`, background: `linear-gradient(90deg,${p.color},${p.color}99)`, borderRadius: 3, transition: "width .5s" }} />
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 12 }}>
                    {Array.from({ length: 15 }, (_, i) => i + 1).map(d => (
                      <div key={d} style={{ width: 18, height: 18, borderRadius: 3, background: p.days.includes(d) ? p.color : "#1f1f2e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: p.days.includes(d) ? "#fff" : "#374151", fontWeight: 700 }}>{d}</div>
                    ))}
                  </div>
                  <button onClick={() => router.push(p.route)} style={{ width: "100%", padding: "8px", borderRadius: 8, border: `1px solid ${p.color}44`, background: `${p.color}11`, color: p.color, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                    Open My Challenge →
                  </button>
                </div>
              ))}
            </div>

            {/* Latest board posts */}
            {(data.quotes || []).length > 0 && (
              <div style={{ ...C.card }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div style={{ ...C.label, color: "#a78bfa" }}>✨ Latest from the Board</div>
                  <button onClick={() => setActiveTab("board")} style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid #2d2d3d", background: "transparent", color: "#a78bfa", fontSize: 12, cursor: "pointer" }}>See all →</button>
                </div>
                {(data.quotes || []).slice(0, 3).map((q, i) => (
                  <div key={i} style={{ background: "#1a1a2a", border: "1px solid #2d2d3d", borderRadius: 10, padding: "12px 14px", marginBottom: 8, borderLeft: `3px solid ${q.author === "Amy" ? "#ec4899" : "#7c3aed"}` }}>
                    <div style={{ fontSize: 14, color: "#f0ebe0", lineHeight: 1.6, marginBottom: 6 }}>"{q.text}"</div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 12, color: q.author === "Amy" ? "#ec4899" : "#7c3aed", fontWeight: 600 }}>— {q.author === "Amy" ? "🔥" : "💪"} {q.author}</span>
                      <span style={{ fontSize: 11, color: "#374151" }}>{timeAgo(q.timestamp)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── CHALLENGES TAB ─── */}
        {activeTab === "challenges" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ ...C.card }}>
              <div style={{ ...C.label, color: "#fca5a5" }}>⚡ Send a Challenge</div>
              <h2 style={{ margin: "0 0 16px", fontSize: "1.1rem", fontWeight: 600 }}>Dare Each Other</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".05em" }}>From</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {["Amy","Karl"].map(n => <button key={n} onClick={() => setChallengeForm(f => ({ ...f, from: n, to: n === "Amy" ? "Karl" : "Amy" }))} style={{ flex: 1, padding: 8, borderRadius: 8, border: "none", cursor: "pointer", background: challengeForm.from === n ? (n === "Amy" ? "#ec4899" : "#7c3aed") : "#1f1f2e", color: challengeForm.from === n ? "#fff" : "#6b7280", fontSize: 13 }}>{n === "Amy" ? "🔥" : "💪"} {n}</button>)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".05em" }}>To</div>
                    <div style={{ background: "#1a1a2a", border: "1px solid #2d2d3d", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#a78bfa" }}>→ {challengeForm.to === "Amy" ? "🔥 Amy" : "💪 Karl"}</div>
                  </div>
                </div>
                <input value={challengeForm.title} onChange={e => setChallengeForm(f => ({ ...f, title: e.target.value }))} placeholder="Challenge title..." style={{ background: "#1a1a2a", border: "1px solid #2d2d3d", borderRadius: 8, padding: "10px 12px", color: "#f0ebe0", fontSize: 14, outline: "none" }} />
                <textarea value={challengeForm.description} onChange={e => setChallengeForm(f => ({ ...f, description: e.target.value }))} placeholder="Rules, stakes, what winning looks like..." rows={2} style={{ background: "#1a1a2a", border: "1px solid #2d2d3d", borderRadius: 8, padding: "10px 12px", color: "#f0ebe0", fontSize: 14, outline: "none", resize: "none" }} />
                <textarea value={challengeForm.exercises} onChange={e => setChallengeForm(f => ({ ...f, exercises: e.target.value }))} placeholder="Exercises..." rows={3} style={{ background: "#1a1a2a", border: "1px solid #2d2d3d", borderRadius: 8, padding: "10px 12px", color: "#f0ebe0", fontSize: 14, outline: "none", resize: "none" }} />
                <div style={{ display: "flex", gap: 6 }}>
                  {["3","5","7","10","14","30"].map(d => <button key={d} onClick={() => setChallengeForm(f => ({ ...f, days: d }))} style={{ flex: 1, padding: "8px 4px", borderRadius: 8, border: "none", cursor: "pointer", background: challengeForm.days === d ? "linear-gradient(135deg,#7c3aed,#db2777)" : "#1f1f2e", color: challengeForm.days === d ? "#fff" : "#6b7280", fontSize: 12 }}>{d}d</button>)}
                </div>
                <button onClick={sendChallenge} disabled={!challengeForm.title.trim()} style={{ padding: 12, borderRadius: 10, border: "none", cursor: "pointer", background: !challengeForm.title.trim() ? "#1f1f2e" : "linear-gradient(135deg,#7c3aed,#db2777)", color: !challengeForm.title.trim() ? "#4b5563" : "#fff", fontSize: 15, fontWeight: 600 }}>
                  {challengeSent ? "✓ Sent!" : `⚡ Send to ${challengeForm.to}`}
                </button>
              </div>
            </div>

            <div style={{ ...C.card }}>
              <div style={{ ...C.label, color: "#a78bfa" }}>🏆 All Challenges</div>
              {(!data.challenges?.length)
                ? <div style={{ color: "#374151", fontSize: 14, fontStyle: "italic", textAlign: "center", padding: "20px 0" }}>No challenges yet — dare each other above 👆</div>
                : data.challenges.map(c => (
                  <div key={c.id} style={{ background: "#1a1a2a", border: `1px solid ${c.completed ? "#166534" : c.accepted ? "#7c3aed44" : "#db277744"}`, borderRadius: 12, padding: 14, marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <div style={{ fontSize: 15, fontWeight: 600 }}>{c.title}</div>
                      <div style={{ fontSize: 11, padding: "3px 8px", borderRadius: 20, background: c.completed ? "#166534" : c.accepted ? "#1e1b4b" : "#450a0a", color: c.completed ? "#86efac" : c.accepted ? "#a78bfa" : "#fca5a5" }}>{c.completed ? "✓ Done" : c.accepted ? "In Progress" : "Pending"}</div>
                    </div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>{c.from === "Amy" ? "🔥" : "💪"} {c.from} → {c.to === "Amy" ? "🔥" : "💪"} {c.to} · {c.days} days</div>
                    {c.description && <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 8 }}>{c.description}</div>}
                    <div style={{ fontSize: 13, color: "#c4b5fd", background: "#0f0f1a", borderRadius: 8, padding: "8px 12px", marginBottom: 10 }}>{c.exercises}</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {!c.accepted && !c.completed && <button onClick={() => save(d => ({ ...d, challenges: d.challenges.map(x => x.id === c.id ? { ...x, accepted: true } : x) }))} style={{ padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", background: "#7c3aed", color: "#fff", fontSize: 12 }}>Accept ⚡</button>}
                      {c.accepted && !c.completed && <button onClick={() => save(d => ({ ...d, challenges: d.challenges.map(x => x.id === c.id ? { ...x, completed: true } : x) }))} style={{ padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", background: "#166534", color: "#86efac", fontSize: 12 }}>Mark Complete ✓</button>}
                      <span style={{ fontSize: 11, color: "#374151", display: "flex", alignItems: "center" }}>{timeAgo(c.timestamp)}</span>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* ─── MEALS TAB ─── */}
        {activeTab === "meals" && (
          <MealTab data={data} save={save} mealDay={mealDay} setMealDay={setMealDay} mealSubTab={mealSubTab} setMealSubTab={setMealSubTab} trackUser={trackUser} setTrackUser={setTrackUser} shoppingList={shoppingList} setShoppingList={setShoppingList} generatingList={generatingList} setGeneratingList={setGeneratingList} />
        )}

        {/* ─── BOARD TAB ─── */}
        {activeTab === "board" && (
          <div style={{ ...C.card }}>
            <div style={{ ...C.label, color: "#a78bfa" }}>✨ Board</div>
            <h2 style={{ margin: "0 0 4px", fontSize: "1.1rem", fontWeight: 600 }}>Inspiration & Accountability</h2>
            <p style={{ margin: "0 0 18px", color: "#6b7280", fontSize: 13 }}>Quotes, hype, manifestations, trash talk — all welcome.</p>
            <div style={{ background: "#1a1a2a", border: "1px solid #2d2d3d", borderRadius: 12, padding: 14, marginBottom: 18 }}>
              <textarea value={newQuote} onChange={e => setNewQuote(e.target.value)} placeholder="Post something..." rows={3} style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: "#f0ebe0", fontSize: 14, resize: "none", lineHeight: 1.6, boxSizing: "border-box" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  {["Amy","Karl"].map(n => <button key={n} onClick={() => setQuoteAuthor(n)} style={{ padding: "5px 12px", borderRadius: 20, border: "none", cursor: "pointer", background: quoteAuthor === n ? (n === "Amy" ? "#ec4899" : "#7c3aed") : "#2d2d3d", color: quoteAuthor === n ? "#fff" : "#6b7280", fontSize: 12 }}>{n === "Amy" ? "🔥" : "💪"} {n}</button>)}
                </div>
                <button onClick={postQuote} disabled={!newQuote.trim() || posting} style={{ padding: "7px 18px", borderRadius: 8, border: "none", cursor: "pointer", background: !newQuote.trim() ? "#1f1f2e" : "linear-gradient(135deg,#7c3aed,#db2777)", color: !newQuote.trim() ? "#4b5563" : "#fff", fontSize: 13, fontWeight: 600 }}>{posting ? "..." : "Post"}</button>
              </div>
            </div>
            {(!data.quotes?.length)
              ? <div style={{ color: "#374151", fontSize: 14, fontStyle: "italic", textAlign: "center", padding: "20px 0" }}>Drop the first one 🔥</div>
              : data.quotes.map((q, i) => (
                <div key={i} style={{ background: "#1a1a2a", border: "1px solid #2d2d3d", borderRadius: 12, padding: "12px 14px", marginBottom: 8, borderLeft: `3px solid ${q.author === "Amy" ? "#ec4899" : "#7c3aed"}` }}>
                  <div style={{ fontSize: 14, color: "#f0ebe0", lineHeight: 1.6, marginBottom: 6 }}>"{q.text}"</div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, color: q.author === "Amy" ? "#ec4899" : "#7c3aed", fontWeight: 600 }}>— {q.author === "Amy" ? "🔥" : "💪"} {q.author}</span>
                    <span style={{ fontSize: 11, color: "#374151" }}>{timeAgo(q.timestamp)}</span>
                  </div>
                </div>
              ))
            }
          </div>
        )}
      </div>

      {/* Bottom nav for mobile */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#111118", borderTop: "1px solid #1f1f2e", display: "flex", zIndex: 100 }}>
        {[
          { id: "home", label: "Home", icon: "🏠" },
          { id: "challenges", label: "Challenges", icon: "⚡" },
          { id: "meals", label: "Meals", icon: "🥗" },
          { id: "board", label: "Board", icon: "✨" },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ flex: 1, padding: "10px 4px 12px", border: "none", background: "transparent", cursor: "pointer", color: activeTab === t.id ? "#a78bfa" : "#4b5563", fontSize: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <span style={{ fontSize: 20 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function FoodInput({ value = [], onChange, placeholder }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [qty, setQty] = useState(1);

  const search = (q) => {
    setQuery(q);
    setSuggestions(q.trim() ? FOODS.filter(f => f.name.toLowerCase().includes(q.toLowerCase())).slice(0, 7) : []);
  };

  const add = (food) => {
    const updated = [...value, { ...food, qty: Number(qty) || 1, id: Date.now() + Math.random() }];
    onChange(updated); setQuery(""); setSuggestions([]); setQty(1);
  };

  const remove = (id) => onChange(value.filter(i => i.id !== id));
  const total = value.reduce((s, i) => s + (i.cal * (i.qty || 1)), 0);

  return (
    <div style={{ position: "relative" }}>
      {value.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
          {value.map(item => (
            <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 4, background: "#1a1a2a", border: "1px solid #2d2d3d", borderRadius: 20, padding: "3px 8px 3px 10px", fontSize: 12 }}>
              <span style={{ color: "#f0ebe0" }}>{item.qty > 1 ? `${item.qty}× ` : ""}{item.name}</span>
              <span style={{ color: "#4b5563" }}> · {Math.round(item.cal * item.qty)}cal</span>
              <button onClick={() => remove(item.id)} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", padding: "0 0 0 4px", fontSize: 14 }}>×</button>
            </div>
          ))}
          <span style={{ fontSize: 12, color: "#86efac", fontWeight: 700, display: "flex", alignItems: "center", paddingLeft: 4 }}>{total}cal</span>
        </div>
      )}
      <div style={{ display: "flex", gap: 6 }}>
        <input value={query} onChange={e => search(e.target.value)} placeholder={placeholder || "Search food..."} style={{ flex: 1, background: "#0f0f1a", border: "1px solid #2d2d3d", borderRadius: 7, padding: "8px 10px", color: "#f0ebe0", fontSize: 13, outline: "none" }} />
        <input type="number" min="0.5" step="0.5" value={qty} onChange={e => setQty(e.target.value)} style={{ width: 48, background: "#0f0f1a", border: "1px solid #2d2d3d", borderRadius: 7, padding: "8px 6px", color: "#a78bfa", fontSize: 13, outline: "none", textAlign: "center" }} />
      </div>
      {suggestions.length > 0 && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 52, zIndex: 200, background: "#1a1a2a", border: "1px solid #2d2d3d", borderRadius: 10, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
          {suggestions.map((f, i) => (
            <div key={f.name} onClick={() => add(f)} style={{ padding: "10px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", borderBottom: i < suggestions.length - 1 ? "1px solid #111118" : "none" }}>
              <div>
                <span style={{ fontSize: 13, color: "#f0ebe0" }}>{f.name}</span>
                <span style={{ fontSize: 11, color: "#6b7280", marginLeft: 6 }}>{f.unit}</span>
              </div>
              <span style={{ fontSize: 12, color: "#86efac", fontWeight: 600 }}>{f.cal}cal</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState as useState2 } from "react";

function MealTab({ data, save, mealDay, setMealDay, mealSubTab, setMealSubTab, trackUser, setTrackUser, shoppingList, setShoppingList, generatingList, setGeneratingList }) {
  const plan = data.mealPlan?.sharedPlan || {};
  const actual = data.mealPlan?.actual || { amy: {}, karl: {} };

  const updatePlan = (day, meal, items) => save(d => ({ ...d, mealPlan: { ...d.mealPlan, sharedPlan: { ...(d.mealPlan?.sharedPlan || {}), [`${day}-${meal}`]: items } } }));
  const updateActual = (day, meal, items) => save(d => ({ ...d, mealPlan: { ...d.mealPlan, actual: { ...(d.mealPlan?.actual || {}), [trackUser.toLowerCase()]: { ...(d.mealPlan?.actual?.[trackUser.toLowerCase()] || {}), [`${day}-${meal}`]: items } } } }));

  const plannedCal = (day) => MEALS.reduce((s, m) => s + (plan[`${day}-${m}`] || []).reduce((a, i) => a + i.cal * (i.qty || 1), 0), 0);
  const actualCal = (user, day) => MEALS.reduce((s, m) => s + ((actual[user.toLowerCase()] || {})[`${day}-${m}`] || []).reduce((a, i) => a + i.cal * (i.qty || 1), 0), 0);

  const genList = async () => {
    setGeneratingList(true);
    const items = [...new Set(DAYS.flatMap(d => MEALS.flatMap(m => (plan[`${d}-${m}`] || []).map(i => i.name))))];
    if (!items.length) { setShoppingList(["Add meals to your plan first!"]); setGeneratingList(false); return; }
    try {
      const res = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: `Grocery list for 2 people for one week. Items: ${items.join(", ")}. Organize by store section (Produce, Proteins, Dairy & Eggs, Pantry, Frozen, Other) with quantities. Section headers then items. No intro.`, system: "You are a helpful meal planning assistant." }) });
      const d = await res.json();
      setShoppingList(d.text?.split("\n").filter(l => l.trim()) || []);
    } catch { setShoppingList(["Error — try again"]); }
    setGeneratingList(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ ...C.card }}>
        <div style={{ ...C.label, color: "#86efac" }}>🥗 Meal Planner</div>
        <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
          {[["plan","📋 Plan"],["track","📊 Track"],["list","🛒 List"]].map(([id,label]) => (
            <button key={id} onClick={() => setMealSubTab(id)} style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", cursor: "pointer", background: mealSubTab === id ? "linear-gradient(135deg,#7c3aed,#db2777)" : "#1f1f2e", color: mealSubTab === id ? "#fff" : "#6b7280", fontSize: 13 }}>{label}</button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {DAYS.map(day => {
          const cal = plannedCal(day);
          return <button key={day} onClick={() => setMealDay(day)} style={{ flex: 1, minWidth: 48, padding: "7px 2px", borderRadius: 8, border: "none", cursor: "pointer", background: mealDay === day ? "linear-gradient(135deg,#7c3aed,#db2777)" : "#111118", color: mealDay === day ? "#fff" : "#6b7280", fontSize: 10, textAlign: "center" }}>
            <div style={{ fontWeight: 700 }}>{day.slice(0,3)}</div>
            {cal > 0 && <div style={{ fontSize: 8, marginTop: 1, color: mealDay === day ? "#e9d5ff" : "#374151" }}>{cal}c</div>}
          </button>;
        })}
      </div>

      {mealSubTab === "plan" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 15, fontWeight: 600 }}>{mealDay}</span>
            <span style={{ fontSize: 13, color: "#86efac" }}>~{plannedCal(mealDay)} cal planned</span>
          </div>
          {MEALS.map(meal => (
            <div key={meal} style={{ background: "#111118", border: "1px solid #1f1f2e", borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 11, color: "#a78bfa", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10, fontWeight: 700 }}>{meal}</div>
              <FoodInput value={plan[`${mealDay}-${meal}`] || []} onChange={items => updatePlan(mealDay, meal, items)} placeholder={`Add ${meal.toLowerCase()}...`} />
            </div>
          ))}
        </div>
      )}

      {mealSubTab === "track" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 8 }}>
            {["Amy","Karl"].map(n => <button key={n} onClick={() => setTrackUser(n)} style={{ flex: 1, padding: 9, borderRadius: 8, border: "none", cursor: "pointer", background: trackUser === n ? (n === "Amy" ? "#ec4899" : "#7c3aed") : "#1f1f2e", color: trackUser === n ? "#fff" : "#6b7280", fontSize: 14 }}>{n === "Amy" ? "🔥 Amy" : "💪 Karl"}</button>)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {["Amy","Karl"].map(u => {
              const cal = actualCal(u, mealDay);
              const planned = plannedCal(mealDay);
              return <div key={u} style={{ background: "#111118", border: `1px solid ${u==="Amy"?"#ec489933":"#7c3aed33"}`, borderRadius: 12, padding: "12px 14px", textAlign: "center" }}>
                <div style={{ fontSize: 11, color: u==="Amy"?"#ec4899":"#7c3aed", marginBottom: 4 }}>{u==="Amy"?"🔥":"💪"} {u}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: cal > 1800 ? "#fca5a5" : cal > 0 ? "#86efac" : "#374151" }}>{cal}</div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>cal eaten</div>
                {planned > 0 && cal > 0 && <div style={{ fontSize: 11, color: cal - planned > 100 ? "#fca5a5" : "#86efac", marginTop: 4 }}>{cal - planned > 0 ? `+${cal - planned}` : cal - planned} vs plan</div>}
              </div>;
            })}
          </div>
          {MEALS.map(meal => (
            <div key={meal} style={{ background: "#111118", border: "1px solid #1f1f2e", borderRadius: 12, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: "#a78bfa", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 700 }}>{meal}</div>
                {(plan[`${mealDay}-${meal}`] || []).length > 0 && <div style={{ fontSize: 11, color: "#374151" }}>Plan: {(plan[`${mealDay}-${meal}`] || []).map(i => i.name).join(", ")}</div>}
              </div>
              <FoodInput value={(actual[trackUser.toLowerCase()] || {})[`${mealDay}-${meal}`] || []} onChange={items => updateActual(mealDay, meal, items)} placeholder="What did you actually eat?" />
            </div>
          ))}
        </div>
      )}

      {mealSubTab === "list" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <button onClick={genList} disabled={generatingList} style={{ padding: 14, borderRadius: 10, border: "none", cursor: "pointer", background: generatingList ? "#1f1f2e" : "linear-gradient(135deg,#7c3aed,#db2777)", color: generatingList ? "#4b5563" : "#fff", fontSize: 15, fontWeight: 600 }}>
            {generatingList ? "Generating..." : "🛒 Generate Shopping List"}
          </button>
          {shoppingList.length > 0 && (
            <div style={{ ...C.card }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600 }}>🛒 Shopping List</h2>
                <button onClick={() => navigator.clipboard?.writeText(shoppingList.join("\n"))} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #374151", background: "transparent", color: "#9ca3af", fontSize: 12, cursor: "pointer" }}>Copy</button>
              </div>
              {shoppingList.map((line, i) => {
                const isHeader = line.endsWith(":") && line.length < 30;
                return <div key={i} style={{ padding: isHeader ? "10px 0 3px" : "5px 12px", fontSize: isHeader ? 11 : 14, color: isHeader ? "#a78bfa" : "#f0ebe0", fontWeight: isHeader ? 700 : 400, letterSpacing: isHeader ? ".08em" : 0, textTransform: isHeader ? "uppercase" : "none", borderLeft: isHeader ? "none" : "2px solid #1f1f2e" }}>{line}</div>;
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
