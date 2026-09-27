import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { defaultGoals, Goal, GoalKey } from "@/lib/types";
const fields: GoalKey[] = ["water", "exercise", "sleep", "meditation"];
const day = (offset = 0) => { const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10); };
async function user(request: NextRequest) { return getSession(request); }
export async function GET(request: NextRequest) {
  const session = await user(request); if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const database = await db(); const userDoc = await database.collection("users").findOne({ _id: new ObjectId(session.userId) });
  const entries = await database.collection("entries").find({ userId: session.userId, date: { $gte: day(-364), $lte: day() } }).sort({ date: 1 }).toArray();
  const goals = ((userDoc?.goals || defaultGoals) as Goal[]).map(goal => ({
    ...goal,
    label: goal.label || goal.key.charAt(0).toUpperCase() + goal.key.slice(1),
    unit: goal.unit || (fields.includes(goal.key) ? defaultGoals.find(item => item.key === goal.key)?.unit || "units" : "units")
  }));
  let streak = 0;
  const trackedGoals = goals.filter(goal => goal.enabled);
  const todayHasCheckIn = entries.some(item => item.date === day() && trackedGoals.some(goal => Number(item[goal.key]) > 0));
  for (let i = todayHasCheckIn ? 0 : 1; i < 365; i++) {
    const entry = entries.find(item => item.date === day(-i));
    const checkedIn = entry && trackedGoals.some(goal => Number(entry[goal.key]) > 0);
    if (!checkedIn) break;
    streak++;
  }
  return NextResponse.json({ name: session.name, goals, entries, streak, today: day() });
}
export async function PATCH(request: NextRequest) {
  const session = await user(request); if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const goals = (await request.json()).goals as Goal[];
  if (!Array.isArray(goals)) return NextResponse.json({ error: "Invalid goals" }, { status: 400 });
  if (goals.length > 6) return NextResponse.json({ error: "You can save up to 6 goals per day." }, { status: 400 });
  if (goals.some(g => !/^[a-z0-9-]{2,40}$/.test(g.key) || !g.label?.trim() || !g.unit?.trim() || !Number.isFinite(Number(g.target)) || Number(g.target) < 0)) return NextResponse.json({ error: "Invalid goals" }, { status: 400 });
  await (await db()).collection("users").updateOne({ _id: new ObjectId(session.userId) }, { $set: { goals } }); return NextResponse.json({ ok: true });
}
export async function PUT(request: NextRequest) {
  const session = await user(request); if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json(); const date = typeof body.date === "string" ? body.date : day();
  const update: Record<string, number> = {};
  for (const [key, value] of Object.entries(body)) if (/^[a-z0-9-]{2,40}$/.test(key) && Number.isFinite(Number(value)) && Number(value) >= 0) update[key] = Number(value);
  await (await db()).collection("entries").updateOne({ userId: session.userId, date }, { $set: { ...update, userId: session.userId, date, updatedAt: new Date() } }, { upsert: true });
  return NextResponse.json({ ok: true });
}
