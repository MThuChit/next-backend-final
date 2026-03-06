import corsHeaders from "@/lib/cors";
import { getClientPromise } from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function GET(req) {
  // Simple seeding endpoint for development/testing only
  try {
    const { searchParams } = new URL(req.url);
    const pass = searchParams.get("pass");
    const ADMIN_SETUP_PASS = process.env.ADMIN_SETUP_PASS || "adminsetuppass";

    if (process.env.NODE_ENV !== "development" && pass !== ADMIN_SETUP_PASS) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403, headers: corsHeaders });
    }

    const client = await getClientPromise();
    const db = client.db("library_db");

    const sampleBooks = [
      { title: "Clean Code", author: "Robert C. Martin", quantity: 3, location: "A1", status: "AVAILABLE", createdAt: new Date() },
      { title: "The Pragmatic Programmer", author: "Andrew Hunt", quantity: 2, location: "A2", status: "AVAILABLE", createdAt: new Date() },
      { title: "Introduction to Algorithms", author: "Cormen et al.", quantity: 1, location: "B1", status: "AVAILABLE", createdAt: new Date() },
    ];

    const result = await db.collection("books").insertMany(sampleBooks);

    return NextResponse.json({ insertedCount: result.insertedCount, ids: result.insertedIds }, { status: 201, headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ message: error.toString() }, { status: 500, headers: corsHeaders });
  }
}
