import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

const currentWeekStart = () => {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
};

const getUser = async (request: NextRequest) => getSession(request);

export async function GET(request: NextRequest) {
  const session = await getUser(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const weekStart = currentWeekStart();
  const reflections = await (await db()).collection("reflections")
    .find({ userId: session.userId })
    .sort({ weekStart: -1 })
    .toArray();
  const reflection = reflections.find((item) => item.weekStart === weekStart) || null;
  return NextResponse.json({ weekStart, reflection, history: reflections });
}

export async function POST(request: NextRequest) {
  const session = await getUser(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const moods = ["rough", "mixed", "steady", "good", "great"];
  if (
    !moods.includes(body.mood) ||
    typeof body.win !== "string" || body.win.trim().length > 500 ||
    typeof body.challenge !== "string" || body.challenge.trim().length > 500 ||
    typeof body.intention !== "string" || !body.intention.trim() || body.intention.trim().length > 500
  ) {
    return NextResponse.json({ error: "Please provide a mood and an intention under 500 characters." }, { status: 400 });
  }

  const weekStart = currentWeekStart();
  const reflection = {
    userId: session.userId,
    weekStart,
    mood: body.mood,
    win: body.win.trim(),
    challenge: body.challenge.trim(),
    intention: body.intention.trim(),
    updatedAt: new Date(),
  };
  await (await db()).collection("reflections").updateOne(
    { userId: session.userId, weekStart },
    { $set: reflection, $setOnInsert: { _id: new ObjectId(), createdAt: reflection.updatedAt } },
    { upsert: true },
  );
  return NextResponse.json({ reflection });
}