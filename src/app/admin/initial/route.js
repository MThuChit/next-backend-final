import { getClientPromise } from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const pass = searchParams.get("pass");

  // Simple security check for initial setup
  if (pass !== "adminsetuppass") {
    return NextResponse.json({ message: "Invalid setup password" }, { status: 403 });
  }

  try {
    const client = await getClientPromise();
    const db = client.db("library_db");

    // Clear existing and insert required test users
    await db.collection("users").deleteMany({});
    await db.collection("users").insertMany([
      { email: "admin@test.com", password: "admin123", role: "ADMIN", name: "Admin User" },
      { email: "user@test.com", password: "user123", role: "USER", name: "Normal User" }
    ]);

    return NextResponse.json({ message: "Test users initialized successfully" });
  } catch (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}