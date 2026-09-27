import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createToken } from "@/lib/auth";
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    const user = await (await db()).collection("users").findOne({ email: email?.toLowerCase() });
    if (!user || !(await bcrypt.compare(password || "", user.password))) return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
    const response = NextResponse.json({ user: { name: user.name, email: user.email } });
    response.cookies.set("wellnest_token", await createToken({ userId: user._id.toString(), email: user.email, name: user.name }), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 604800, path: "/" });
    return response;
  } catch { return NextResponse.json({ error: "Database unavailable. Check your MongoDB Atlas connection and try again." }, { status: 503 }); }
}
