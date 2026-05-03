import { useState } from "react";
import { useRouter } from "next/router";
import { useData, askAI } from "@/hooks/useData";
import { CHALLENGE_DATA, INTENSITY_COLOR, MUSIC_PLAYLISTS } from "@/data";

const BUILD_QUESTIONS = [
  { id: "goal",      label: "What's your top goal?",            type: "single", options: ["Fat Loss", "Build Muscle", "Endurance", "Strength", "Mobility"] },
  { id: "time",      label: "How much time per workout?",       type: "single", options: ["20 min", "30 min", "45 min", "60 min"] },
  { id: "equipment", label: "What equipment do you have?",      type: "multi",  options: ["None / Bodyweight", "Pull-up Bar", "Dumbbells", "Kettlebell", "Resistance Bands", "Full Home Gym"] },
  { id: "days",      label: "Days per week you can train?",     type: "single", options: ["3", "4", "5", "6", "7"] },
  { id: "avoid",     label: "Anything to avoid? (joints etc)",  type: "multi",  options: ["Knees", "Lower Back", "Shoulders", "Wrists", "Nothing — bring it"] },
  { id: "mix",       label: "HIIT vs Strength?",                type: "single", options: ["All HIIT", "Mostly HIIT", "Balanced", "Mostly Strength"] },
];

export default function KarlChallenge() {
  const router = useRouter();
  const { data, loading, save } = useData();
  const [selectedDay, setSelectedDay] = useState(null);
  const [activeTab, setActiveTab] = useState("plan");
  const [chatHistory, setChatHistory] = useState([]);
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [musicTab, setMusicTab] = useState("hiit");
  const [buildAnswers, setBuildAnswers] = useState({ goal: null, time: null, equipment: [], days: null, avoid: [], mix: null, notes: "" });
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState(null);

  if (loading || !data) return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#7c3aed", fontSize: 16 }}>Loading Karl's Challenge...</div>
    </div>
  );

  const customChallenge = data.karl?.customChallenge;
  const useCustom = !!data.karl?.useCustom && Array.isArray(customChallenge) && customChallenge.length === 15;
  const activeChallenge = useCustom ? customChallenge : CHALLENGE_DATA;
  const completedDays = (useCustom ? data.karl?.customCompletedDays : data.karl?.completedDays) || [];
  const progressPercent = Math.round((completedDays.length / 15) * 100);

  const markComplete = (day) => {
    const updated = completedDays.includes(day) ? completedDays.filter(d => d !== day) : [...completedDays, day];
    if (useCustom) {
      save(d => ({ ...d, karl: { ...d.karl, customCompletedDays: updated } }));
    } else {
      save(d => ({ ...d, karl: { ...d.karl, completedDays: updated } }));
    }
  };

  const togglePlan = () => {
    setSelectedDay(null);
    save(d => ({ ...d, karl: { ...d.karl, useCustom: !useCustom } }));
  };

  const setSingle = (id, value) => setBuildAnswers(a => ({ ...a, [id]: value }));
  const toggleMulti = (id, opt) => setBuildAnswers(a => ({ ...a, [id]: a[id].includes(opt) ? a[id].filter(x => x !== opt) : [...a[id], opt] }));
  const allRequiredAnswered = ["goal","time","days","mix"].every(k => buildAnswers[k]);

  const askCoach = async (question) => {
    if (!question.trim() || aiLoading) return;
    setAiLoading(true);
    setAiQuestion("");
    const newHistory = [...chatHistory, { role: "user", content: question }];
    setChatHistory(newHistory);
    try {
      const context = newHistory.map(m => `${m.role === "user" ? "Karl" : "Coach"}: ${m.content}`).join("\n\n");
      const text = await askAI(
        `${context}\n\nCoach:`,
        "You are Coach — a no-nonsense, high-energy personal trainer. Your client is Karl, a fit 50-year-old man who is active and trains regularly with HIIT and calisthenics. He does NOT need old-man treatment — push him hard, like an athlete. Be direct, specific, motivating. No fluff. 3-5 sentences max."
      );
      setChatHistory([...newHistory, { role: "assistant", content: text }]);
    } catch (err) {
      setChatHistory([...newHistory, { role: "assistant", content: `Error: ${err.message}` }]);
    }
    setAiLoading(false);
  };

  const generateChallenge = async () => {
    if (!allRequiredAnswered || generating) return;
    setGenerating(true);
    setGenerateError(null);
    try {
      const intake = [
        `- Top goal: ${buildAnswers.goal}`,
        `- Time per workout: ${buildAnswers.time}`,
        `- Equipment: ${buildAnswers.equipment.length ? buildAnswers.equipment.join(", ") : "None / Bodyweight"}`,
        `- Training days/week: ${buildAnswers.days}`,
        `- Avoid: ${buildAnswers.avoid.length ? buildAnswers.avoid.join(", ") : "Nothing"}`,
        `- Mix preference: ${buildAnswers.mix}`,
        `- Karl's notes: ${buildAnswers.notes.trim() || "None"}`,
      ].join("\n");

      const prompt = [
        `Karl's intake:\n${intake}`,
        ``,
        `Generate his 15-day challenge now. Return ONLY a valid JSON array — no markdown fences, no preamble, no commentary. The array must contain EXACTLY 15 day objects, each matching this exact shape:`,
        ``,
        `{`,
        `  "day": <int 1-15>,`,
        `  "title": "<short punchy name>",`,
        `  "theme": "<one-line theme>",`,
        `  "focus": "<Full Body HIIT | Lower Body | Upper Body | Core | Mobility & Stretch | Cardio & Fat Burn | Glutes & Legs | Upper Body & Core | Legs & Cardio | Stretch & Breathe | Full Body | Full Body Strength | Cardio & Full Body | Stretch & Prep | Full Body Max Effort>",`,
        `  "duration": "<minutes, e.g. 35 min>",`,
        `  "intensity": "<High | Medium | Rest>",`,
        `  "calories": "<range, e.g. 280-340>",`,
        `  "exercises": [{ "name": "<exercise>", "reps": "<sets x reps or duration with rest, e.g. 4x12 (30 sec rest)>", "video": "<youtube search URL>" }],`,
        `  "tip": "<1-2 sentence direct motivating coach tip, no fluff>"`,
        `}`,
        ``,
        `Rules:`,
        `- Day 1 is a benchmark day. Day 15 is max effort.`,
        `- Include exactly 2 active recovery / mobility days, ideally days 5 and 12.`,
        `- Match Karl's chosen mix preference and time per workout.`,
        `- Each day should have 4-6 exercises.`,
        `- Use only equipment Karl said he has.`,
        `- Avoid anything that stresses the joints he listed.`,
        `- Video URLs MUST be in this exact format: https://www.youtube.com/results?search_query=NAME+form+tutorial — replace NAME with URL-encoded exercise name. These are YouTube search links, never direct video links.`,
      ].join("\n");

      const text = await askAI(
        prompt,
        "You are Coach building a 15-day workout plan. Karl is a fit 50-year-old man — active, athletic, trains regularly with HIIT and calisthenics. He does NOT want old-man treatment. Push him hard. Always return valid parseable JSON only — no commentary, no markdown.",
        4096
      );
      const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
      const parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) throw new Error("Plan must be a JSON array");
      if (parsed.length !== 15) throw new Error(`Plan has ${parsed.length} days, expected 15. Try again.`);
      save(d => ({ ...d, karl: { ...d.karl, customChallenge: parsed, useCustom: true, customCompletedDays: [] } }));
      setActiveTab("plan");
      setSelectedDay(null);
    } catch (err) {
      setGenerateError(err.message || "Something went wrong");
    }
    setGenerating(false);
  };

  const focusIcon = { "Full Body HIIT": "⚡", "Lower Body": "🦵", "Upper Body": "💪", "Core": "🔥", "Mobility & Stretch": "🌿", "Cardio & Fat Burn": "❤️", "Glutes & Legs": "✨", "Upper Body & Core": "💪", "Legs & Cardio": "🦵", "Stretch & Breathe": "🌿", "Full Body": "⚡", "Full Body Strength": "⚡", "Cardio & Full Body": "❤️", "Stretch & Prep": "🌿", "Full Body Max Effort": "🏆" };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", fontFamily: "'Georgia','Times New Roman',serif", color: "#f0ebe0", paddingBottom: 80 }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, background: "radial-gradient(ellipse at 20% 20%,rgba(236,72,153,.08) 0%,transparent 60%),radial-gradient(ellipse at 80% 80%,rgba(139,92,246,.06) 0%,transparent 60%)" }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 820, margin: "0 auto", padding: "0 16px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", padding: "32px 0 24px" }}>
          <div style={{ fontSize: 10, letterSpacing: ".35em", color: "#7c3aed", textTransform: "uppercase", marginBottom: 10 }}>🔥 Karl's Challenge · Virgo ♍</div>
          <h1 style={{ fontSize: "clamp(1.8rem,6vw,3rem)", fontWeight: 400, margin: 0, background: "linear-gradient(135deg,#f0ebe0 0%,#c4b5fd 50%,#c4b5fd 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            15-Day Calisthenics<br />Challenge
          </h1>
          <p style={{ color: "#9ca3af", fontSize: 14, marginTop: 10, fontStyle: "italic" }}>{useCustom ? "Built for you by Coach · Custom Plan" : "Default plan · 50 & Thriving · No gym required"}</p>

          <button onClick={() => router.push("/")} style={{ marginTop: 14, display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 10, background: "#1f1f2e", border: "1px solid #374151", color: "#a78bfa", fontSize: 13, cursor: "pointer" }}>
            ← Home Dashboard
          </button>

          {customChallenge && (
            <div style={{ marginTop: 14, display: "inline-flex", alignItems: "center", gap: 10, padding: "8px 14px", borderRadius: 10, background: useCustom ? "#1e1b4b" : "#1f1f2e", border: `1px solid ${useCustom ? "#7c3aed" : "#374151"}` }}>
              <span style={{ fontSize: 12, color: useCustom ? "#a78bfa" : "#9ca3af" }}>{useCustom ? "✓ My Custom Plan" : "Default Plan"}</span>
              <button onClick={togglePlan} style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: "#7c3aed", color: "#fff", fontSize: 11, cursor: "pointer" }}>
                Switch to {useCustom ? "Default" : "My Plan"}
              </button>
            </div>
          )}

          <div style={{ maxWidth: 400, margin: "20px auto 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6b7280", marginBottom: 5 }}>
              <span>{completedDays.length} of 15 days</span><span>{progressPercent}%</span>
            </div>
            <div style={{ height: 6, background: "#1f1f2e", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progressPercent}%`, background: "linear-gradient(90deg,#a78bfa,#7c3aed)", borderRadius: 3, transition: "width .5s" }} />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, background: "#111118", borderRadius: 10, padding: 4, marginBottom: 24 }}>
          {[["plan","📅 Plan"],["build","🛠 Build Mine"],["trainer","💪 Coach"],["music","🎵 Music"]].map(([id,label]) => (
            <button key={id} onClick={() => setActiveTab(id)} style={{ flex: 1, padding: "9px 0", borderRadius: 7, border: "none", cursor: "pointer", background: activeTab === id ? "linear-gradient(135deg,#7c3aed,#db2777)" : "transparent", color: activeTab === id ? "#fff" : "#6b7280", fontSize: 12, transition: "all .2s" }}>{label}</button>
          ))}
        </div>

        {/* ─── PLAN ─── */}
        {activeTab === "plan" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10, marginBottom: 24 }}>
              {activeChallenge.map(day => {
                const done = completedDays.includes(day.day);
                const sel = selectedDay?.day === day.day;
                return (
                  <div key={day.day} onClick={() => setSelectedDay(sel ? null : day)} style={{ background: sel ? "#1a1a2e" : "#111118", border: `1px solid ${sel ? "#7c3aed" : done ? "#374151" : "#1f1f2e"}`, borderRadius: 12, padding: 14, cursor: "pointer", position: "relative", transition: "all .2s" }}>
                    {done && <div style={{ position: "absolute", top: 8, right: 8, width: 20, height: 20, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff" }}>✓</div>}
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
                    <div style={{ fontSize: 11, color: "#7c3aed", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 4 }}>Day {selectedDay.day} · {selectedDay.focus}</div>
                    <h2 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 400 }}>{selectedDay.title}</h2>
                    <p style={{ margin: "4px 0 0", color: "#9ca3af", fontSize: 13, fontStyle: "italic" }}>{selectedDay.theme}</p>
                  </div>
                  <button onClick={() => markComplete(selectedDay.day)} style={{ padding: "9px 18px", borderRadius: 8, border: "none", cursor: "pointer", background: completedDays.includes(selectedDay.day) ? "linear-gradient(135deg,#7c3aed,#7c3aed)" : "#1f1f2e", color: completedDays.includes(selectedDay.day) ? "#fff" : "#6b7280", fontSize: 13, transition: "all .2s" }}>
                    {completedDays.includes(selectedDay.day) ? "✓ Completed!" : "Mark Complete"}
                  </button>
                </div>
                <div style={{ background: "linear-gradient(135deg,#1e1a2e,#1a1528)", border: "1px solid #2d2047", borderRadius: 10, padding: "12px 16px", marginBottom: 18, borderLeft: "3px solid #a78bfa" }}>
                  <div style={{ fontSize: 10, color: "#a78bfa", letterSpacing: ".1em", textTransform: "uppercase" }}>Coach's Note</div>
                  <p style={{ margin: "5px 0 0", fontSize: 13, color: "#c4b5fd", lineHeight: 1.5 }}>{selectedDay.tip}</p>
                </div>
                <div style={{ fontSize: 11, color: "#6b7280", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 10 }}>Exercises</div>
                {(selectedDay.exercises || []).map((ex, i) => (
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

        {/* ─── BUILD MINE ─── */}
        {activeTab === "build" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

            {/* Coach intro */}
            <div style={{ background: "linear-gradient(135deg,#1e1a2e,#1a1528)", border: "1px solid #2d2047", borderRadius: 16, padding: "18px 20px", borderLeft: "3px solid #a78bfa" }}>
              <div style={{ fontSize: 10, color: "#a78bfa", letterSpacing: ".15em", textTransform: "uppercase", marginBottom: 6 }}>💪 Coach</div>
              <p style={{ margin: 0, fontSize: 14, color: "#c4b5fd", lineHeight: 1.6 }}>
                Answer these and I'll build you a 15-day HIIT/calisthenics plan tailored to your goals, equipment, and schedule. No old-man treatment.
              </p>
            </div>

            {customChallenge && (
              <div style={{ background: "#111118", border: "1px solid #166534", borderLeft: "3px solid #86efac", borderRadius: 12, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 14, color: "#86efac", fontWeight: 600 }}>✓ You have a custom plan</div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>Currently {useCustom ? "active" : "saved but not active"}. Build a new one to replace it.</div>
                </div>
                {!useCustom && <button onClick={togglePlan} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "#7c3aed", color: "#fff", fontSize: 12, cursor: "pointer" }}>Activate</button>}
              </div>
            )}

            {/* Questions */}
            {BUILD_QUESTIONS.map(q => (
              <div key={q.id} style={{ background: "#111118", border: "1px solid #1f1f2e", borderRadius: 12, padding: 18 }}>
                <div style={{ fontSize: 10, color: "#7c3aed", letterSpacing: ".15em", textTransform: "uppercase", marginBottom: 4 }}>Coach asks</div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: "#f0ebe0" }}>{q.label} {q.type === "multi" && <span style={{ fontSize: 11, fontWeight: 400, color: "#6b7280" }}>(pick any)</span>}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {q.options.map(opt => {
                    const selected = q.type === "single" ? buildAnswers[q.id] === opt : buildAnswers[q.id].includes(opt);
                    return (
                      <button key={opt} onClick={() => q.type === "single" ? setSingle(q.id, opt) : toggleMulti(q.id, opt)} style={{ padding: "8px 14px", borderRadius: 20, border: `1px solid ${selected ? "#7c3aed" : "#2d2d3d"}`, background: selected ? "linear-gradient(135deg,#7c3aed44,#db277744)" : "#1a1a2a", color: selected ? "#fff" : "#9ca3af", fontSize: 13, cursor: "pointer", fontWeight: selected ? 600 : 400, transition: "all .2s" }}>{opt}</button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Notes */}
            <div style={{ background: "#111118", border: "1px solid #1f1f2e", borderRadius: 12, padding: 18 }}>
              <div style={{ fontSize: 10, color: "#7c3aed", letterSpacing: ".15em", textTransform: "uppercase", marginBottom: 4 }}>Coach asks</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: "#f0ebe0" }}>Anything else? <span style={{ fontSize: 11, fontWeight: 400, color: "#6b7280" }}>(optional — injuries, preferences, what's worked before)</span></div>
              <textarea value={buildAnswers.notes} onChange={e => setBuildAnswers(a => ({ ...a, notes: e.target.value }))} rows={3} placeholder="e.g. I get bored fast — keep it varied. Or: I've got a tweaky shoulder from last year." style={{ width: "100%", background: "#1a1a2a", border: "1px solid #2d2d3d", borderRadius: 10, padding: "10px 12px", color: "#f0ebe0", fontSize: 14, outline: "none", resize: "vertical", lineHeight: 1.5, boxSizing: "border-box" }} />
            </div>

            {/* Generate */}
            <button onClick={generateChallenge} disabled={!allRequiredAnswered || generating} style={{ padding: "14px 18px", borderRadius: 12, border: "none", cursor: allRequiredAnswered && !generating ? "pointer" : "not-allowed", background: allRequiredAnswered && !generating ? "linear-gradient(135deg,#7c3aed,#db2777)" : "#1f1f2e", color: allRequiredAnswered && !generating ? "#fff" : "#4b5563", fontSize: 15, fontWeight: 700, letterSpacing: ".02em" }}>
              {generating ? "⚡ Coach is building your plan… (~10-30 sec)" : allRequiredAnswered ? "🔥 Build My 15-Day Plan" : "Answer the required questions ↑"}
            </button>

            {generateError && (
              <div style={{ background: "#1a0a0a", border: "1px solid #fca5a544", borderLeft: "3px solid #fca5a5", borderRadius: 10, padding: "12px 16px", color: "#fca5a5", fontSize: 13 }}>
                Hmm — {generateError}. Tap "Build My 15-Day Plan" to try again.
              </div>
            )}
          </div>
        )}

        {/* ─── COACH ─── */}
        {activeTab === "trainer" && (
          <div style={{ background: "#111118", border: "1px solid #1f1f2e", borderRadius: 16, padding: 22 }}>
            <h2 style={{ margin: "0 0 4px", fontSize: "1.1rem", fontWeight: 400 }}>💪 Coach — Your AI Trainer</h2>
            <p style={{ margin: "0 0 16px", color: "#6b7280", fontSize: 13 }}>Ask anything — nutrition, workouts, motivation, recovery.</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 18 }}>
              {["What should I eat tonight?","Why isn't the scale moving?","I only have 20 min — what should I do?","Talk to me about alcohol and fat loss","I'm gassed today — should I work out?"].map(q => (
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
        {[["plan","📅","Plan"],["build","🛠","Build"],["trainer","💪","Coach"],["music","🎵","Music"]].map(([id,icon,label]) => (
          <button key={id} onClick={() => setActiveTab(id)} style={{ flex: 1, padding: "10px 4px 12px", border: "none", background: "transparent", cursor: "pointer", color: activeTab === id ? "#7c3aed" : "#4b5563", fontSize: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
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
