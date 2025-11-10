"use client";

import { useEffect, useMemo, useState } from "react";
import type { TaskInput, EventInput, SettingsInput, PlanBlock } from "@lib/planner";
import { generateICS } from "@lib/ics";

function isoDateLocal(d = new Date()) {
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

function fmtTime(s: string) {
  const d = new Date(s);
  return d.toTimeString().slice(0,5);
}

export default function Page() {
  const [date, setDate] = useState(isoDateLocal());
  const [settings, setSettings] = useState<SettingsInput>({
    date: isoDateLocal(),
    dayStart: "08:00",
    dayEnd: "22:00",
    focusBlockMinutes: 52,
    shortBreakMinutes: 10,
    bufferMinutes: 5,
  });

  const [tasks, setTasks] = useState<TaskInput[]>([]);
  const [events, setEvents] = useState<EventInput[]>([]);
  const [plan, setPlan] = useState<PlanBlock[]>([]);
  const [busy, setBusy] = useState(false);

  // local storage persistence
  useEffect(() => {
    const raw = localStorage.getItem("agent-dnia-state");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.settings) setSettings(parsed.settings);
        if (parsed.tasks) setTasks(parsed.tasks);
        if (parsed.events) setEvents(parsed.events);
        if (parsed.date) setDate(parsed.date);
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("agent-dnia-state", JSON.stringify({ date, settings: { ...settings, date }, tasks, events }));
  }, [date, settings, tasks, events]);

  const totalTaskMinutes = useMemo(() => tasks.reduce((a,t)=>a + t.durationMinutes, 0), [tasks]);

  async function generatePlan() {
    setBusy(true);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasks,
          events,
          settings: { ...settings, date }
        })
      });
      const data = await res.json();
      if (res.ok) setPlan(data.plan as PlanBlock[]);
      else alert(data.error || "B??d planowania");
    } finally {
      setBusy(false);
    }
  }

  function addTask() {
    setTasks(t => [
      ...t,
      {
        id: crypto.randomUUID(),
        title: "Nowe zadanie",
        durationMinutes: 30,
        priority: "?redni",
        energy: "?rednia",
      }
    ]);
  }

  function addEvent() {
    const start = `${date}T10:00:00`;
    const end = `${date}T11:00:00`;
    setEvents(e => [
      ...e,
      { id: crypto.randomUUID(), title: "Wydarzenie", start, end }
    ]);
  }

  function downloadICS() {
    if (!plan.length) return;
    const ics = generateICS(plan, `Plan ${date}`);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `plan-${date}.ics`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="grid" style={{ marginTop: 16 }}>
      <section className="card col">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="col" style={{ maxWidth: 360 }}>
            <label className="section-title">Data</label>
            <input className="input" type="date" value={date} onChange={e=>setDate(e.target.value)} />
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-ghost" onClick={addEvent}>+ Dodaj wydarzenie</button>
            <button className="btn" onClick={addTask}>+ Dodaj zadanie</button>
            <button className="btn btn-primary" onClick={generatePlan} disabled={busy}>{busy ? "Planowanie?" : "Wygeneruj plan"}</button>
          </div>
        </div>

        <div className="row" style={{ gap: 16, marginTop: 10 }}>
          <div className="card" style={{ flex: 1 }}>
            <div className="section-title">Ustawienia dnia</div>
            <div className="row" style={{ gap: 10 }}>
              <div className="col" style={{ flex: 1 }}>
                <label>Start dnia</label>
                <input className="input" type="time" value={settings.dayStart} onChange={e=>setSettings(s=>({ ...s, dayStart: e.target.value }))} />
              </div>
              <div className="col" style={{ flex: 1 }}>
                <label>Koniec dnia</label>
                <input className="input" type="time" value={settings.dayEnd} onChange={e=>setSettings(s=>({ ...s, dayEnd: e.target.value }))} />
              </div>
            </div>
            <div className="row" style={{ gap: 10, marginTop: 8 }}>
              <div className="col" style={{ flex: 1 }}>
                <label>Blok fokus (min)</label>
                <input className="input" type="number" min={15} max={120} value={settings.focusBlockMinutes}
                  onChange={e=>setSettings(s=>({ ...s, focusBlockMinutes: Number(e.target.value) }))} />
              </div>
              <div className="col" style={{ flex: 1 }}>
                <label>Kr?tka przerwa (min)</label>
                <input className="input" type="number" min={5} max={30} value={settings.shortBreakMinutes}
                  onChange={e=>setSettings(s=>({ ...s, shortBreakMinutes: Number(e.target.value) }))} />
              </div>
              <div className="col" style={{ flex: 1 }}>
                <label>Bufor mi?dzy blokami (min)</label>
                <input className="input" type="number" min={0} max={30} value={settings.bufferMinutes}
                  onChange={e=>setSettings(s=>({ ...s, bufferMinutes: Number(e.target.value) }))} />
              </div>
            </div>
            <hr className="sep" />
            <div className="badge">Suma czasu zada?: {Math.round(totalTaskMinutes)} min</div>
          </div>
        </div>

        <div className="row" style={{ gap: 16, marginTop: 16 }}>
          <div className="card" style={{ flex: 1 }}>
            <div className="section-title">Zadania</div>
            <table className="table">
              <thead>
                <tr>
                  <th>Nazwa</th>
                  <th>Czas (min)</th>
                  <th>Priorytet</th>
                  <th>Energia</th>
                  <th>Termin</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(t => (
                  <tr key={t.id}>
                    <td>
                      <input className="input" value={t.title} onChange={e=>setTasks(arr=>arr.map(x=>x.id===t.id?{...x, title:e.target.value}:x))} />
                    </td>
                    <td style={{ width: 110 }}>
                      <input className="input" type="number" min={5} step={5} value={t.durationMinutes}
                        onChange={e=>setTasks(arr=>arr.map(x=>x.id===t.id?{...x, durationMinutes:Number(e.target.value)}:x))} />
                    </td>
                    <td style={{ width: 140 }}>
                      <select className="select" value={t.priority}
                        onChange={e=>setTasks(arr=>arr.map(x=>x.id===t.id?{...x, priority:e.target.value as any}:x))}>
                        <option value="wysoki">wysoki</option>
                        <option value="?redni">?redni</option>
                        <option value="niski">niski</option>
                      </select>
                    </td>
                    <td style={{ width: 140 }}>
                      <select className="select" value={t.energy}
                        onChange={e=>setTasks(arr=>arr.map(x=>x.id===t.id?{...x, energy:e.target.value as any}:x))}>
                        <option value="wysoka">wysoka</option>
                        <option value="?rednia">?rednia</option>
                        <option value="niska">niska</option>
                      </select>
                    </td>
                    <td style={{ width: 180 }}>
                      <input className="input" type="date" value={t.deadline?.slice(0,10) || ""}
                        onChange={e=>setTasks(arr=>arr.map(x=>x.id===t.id?{...x, deadline:e.target.value||undefined}:x))} />
                    </td>
                    <td style={{ width: 60 }}>
                      <button className="btn btn-ghost" onClick={()=>setTasks(arr=>arr.filter(x=>x.id!==t.id))}>Usu?</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card" style={{ flex: 1 }}>
            <div className="section-title">Wydarzenia (sta?e)</div>
            <table className="table">
              <thead>
                <tr>
                  <th>Nazwa</th>
                  <th>Start</th>
                  <th>Koniec</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {events.map(ev => (
                  <tr key={ev.id}>
                    <td>
                      <input className="input" value={ev.title} onChange={e=>setEvents(arr=>arr.map(x=>x.id===ev.id?{...x, title:e.target.value}:x))} />
                    </td>
                    <td style={{ width: 180 }}>
                      <input className="input" type="datetime-local" value={ev.start.slice(0,16)}
                        onChange={e=>setEvents(arr=>arr.map(x=>x.id===ev.id?{...x, start:e.target.value+":00"}:x))} />
                    </td>
                    <td style={{ width: 180 }}>
                      <input className="input" type="datetime-local" value={ev.end.slice(0,16)}
                        onChange={e=>setEvents(arr=>arr.map(x=>x.id===ev.id?{...x, end:e.target.value+":00"}:x))} />
                    </td>
                    <td style={{ width: 60 }}>
                      <button className="btn btn-ghost" onClick={()=>setEvents(arr=>arr.filter(x=>x.id!==ev.id))}>Usu?</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="card col" style={{ position: "relative" }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
          <div>
            <div className="section-title">Plan dnia</div>
            <div className="badge">Wskaz?wka: klawisz <span className="kbd">G</span> generuje plan</div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn" onClick={downloadICS} disabled={!plan.length}>Eksportuj do ICS</button>
          </div>
        </div>

        {!plan.length ? (
          <div style={{ color: "#9aa7c7", marginTop: 12 }}>Brak planu. Dodaj zadania i kliknij ?Wygeneruj plan?.</div>
        ) : (
          <div className="plan" style={{ marginTop: 8 }}>
            <div>
              {[...new Set(plan.map(b => b.start.slice(11,13)))].map(h => (
                <div key={h} className="badge" style={{ height: 40 }}>{h}:00</div>
              ))}
            </div>
            <div>
              {plan.map(b => (
                <div key={b.id} className="block">
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <strong>{b.title}</strong>
                    <span className="badge">{fmtTime(b.start)}?{fmtTime(b.end)}</span>
                    <span className="badge">{b.type}</span>
                  </div>
                  {b.meta ? (
                    <div className="meta">
                      {Object.entries(b.meta).map(([k,v]) => (
                        <span key={k} style={{ marginRight: 8 }}>{k}: {String(v)}</span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <script dangerouslySetInnerHTML={{ __html: `
        document.addEventListener('keydown', (e) => {
          if (e.key.toLowerCase() === 'g') {
            document.querySelector('button.btn.btn-primary')?.click();
          }
        });
      `}} />
    </main>
  );
}
