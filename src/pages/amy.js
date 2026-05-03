import { useState } from "react";
import { useRouter } from "next/router";
import { useData, askAI } from "@/hooks/useData";
import { CHALLENGE_DATA, INTENSITY_COLOR, MUSIC_PLAYLISTS } from "@/data";

export default function AmyChallenge() {
  const router = useRouter();
  const { data, loading, save } = useData();
  const [selectedDay, setSelectedDay] = useState(null);
  const [activeTab, setActiveTab] = useState("plan");
  const [chatHistory, setChatHistory] = useState([]);
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [musicTab, setMusicTab] = useState("hiit");

  if (loading || !data) return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#ec4899", fontSize: 16 }}>Loading Amy's Challenge...</div>
    </div>
  );

  const completedDays = data.amy?.completedDays || [];
  const progressPercent = Math.round((completedDays.length / 15) * 100);

  const markComplete = (day) => {
    const updated = completedDays.includes(day) ? completedDays.filter(d => d !== day) : [...completedDays, day];
    save(d => ({ ...d, amy: { ...d.amy, completedDays: updated } }));
  };

  const askCoach = async (question) => {
    if (!question.trim() || aiLoading) return;
    setAiLoading(true);
    setAiQuestion("");
    const newHistory = [...chatHistory, { role: "user", content: question }];
    setChatHistory(newHistory);
    try {
      const context = newHistory.map(m => `${m.role === "user" ? "Amy" : "Coach"}: ${m.content}`).join("\n\n");
      const text = await askAI(
        `${context}\n\nCoach:`,
        "You are Coach — a no-nonsense, high-energy personal trainer. Your client is Amy, a fit 50-year-old ER nurse doing 12-hour shifts. She does squats and bodyweight training regularly. She weighs 125 lbs (normal 115) and wants to lose 10-15 lbs. She is NOT a beginner. Be direct, specific, motivating. No fluff. 3-5 sentences max."
      );
      setChatHistory([...newHistory, { role: "assistant", content: text }]);
    } catch (err) {
      setChatHistory([...newHistory, { role: "assistant", content: `Error: ${err.message}` }]);
    }
    setAiLoading(false);
  };

  const focusIcon = { "Full Body HIIT": "⚡", "Lower Body": "🦵", "Upper Body": "💪", "Core": "🔥", "Mobility & Stretch": "🌿", "Cardio & Fat Burn": "❤️", "Glutes & Legs": "✨", "Upper Body & Core": "💪", "Legs & Cardio": "🦵", "Stretch & Breathe": "🌿", "Full Body": "⚡", "Full Body Strength": "⚡", "Cardio & Full Body": "❤️", "Stretch & Prep": "🌿", "Full Body Max Effort": "🏆" };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", fontFamily: "'Georgia','Times New Roman',serif", color: "#f0ebe0", paddingBottom: 80 }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, background: "radial-gradient(ellipse at 20% 20%,rgba(236,72,153,.08) 0%,transparent 60%),radial-gradient(ellipse at 80% 80%,rgba(139,92,246,.06) 0%,transparent 60%)" }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 820, margin: "0 auto", padding: "0 16px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", padding: "32px 0 24px" }}>
          <div style={{ fontSize: 10, letterSpacing: ".35em", color: "#ec4899", textTransform: "uppercase", marginBottom: 10 }}>🔥 Amy's Challenge · Aries ♈</div>
          <h1 style={{ fontSize: "clamp(1.8rem,6vw,3rem)", fontWeight: 400, margin: 0, background: "linear-gradient(135deg,#f0ebe0 0%,#e9d5ff 50%,#fbcfe8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            15-Day Calisthenics<br />Challenge
          </h1>
          <p style={{ color: "#9ca3af", fontSize: 14, marginTop: 10, fontStyle: "italic" }}>Built for you · 50 & Thriving · No gym required</p>

          <button onClick={() => router.push("/")} style={{ marginTop: 14, display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 10, background: "#1f1f2e", border: "1px solid #374151", color: "#a78bfa", fontSize: 13, cursor: "pointer" }}>
            ← Home Dashboard
          </button>

          <div style={{ maxWidth: 400, margin: "20px auto 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6b7280", marginBottom: 5 }}>
              <span>{completedDays.length} of 15 days</span><span>{progressPercent}%</span>
            </div>
            <div style={{ height: 6, background: "#1f1f2e", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progressPercent}%`, background: "linear-gradient(90deg,#a78bfa,#ec4899)", borderRadius: 3, transition: "width .5s" }} />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, background: "#111118", borderRadius: 10, padding: 4, marginBottom: 24 }}>
          {[["plan","📅 Plan"],["trainer","💪 Coach"],["music","🎵 Music"]].map(([id,label]) => (
            <button key={id} onClick={() => setActiveTab(id)} style={{ flex: 1, padding: "9px 0", borderRadius: 7, border: "none", cursor: "pointer", background: activeTab === id ? "linear-gradient(135deg,#7c3aed,#db2777)" : "transparent", color: activeTab === id ? "#fff" : "#6b7280", fontSize: 13, transition: "all .2s" }}>{label}</button>
          ))}
        </div>

        {/* ─── PLAN ─── */}
        {activeTab === "plan" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10, marginBottom: 24 }}>
              {CHALLENGE_DATA.map(day => {
                const done = completedDays.includes(day.day);
                const sel = selectedDay?.day === day.day;
                return (
                  <div key={day.day} onClick={() => setSelectedDay(sel ? null : day)} style={{ background: sel ? "#1a1a2e" : "#111118", border: `1px solid ${sel ? "#ec4899" : done ? "#374151" : "#1f1f2e"}`, borderRadius: 12, padding: 14, cursor: "pointer", position: "relative", transition: "all .2s" }}>
                    {done && <div style={{ position: "absolute", top: 8, right: 8, width: 20, height: 20, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#ec4899)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff" }}>✓</div>}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                      <span style={{ background: "#1f1f2e", borderRadius: 5, padding: "2px 7px", fontSize: 10, color: "#a78bfa" }}>Day {day.day}</span>
                      <span style={{ background: (INTENSITY_COLOR[day.intensity] || "#6b7280") + "22", color: INTENSITY_COLOR[day.intensity] || "#6b7280", borderRadius: 5, padding: "2px 7px", fontSize: 10 }}>{day.intensity}</span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{day.title}</div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>{day.theme}</div>
                    <div style={{ fontSize: 11, color: "#9ca3af" }}>{focusIcon[day.focus] || "⚡"} {day.focus}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 10, color: "#4b5563" }}>
                      <span>⏱ {day.duration}</span><span>🔥 ~{day.calories} cal</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedDay && (
              <div style={{ background: "#111118", border: "1px solid #2d2d3d", borderRadius: 16, padding: 24, marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
                  <div>
                    <div style={{ fontSize: 11, color: "#ec4899", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 4 }}>Day {selectedDay.day} · {selectedDay.focus}</div>
                    <h2 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 400 }}>{selectedDay.title}</h2>
                    <p style={{ margin: "4px 0 0", color: "#9ca3af", fontSize: 13, fontStyle: "italic" }}>{selectedDay.theme}</p>
                  </div>
                  <button onClick={() => markComplete(selectedDay.day)} style={{ padding: "9px 18px", borderRadius: 8, border: "none", cursor: "pointer", background: completedDays.includes(selectedDay.day) ? "linear-gradient(135deg,#7c3aed,#ec4899)" : "#1f1f2e", color: completedDays.includes(selectedDay.day) ? "#fff" : "#6b7280", fontSize: 13, transition: "all .2s" }}>
                    {completedDays.includes(selectedDay.day) ? "✓ Completed!" : "Mark Complete"}
                  </button>
                </div>
                <div style={{ background: "linear-gradient(135deg,#1e1a2e,#1a1528)", border: "1px solid #2d2047", borderRadius: 10, padding: "12px 16px", marginBottom: 18, borderLeft: "3px solid #a78bfa" }}>
                  <div style={{ fontSize: 10, color: "#a78bfa", letterSpacing: ".1em", textTransform: "uppercase" }}>Coach's Note</div>
                  <p style={{ margin: "5px 0 0", fontSize: 13, color: "#c4b5fd", lineHeight: 1.5 }}>{selectedDay.tip}</p>
                </div>
                <div style={{ fontSize: 11, color: "#6b7280", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 10 }}>Exercises</div>
                {selectedDay.exercises.map((ex, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: i < selectedDay.exercises.length - 1 ? "1px solid #1f1f2e" : "none", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ fontSize: 14, marginBottom: 2 }}>{ex.name}</div>
                      <div style={{ fontSize: 12, color: "#9ca3af" }}>{ex.reps}</div>
                    </div>
                    <a href={ex.video} target="_blank" rel="noopener noreferrer" style={{ padding: "6px 12px", borderRadius: 7, background: "#1f1f2e", border: "1px solid #374151", color: "#a78bfa", fontSize: 12, textDecoration: "none", whiteSpace: "nowrap" }}>▶ Watch</a>
                  </div>
                ))}
              </div>
            )}
            {!selectedDay && <div style={{ textAlign: "center", padding: "8px 0 20px", color: "#4b5563", fontSize: 13, fontStyle: "italic" }}>Tap any day to see your workout ↑</div>}
          </>
        )}

        {/* ─── COACH ─── */}
        {activeTab === "trainer" && (
          <div style={{ background: "#111118", border: "1px solid #1f1f2e", borderRadius: 16, padding: 22 }}>
            <h2 style={{ margin: "0 0 4px", fontSize: "1.1rem", fontWeight: 400 }}>💪 Coach — Your AI Trainer</h2>
            <p style={{ margin: "0 0 16px", color: "#6b7280", fontSize: 13 }}>Ask anything — nutrition, workouts, motivation, recovery.</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 18 }}>
              {["What should I eat tonight?","Why isn't the scale moving?","I only have 20 min — what should I do?","Talk to me about alcohol and fat loss","I'm exhausted from a shift — should I work out?"].map(q => (
                <button key={q} onClick={() => askCoach(q)} disabled={aiLoading} style={{ padding: "6px 11px", borderRadius: 20, border: "1px solid #2d2d3d", background: "#1a1a2a", color: "#c4b5fd", fontSize: 12, cursor: aiLoading ? "not-allowed" : "pointer", opacity: aiLoading ? .5 : 1 }}>{q}</button>
              ))}
            </div>
            <div style={{ minHeight: 180, maxHeight: 380, overflowY: "auto", marginBottom: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              {chatHistory.length === 0 && <div style={{ color: "#4b5563", fontSize: 13, fontStyle: "italic", textAlign: "center", padding: "30px 0" }}>Tap a question or type below ↓</div>}
              {chatHistory.map((msg, i) => (
                <div key={i} style={{ alignSelf: msg.role === "user" ? "flex-end" : "flex-start", maxWidth: "85%", background: msg.role === "user" ? "linear-gradient(135deg,#7c3aed22,#db277722)" : "#1a1a2a", border: `1px solid ${msg.role === "user" ? "#7c3aed44" : "#2d2d3d"}`, borderRadius: 12, padding: "10px 14px", fontSize: 14, lineHeight: 1.6 }}>
                  {msg.role === "assistant" && <div style={{ fontSize: 10, color: "#7c3aed", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 5 }}>Coach</div>}
                  {msg.content}
                </div>
              ))}
              {aiLoading && (
                <div style={{ alignSelf: "flex-start", background: "#1a1a2a", border: "1px solid #2d2d3d", borderRadius: 12, padding: "10px 14px", fontSize: 14, color: "#6b7280", display: "flex", gap: 6, alignItems: "center" }}>
                  <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}`}</style>
                  {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#7c3aed", animation: `bounce 1.2s ease-in-out ${i*.2}s infinite` }} />)}
                  Coach is thinking...
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={aiQuestion} onChange={e => setAiQuestion(e.target.value)} onKeyDown={e => e.key === "Enter" && !aiLoading && askCoach(aiQuestion)} placeholder="Ask Coach anything..." disabled={aiLoading} style={{ flex: 1, padding: "11px 14px", borderRadius: 10, border: "1px solid #2d2d3d", background: "#1a1a2a", color: "#f0ebe0", fontSize: 14, outline: "none", opacity: aiLoading ? .7 : 1 }} />
              <button onClick={() => askCoach(aiQuestion)} disabled={aiLoading || !aiQuestion.trim()} style={{ padding: "11px 18px", borderRadius: 10, border: "none", background: aiLoading || !aiQuestion.trim() ? "#1f1f2e" : "linear-gradient(135deg,#7c3aed,#db2777)", color: aiLoading || !aiQuestion.trim() ? "#4b5563" : "#fff", cursor: aiLoading || !aiQuestion.trim() ? "not-allowed" : "pointer", fontSize: 14 }}>
                {aiLoading ? "..." : "Ask"}
              </button>
            </div>
          </div>
        )}

        {/* ─── MUSIC ─── */}
        {activeTab === "music" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "flex", gap: 6 }}>
              {[["hiit","🔥 HIIT"],["vibe","✨ High Vibe"]].map(([id,label]) => (
                <button key={id} onClick={() => setMusicTab(id)} style={{ flex: 1, padding: 9, borderRadius: 8, border: "none", cursor: "pointer", background: musicTab === id ? "linear-gradient(135deg,#7c3aed,#db2777)" : "#111118", color: musicTab === id ? "#fff" : "#6b7280", fontSize: 13 }}>{label}</button>
              ))}
            </div>
            {MUSIC_PLAYLISTS.filter(p => p.category === musicTab).map(item => (
              <a key={item.title} href={item.url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderRadius: 12, background: "#111118", border: "1px solid #1f1f2e", textDecoration: "none", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 22 }}>{item.emoji}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#f0ebe0" }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{item.desc}</div>
                  </div>
                </div>
                <div style={{ background: "#1DB954", borderRadius: 20, padding: "5px 12px", fontSize: 11, color: "#000", fontWeight: 700, whiteSpace: "nowrap" }}>▶ Spotify</div>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#111118", borderTop: "1px solid #1f1f2e", display: "flex", zIndex: 100 }}>
        {[["plan","📅","Plan"],["trainer","💪","Coach"],["music","🎵","Music"]].map(([id,icon,label]) => (
          <button key={id} onClick={() => setActiveTab(id)} style={{ flex: 1, padding: "10px 4px 12px", border: "none", background: "transparent", cursor: "pointer", color: activeTab === id ? "#ec4899" : "#4b5563", fontSize: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <span style={{ fontSize: 20 }}>{icon}</span>{label}
          </button>
        ))}
        <button onClick={() => router.push("/")} style={{ flex: 1, padding: "10px 4px 12px", border: "none", background: "transparent", cursor: "pointer", color: "#4b5563", fontSize: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <span style={{ fontSize: 20 }}>🏠</span>Home
        </button>
      </div>
    </div>
  );
}
