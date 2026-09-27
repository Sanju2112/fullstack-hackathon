"use client";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Goal, GoalKey, Entry, goalMeta } from "@/lib/types";

type ReflectionRecord = {
  weekStart: string;
  mood: string;
  win: string;
  challenge: string;
  intention: string;
  createdAt?: string;
  updatedAt?: string;
  isSample?: boolean;
};
const sampleReflection: ReflectionRecord = {
  weekStart: "sample",
  mood: "steady",
  win: "I made time for a short walk on a busy day.",
  challenge: "My sleep routine shifted later than I wanted.",
  intention: "I’ll make a little space to wind down before bed.",
  isSample: true,
};
type Data = {
  name: string;
  goals: Goal[];
  entries: Entry[];
  streak: number;
  today: string;
};
const initials = (name = "") =>
  name
    .split(" ")
    .map((x) => x[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
export default function Dashboard() {
  const [data, setData] = useState<Data | null>(null);
  const [view, setView] = useState<"today" | "trends" | "goals" | "reflection">("today");
  const [saving, setSaving] = useState(false);
  const load = () =>
    fetch("/api/wellness")
      .then((r) => (r.ok ? r.json() : null))
      .then(setData);
  useEffect(() => {
    load();
  }, []);
  const todayEntry = useMemo(
    () =>
      data?.entries.find((e) => e.date === data.today) || {
        date: data?.today || "",
        water: 0,
        exercise: 0,
        sleep: 0,
        meditation: 0,
      },
    [data],
  );
  if (!data)
    return (
      <main className="loading">
        <div className="brand">
          wellnest<span>·</span>
        </div>
        <p>Preparing your calm corner...</p>
      </main>
    );
  const enabled = data.goals.filter((g) => g.enabled);
  const complete = enabled.filter(
    (g) => Number(todayEntry[g.key]) >= g.target,
  ).length;
  const wellness = enabled.length
    ? Math.round((complete / enabled.length) * 100)
    : 0;
  async function updateProgress(key: GoalKey, value: number) {
    setSaving(true);
    await fetch("/api/wellness", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...todayEntry, [key]: value }),
    });
    await load();
    setSaving(false);
  }
  async function saveGoals(goals: Goal[]) {
    setData((current) => (current ? { ...current, goals } : current));
    await fetch("/api/wellness", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goals }),
    });
  }
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    location.href = "/login";
  }
  return (
    <main className="app-shell">
      <aside>
        <div className="brand">
          wellnest<span>·</span>
        </div>
        <nav>
          <button
            className={view === "today" ? "active" : ""}
            onClick={() => setView("today")}
          >
            <i>◐</i> Today
          </button>
          <button
            className={view === "trends" ? "active" : ""}
            onClick={() => setView("trends")}
          >
            <i>⌁</i> Insights
          </button>
          <button
            className={view === "goals" ? "active" : ""}
            onClick={() => setView("goals")}
          >
            <i>⚙</i> My goals
          </button>
          <button
            className={view === "reflection" ? "active" : ""}
            onClick={() => setView("reflection")}
          >
            <i>✎</i> Weekly reflection
          </button>
        </nav>
        <div className="side-bottom">
          <div className="side-note">
            Lifestyle tracking only.
            <br />
            Not medical diagnosis.
          </div>
          <button className="logout" onClick={logout}>
            ↗ Sign out
          </button>
        </div>
      </aside>
      <section className="content">
        <header>
          <div>
            <p className="eyebrow">
              {new Date()
                .toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })
                .toUpperCase()}
            </p>
            <h1>
              {view === "today"
                ? `Good ${new Date().getHours() < 12 ? "morning" : "afternoon"}, ${data.name.split(" ")[0]}.`
                : view === "trends"
                  ? "Your wellness story."
                  : view === "goals"
                    ? "Make it yours."
                    : "A moment to look back."}
            </h1>
          </div>
          <div className="avatar">{initials(data.name)}</div>
        </header>
        {view === "today" && (
          <Today
            goals={enabled}
            entry={todayEntry}
            complete={complete}
            wellness={wellness}
            streak={data.streak}
            onUpdate={updateProgress}
            saving={saving}
          />
        )}
        {view === "trends" && <Trends data={data} />}
        {view === "goals" && <Goals goals={data.goals} onSave={saveGoals} />}
        {view === "reflection" && <WeeklyReflection entries={data.entries} goals={enabled} />}
      </section>
    </main>
  );
}
function WeeklyReflection({ entries, goals }: { entries: Entry[]; goals: Goal[] }) {
  const [reflection, setReflection] = useState<ReflectionRecord | null>(null);
  const [history, setHistory] = useState<ReflectionRecord[]>([]);
  const [selectedHistory, setSelectedHistory] = useState<ReflectionRecord | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [mood, setMood] = useState("");
  const [win, setWin] = useState("");
  const [challenge, setChallenge] = useState("");
  const [intention, setIntention] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    fetch("/api/reflection")
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load this week's reflection.");
        return response.json();
      })
      .then(({ reflection: saved, history: savedHistory }: { reflection: ReflectionRecord | null; history: ReflectionRecord[] }) => {
        setHistory(savedHistory);
        if (!saved) return;
        setReflection(saved);
        setMood(saved.mood);
        setWin(saved.win);
        setChallenge(saved.challenge);
        setIntention(saved.intention);
      })
      .catch(() => setMessage("Your reflection could not be loaded. Please refresh and try again."))
      .finally(() => setLoading(false));
  }, []);

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const weekDates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - 6 + index);
    return date.toISOString().slice(0, 10);
  });
  const weekEntries = new Map(entries.filter((entry) => weekDates.includes(entry.date)).map((entry) => [entry.date, entry]));
  const checkInDays = weekDates.filter((date) => {
    const entry = weekEntries.get(date);
    return entry && goals.some((goal) => Number(entry[goal.key]) > 0);
  }).length;
  const goalCompletions = weekDates.reduce((count, date) => {
    const entry = weekEntries.get(date);
    return count + goals.filter((goal) => entry && Number(entry[goal.key]) >= goal.target).length;
  }, 0);
  const currentWeekStart = new Date(today);
  currentWeekStart.setUTCDate(today.getUTCDate() - ((today.getUTCDay() + 6) % 7));
  const currentWeekKey = currentWeekStart.toISOString().slice(0, 10);
  const pastReflections = history.filter((item) => item.weekStart < currentWeekKey);
  const formatWeek = (weekStart: string) => {
    const start = new Date(`${weekStart}T00:00:00Z`);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);
    const formatDate = (date: Date) => date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
    return `${formatDate(start)} - ${formatDate(end)}, ${end.getUTCFullYear()}`;
  };
  const formatSavedDate = (value?: string) => value
    ? new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "";
  const historyItems = [
    ...pastReflections,
    sampleReflection,
  ];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/reflection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood, win, challenge, intention }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not save your reflection.");
      setReflection(payload.reflection);
      setHistory((current) => [payload.reflection, ...current.filter((item) => item.weekStart !== payload.reflection.weekStart)]);
      setMessage("Your weekly reflection is saved. You can come back and update it any time this week.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save your reflection.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="reflection-page">
      <section className="reflection-summary" aria-label="Your last seven days">
        <div>
          <p className="eyebrow">THE LAST SEVEN DAYS</p>
          <h2>A week is made of small moments.</h2>
        </div>
        <div className="reflection-stats">
          <div><strong>{checkInDays}<small>/7</small></strong><span>days checked in</span></div>
          <div><strong>{goalCompletions}</strong><span>goals reached</span></div>
        </div>
      </section>
      <section className="reflection-form-panel">
        <div className="reflection-form-heading">
          <div>
            <p className="eyebrow">WEEKLY CHECK-IN</p>
            <h2>{reflection ? "Your reflection this week" : "How has this week felt?"}</h2>
          </div>
          {reflection && <span className="reflection-saved">Saved for this week</span>}
        </div>
        {loading ? <p className="muted">Loading your reflection...</p> : (
          <form onSubmit={submit}>
            <fieldset className="mood-fieldset">
              <legend>Overall, my week felt...</legend>
              <div className="mood-options">
                {[
                  ["rough", "Hard"],
                  ["mixed", "Mixed"],
                  ["steady", "Steady"],
                  ["good", "Good"],
                  ["great", "Great"],
                ].map(([value, label]) => (
                  <label className={mood === value ? "selected" : ""} key={value}>
                    <input type="radio" name="mood" value={value} checked={mood === value} onChange={() => setMood(value)} required />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="reflection-prompt">
              <span>What is one thing you’re proud of?</span>
              <textarea value={win} onChange={(event) => setWin(event.target.value)} maxLength={500} placeholder="A small win counts, too." />
            </label>
            <label className="reflection-prompt">
              <span>What got in the way, or felt difficult?</span>
              <textarea value={challenge} onChange={(event) => setChallenge(event.target.value)} maxLength={500} placeholder="Notice it without judging yourself." />
            </label>
            <label className="reflection-prompt">
              <span>What would you like to carry into next week?</span>
              <textarea value={intention} onChange={(event) => setIntention(event.target.value)} maxLength={500} required placeholder="One gentle intention for the week ahead." />
            </label>
            <div className="reflection-submit-row">
              <p>Only you can see your reflection.</p>
              <button className="primary" type="submit" disabled={saving || loading || !mood || !intention.trim()}>
                {saving ? "Saving..." : reflection ? "Update reflection" : "Save reflection"}
              </button>
            </div>
          </form>
        )}
        {message && <p className="reflection-message" role="status">{message}</p>}
      </section>
      <button
        className="past-reflections-toggle"
        type="button"
        aria-expanded={showHistory}
        aria-controls="past-reflections-panel"
        onClick={() => {
          if (!showHistory && !selectedHistory) setSelectedHistory(historyItems[0]);
          setShowHistory((open) => !open);
        }}
      >
        <span>Past reflections <small>{pastReflections.length}</small></span>
        <span aria-hidden="true">{showHistory ? "−" : "+"}</span>
      </button>
      {showHistory && (
        <section className="reflection-history" id="past-reflections-panel" aria-label="Past reflections">
          <div className="reflection-history-heading">
            <div>
              <p className="eyebrow">YOUR PAST CHECK-INS</p>
              <h2>Reflection history</h2>
            </div>
            <span>{pastReflections.length} {pastReflections.length === 1 ? "week" : "weeks"}</span>
          </div>
          <div className="reflection-history-layout">
            <div className="reflection-history-list" aria-label="Past reflection weeks">
              {historyItems.map((item) => (
                <button
                  className={selectedHistory?.weekStart === item.weekStart ? "selected" : ""}
                  key={item.weekStart}
                  onClick={() => setSelectedHistory(item)}
                  aria-pressed={selectedHistory?.weekStart === item.weekStart}
                >
                  <span className="reflection-history-week">
                    <b>{item.isSample ? "Sample reflection" : formatWeek(item.weekStart)}</b>
                    {!item.isSample && (item.createdAt || item.updatedAt) && (
                      <small>Saved {formatSavedDate(item.createdAt || item.updatedAt)}</small>
                    )}
                  </span>
                  <small>{item.mood.charAt(0).toUpperCase() + item.mood.slice(1)}</small>
                </button>
              ))}
            </div>
            {selectedHistory && (
              <article className="reflection-history-detail">
                {selectedHistory.isSample ? (
                  <p className="reflection-sample-label">SAMPLE REFLECTION</p>
                ) : (
                  <p className="eyebrow">WEEK OF {formatWeek(selectedHistory.weekStart).toUpperCase()}</p>
                )}
                <h3>Felt {selectedHistory.mood}</h3>
                {!selectedHistory.isSample && (selectedHistory.createdAt || selectedHistory.updatedAt) && (
                  <p className="reflection-history-date">Saved {formatSavedDate(selectedHistory.createdAt || selectedHistory.updatedAt)}</p>
                )}
                <dl>
                  <div><dt>A moment of pride</dt><dd>{selectedHistory.win || "Not added"}</dd></div>
                  <div><dt>What felt difficult</dt><dd>{selectedHistory.challenge || "Not added"}</dd></div>
                  <div><dt>Intention</dt><dd>{selectedHistory.intention}</dd></div>
                </dl>
              </article>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
function Today({
  goals,
  entry,
  complete,
  wellness,
  streak,
  onUpdate,
  saving,
}: {
  goals: Goal[];
  entry: Entry;
  complete: number;
  wellness: number;
  streak: number;
  onUpdate: (key: GoalKey, value: number) => void;
  saving: boolean;
}) {
  return (
    <>
      <div className="daily-summary">
        <div>
          <p className="eyebrow">TODAY’S INTENTION</p>
          <h2>
            {complete === goals.length
              ? "You showed up for yourself."
              : `${complete} of ${goals.length} rituals complete`}
          </h2>
          <p className="muted">
            A little progress carries more weight than you think.
          </p>
        </div>
        <div className="score">
          <strong>
            {wellness}
            <small>%</small>
          </strong>
          <span>daily flow</span>
        </div>
      </div>
      <div className="goal-grid">
        {goals.map((goal) => (
          <GoalCard
            key={goal.key}
            goal={goal}
            value={Number(entry[goal.key])}
            onUpdate={onUpdate}
          />
        ))}
      </div>
      <div className="bottom-grid">
        <div className="streak-card">
          <div className="flame">♨</div>
          <div>
            <p className="eyebrow">CHECK-IN STREAK</p>
            <h2>
              {streak} day{streak === 1 ? "" : "s"} of showing up
            </h2>
            <p>Log any ritual today to keep it alive.</p>
          </div>
          <div className="streak-number">{streak}</div>
        </div>
        <div className="nudge">
          <span>✦</span>
          <div>
            <b>A kind reminder</b>
            <p>
              Wellness is personal. Adjust your goals whenever life asks you to.
            </p>
          </div>
        </div>
      </div>
      {saving && <div className="saving">Saving your progress…</div>}
    </>
  );
}
function GoalCard({
  goal,
  value,
  onUpdate,
}: {
  goal: Goal;
  value: number;
  onUpdate: (key: GoalKey, value: number) => void;
}) {
  const meta = goalMeta[goal.key] || { color: "green" };
  const pct = Math.min(100, Math.round((value / goal.target) * 100)) || 0;
  return (
    <article className={`goal-card ${meta.color}`}>
      <div className="goal-top">
        <span className="goal-value">
          {value}
          <small>
            {" "}
            / {goal.target} {goal.unit}
          </small>
        </span>
      </div>
      <h3>{goal.label}</h3>
      <div className="bar">
        <span style={{ width: `${pct}%` }} />
      </div>
      <div className="card-foot">
        <span>
          {pct >= 100
            ? "Goal met — lovely!"
            : `${Math.max(0, goal.target - value)} ${goal.unit} to go`}
        </span>
        <div>
          <button
            aria-label="decrease"
            onClick={() => onUpdate(goal.key, Math.max(0, value - 1))}
          >
            −
          </button>
          <button
            aria-label="increase"
            onClick={() => onUpdate(goal.key, value + 1)}
          >
            +
          </button>
        </div>
      </div>
    </article>
  );
}
function Trends({ data }: { data: Data }) {
  const enabled = data.goals.filter((g) => g.enabled);
  const [hoveredDay, setHoveredDay] = useState<{
    text: string;
    x: number;
    y: number;
    below: boolean;
  } | null>(null);
  useEffect(() => {
    const map = document.querySelector(".leetcode-map");
    if (!map) return;
    const cells = map.querySelectorAll<HTMLElement>("i");
    cells.forEach((cell) => { cell.tabIndex = 0; });
    const show = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement) || !target.matches(".leetcode-map i")) return;
      const text = target.dataset.tooltip;
      if (text) {
        const rect = target.getBoundingClientRect();
        const below = rect.top < 80;
        const x = window.innerWidth < 288
          ? window.innerWidth / 2
          : Math.min(Math.max(rect.left + rect.width / 2, 144), window.innerWidth - 144);
        setHoveredDay({ text, x, y: below ? rect.bottom + 8 : rect.top - 8, below });
      }
    };
    const clear = () => setHoveredDay(null);
    map.addEventListener("pointerover", show);
    map.addEventListener("pointerout", clear);
    map.addEventListener("focusin", show);
    map.addEventListener("focusout", clear);
    return () => {
      map.removeEventListener("pointerover", show);
      map.removeEventListener("pointerout", clear);
      map.removeEventListener("focusin", show);
      map.removeEventListener("focusout", clear);
    };
  }, []);
  const byDate = new Map(data.entries.map((entry) => [entry.date, entry]));
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 6 + i);
    const date = d.toISOString().slice(0, 10);
    return {
      label: d.toLocaleDateString("en-US", { weekday: "short" }),
      entry: byDate.get(date),
    };
  });
  const checkIns = days.filter(({ entry }) => entry && enabled.some((g) => Number(entry[g.key]) > 0)).length;
  const goalsMet = days.reduce((sum, { entry }) => sum + enabled.filter((g) => entry && Number(entry[g.key]) >= g.target).length, 0);
  const calendarStart = new Date(); calendarStart.setDate(calendarStart.getDate() - 364 - calendarStart.getDay());
  const heatmap = Array.from({ length: 371 }, (_, i) => {
    const d = new Date(calendarStart); d.setDate(calendarStart.getDate() + i);
    const date = d.toISOString().slice(0, 10); const isFuture = date > data.today; const entry = byDate.get(date);
    const met = enabled.filter((g) => entry && Number(entry[g.key]) >= g.target).length;
    const completedGoals = enabled.filter((goal) => entry && Number(entry[goal.key]) >= goal.target).map((goal) => goal.label);
    return { date, month: d.getDate() === 1 ? d.toLocaleDateString("en-US", { month: "short" }) : "", done: met, isFuture, tooltip: isFuture ? `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} · soon` : `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} · ${completedGoals.length ? completedGoals.join(", ") : "No goals completed"}`, level: entry ? (met === enabled.length ? 4 : met >= Math.ceil(enabled.length / 2) ? 3 : met ? 2 : 1) : 0 };
  });
  const scores = days.map(({ entry }) => enabled.length ? Math.round(enabled.filter((g) => entry && Number(entry[g.key]) >= g.target).length / enabled.length * 100) : 0);
  const points = scores.map((score, index) => `${22 + index * 90},${112 - score}`).join(" ");
  const monthLabels = Array.from({ length: 53 }, (_, week) => heatmap.slice(week * 7, week * 7 + 7).find((cell) => cell.month)?.month || "");
  const activeDays = new Set(data.entries.filter((entry) => enabled.some((goal) => Number(entry[goal.key]) > 0)).map((entry) => entry.date));
  let bestStreak = 0, running = 0;
  for (const cell of heatmap.filter((cell) => !cell.isFuture)) { if (activeDays.has(cell.date)) { running++; bestStreak = Math.max(bestStreak, running); } else running = 0; }
  const goalStats = enabled.map((goal, index) => ({ goal, completed: days.filter(({ entry }) => entry && Number(entry[goal.key]) >= goal.target).length, color: ["#82bfd5", "#ebb879", "#b9acd5", "#95c48c", "#e59a82", "#7faaa2"][index % 6] }));
  const totalGoalHits = goalStats.reduce((total, item) => total + item.completed, 0);
  let pieCursor = 0;
  const pieGradient = goalStats.map((item) => { const start = pieCursor; pieCursor += totalGoalHits ? item.completed / totalGoalHits * 100 : 0; return `${item.color} ${start}% ${pieCursor}%`; }).join(", ") || "#e9eee7 0 100%";
  return (
    <>
      <div className="insight-hero">
        <div><p className="eyebrow">YOUR LAST 7 DAYS</p><h2>Build a rhythm you can return to.</h2><p>Every check-in counts. Your streak grows when you log any wellness ritual.</p></div>
        <div className="insight-streak"><span>♨</span><strong>{data.streak}</strong><small>day streak</small></div>
      </div>
      <div className="insight-cards"><div><span>✓</span><b>{checkIns} / 7</b><small>days checked in</small></div><div><span>◎</span><b>{goalsMet}</b><small>goals reached</small></div><div><span>↗</span><b>{enabled.length ? Math.round(goalsMet / (enabled.length * 7) * 100) : 0}%</b><small>weekly goal rate</small></div><div><span>♨</span><b>{bestStreak}</b><small>best streak</small></div></div>
      <div className="chart-card better-chart"><div className="chart-title"><div><p className="eyebrow">WEEKLY FLOW</p><h3>Your completion curve</h3></div><span>Goal completion</span></div>
        <div className="line-chart"><div className="y-labels"><span>100%</span><span>50%</span><span>0%</span></div><svg viewBox="0 0 600 130" role="img" aria-label="Weekly productivity dotted line graph"><defs><linearGradient id="fill" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#8bb58a" stopOpacity=".4" /><stop offset="1" stopColor="#8bb58a" stopOpacity="0" /></linearGradient></defs><path d={`M 22,120 L ${points} L 562,120 Z`} fill="url(#fill)" /><polyline points={points} fill="none" stroke="#3d684e" strokeWidth="3" strokeDasharray="2 8" strokeLinecap="round" />{scores.map((score, index) => <g key={days[index].label}><circle cx={22 + index * 90} cy={112 - score} r="5" fill="#fff" stroke="#3d684e" strokeWidth="3"><title>{`${days[index].label}: ${score}% productivity`}</title></circle></g>)}</svg></div><div className="line-labels">{days.map((day, index) => <span key={day.label}><b>{day.label}</b><small>{scores[index]}%</small></span>)}</div>
      </div>
      <div className="analytics-pair"><div className="pie-card"><p className="eyebrow">GOAL MIX</p><h3>What you completed</h3><div className="pie-layout"><div className="pie" style={{ background: `conic-gradient(${pieGradient})` }}><span><b>{goalsMet}</b><small>hits</small></span></div><div className="pie-legend">{goalStats.map((item) => <span key={item.goal.key}><i style={{ background: item.color }} />{item.goal.label}<b>{item.completed}/7</b></span>)}</div></div></div><div className="heatmap-card leetcode-card compact-calendar"><div><p className="eyebrow">YEAR IN CONSISTENCY</p><h3>12-month streak map</h3><p className="muted">Hover a day for its completed goals.</p></div><div className="calendar-wrap"><div className="month-row">{monthLabels.map((month, index) => <span key={index}>{month}</span>)}</div><div className="leetcode-map" aria-label="12-month wellness activity calendar">{heatmap.map((cell) => <i key={cell.date} className={`heat-${cell.level}${cell.isFuture ? " future-day" : ""}`} data-tooltip={cell.tooltip} aria-label={cell.tooltip} />)}</div></div><div className="heat-legend"><span>Less</span><i className="heat-0" /><i className="heat-1" /><i className="heat-2" /><i className="heat-3" /><i className="heat-4" /><span>More</span></div></div></div>
      {hoveredDay && (
        <div
          className={`calendar-tooltip${hoveredDay.below ? " below" : ""}`}
          role="tooltip"
          style={{ left: hoveredDay.x, top: hoveredDay.y }}
        >
          {hoveredDay.text}
        </div>
      )}
      <div className="trend-legend">
        {enabled.map((g) => (
            <span key={g.key}>
            {g.label}:{" "}
              {days.filter(({ entry }) => entry && Number(entry[g.key]) >= g.target).length}
              /7 days
            </span>
          ))}
      </div>
    </>
  );
}
function Goals({
  goals,
  onSave,
}: {
  goals: Goal[];
  onSave: (g: Goal[]) => void;
}) {
  const [newGoal, setNewGoal] = useState({ label: "", unit: "minutes", target: "10" });
  function change(key: GoalKey, patch: Partial<Goal>) {
    onSave(goals.map((g) => (g.key === key ? { ...g, ...patch } : g)));
  }
  function addGoal() {
    if (goals.length >= 6) return;
    const label = newGoal.label.trim();
    const key = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    if (!key || goals.some((goal) => goal.key === key)) return;
    onSave([...goals, { key, label, unit: newGoal.unit.trim() || "units", target: Math.max(0, Number(newGoal.target) || 0), enabled: true }]);
    setNewGoal({ label: "", unit: "minutes", target: "10" });
  }
  function removeGoal(key: GoalKey) { onSave(goals.filter((goal) => goal.key !== key)); }
  return (
    <div className="settings-card">
      <p className="eyebrow">YOUR DAILY BASELINE</p>
      <h2>Goals that fit your life.</h2>
      <p className="muted">
        Choose what feels supportive. You can revisit these anytime.
      </p>
      <p className="goal-limit-note">
        You can add up to 6 goals per day ({goals.length}/6 added).
      </p>
      {goals.map((g) => (
        <div className="setting" key={g.key}>
          <div>
            <b>{g.label}</b>
            <small>{g.unit} per day</small>
          </div>
          <input
            aria-label={`${g.label} target`}
            type="number"
            min="0"
            value={g.target}
            onChange={(e) => change(g.key, { target: Number(e.target.value) })}
          />
          <label className="toggle">
            <input
              type="checkbox"
              checked={g.enabled}
              onChange={(e) => change(g.key, { enabled: e.target.checked })}
            />
            <span />
          </label>
          <button className="remove-goal" onClick={() => removeGoal(g.key)} aria-label={`Remove ${g.label}`}>×</button>
        </div>
      ))}
      <div className="add-goal"><div><b>Add a ritual</b><small>Create a goal that fits your routine.</small></div><input aria-label="New goal name" value={newGoal.label} onChange={(e) => setNewGoal({ ...newGoal, label: e.target.value })} placeholder="e.g. Reading" /><input aria-label="New goal unit" value={newGoal.unit} onChange={(e) => setNewGoal({ ...newGoal, unit: e.target.value })} placeholder="unit" /><input aria-label="New goal target" type="number" min="0" value={newGoal.target} onChange={(e) => setNewGoal({ ...newGoal, target: e.target.value })} /><button onClick={addGoal} disabled={goals.length >= 6}>+ Add goal</button></div>
      <p className="saved">Changes save automatically</p>
    </div>
  );
}
