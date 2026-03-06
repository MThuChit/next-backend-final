import { getClientPromise } from "@/lib/mongodb";
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

// 1. GET: List all books with Filtering and Soft Delete logic
export async function GET(req) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401, headers: corsHeaders });
  }

  try {
    const { searchParams } = new URL(req.url);
    const title = searchParams.get("title");
    const author = searchParams.get("author");

    const client = await getClientPromise();
    const db = client.db("library_db");

    // Define Query
    let query = {};

    // Requirement: Only ADMIN can see soft-deleted books [cite: 76, 77]
    if (user.role !== "ADMIN") {
      query.status = { $ne: "DELETED" }; 
    }

    // Requirement: Filtering by Title and Author [cite: 88, 89, 90, 146]
    if (title) query.title = { $regex: title, $options: "i" };
    if (author) query.author = { $regex: author, $options: "i" };

    const books = await db.collection("books").find(query).toArray();
    
    return NextResponse.json(books, { status: 200, headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500, headers: corsHeaders });
  }
}

// 2. POST: Create a new book (ADMIN ONLY)
export async function POST(req) {
  const user = await getAuthUser(req);

  // Requirement: Authentication check [cite: 47, 123]
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401, headers: corsHeaders });
  }

  // Requirement: Only ADMIN allowed to create [cite: 71, 72, 144]
  if (user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { title, author, quantity, location } = body;

    // Validation
    if (!title || !author) {
      return NextResponse.json({ message: "Title and Author are required" }, { status: 400, headers: corsHeaders });
    }

    const client = await getClientPromise();
    const db = client.db("library_db");

    const newBook = {
      title,
      author,
      quantity: Number(quantity) || 0,
      location,
      status: "AVAILABLE", // Initial status [cite: 69]
      createdAt: new Date(),
    };

    const result = await db.collection("books").insertOne(newBook);
    
    return NextResponse.json({ ...newBook, _id: result.insertedId }, { status: 201, headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500, headers: corsHeaders });
  }
}