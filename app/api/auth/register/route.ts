import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createToken } from "@/lib/auth";
import { defaultGoals } from "@/lib/types";

export async function POST(request: NextRequest) {
  const { name, email, password } = await request.json();
  if (!name?.trim() || !/^\S+@\S+\.\S+$/.test(email || "") || !password || password.length < 6)
    return NextResponse.json({ error: "Please provide a name, valid email, and password of at least 6 characters." }, { status: 400 });
  const database = await db();
  if (await database.collection("users").findOne({ email: email.toLowerCase() })) return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
  const user = { name: name.trim(), email: email.toLowerCase(), password: await bcrypt.hash(password, 12), goals: defaultGoals, createdAt: new Date() };
  const result = await database.collection("users").insertOne(user);
  const response = NextResponse.json({ user: { name: user.name, email: user.email } }, { status: 201 });
  response.cookies.set("wellnest_token", await createToken({ userId: result.insertedId.toString(), email: user.email, name: user.name }), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 604800, path: "/" });
  return response;
}
