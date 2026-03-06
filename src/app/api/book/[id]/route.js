import { getClientPromise } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import corsHeaders from "@/lib/cors";

const JWT_SECRET = process.env.JWT_SECRET || "mydefaulyjwtsecret";

// Helper to verify user and role from cookies
async function getAuthUser(req) {
  const token = req.cookies.get("token")?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}

// 1. GET: Get a single book by ID
export async function GET(req, { params }) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401, headers: corsHeaders });
  }

  try {
    const { id } = await params;
    const client = await getClientPromise();
    const db = client.db("library_db");

    const book = await db.collection("books").findOne({ _id: new ObjectId(id) });

    if (!book) {
      return NextResponse.json({ message: "Book not found" }, { status: 404, headers: corsHeaders });
    }

    // Requirement: Normal users must not see deleted books 
    if (book.status === "DELETED" && user.role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403, headers: corsHeaders });
    }

    return NextResponse.json(book, { status: 200, headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ message: "Invalid ID format" }, { status: 400, headers: corsHeaders });
  }
}

// 2. PATCH: Update existing book (ADMIN ONLY) [cite: 73]
export async function PATCH(req, { params }) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401, headers: corsHeaders });
  }
  if (user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403, headers: corsHeaders });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const client = await getClientPromise();
    const db = client.db("library_db");

    // Remove _id from body to prevent update errors
    const { _id, ...updateData } = body;

    const result = await db.collection("books").updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ message: "Book not found" }, { status: 404, headers: corsHeaders });
    }

    return NextResponse.json({ message: "Update successful" }, { status: 200, headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ message: "Update failed" }, { status: 400, headers: corsHeaders });
  }
}

// 3. DELETE: Soft delete book (ADMIN ONLY) [cite: 74, 75]
export async function DELETE(req, { params }) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401, headers: corsHeaders });
  }
  if (user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403, headers: corsHeaders });
  }

  try {
    const { id } = await params;
    const client = await getClientPromise();
    const db = client.db("library_db");

    // Requirement: Book deletion must be implemented as a soft delete 
    const result = await db.collection("books").updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: "DELETED", updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ message: "Book not found" }, { status: 404, headers: corsHeaders });
    }

    return NextResponse.json({ message: "Book soft-deleted successfully" }, { status: 200, headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ message: "Delete failed" }, { status: 400, headers: corsHeaders });
  }
}