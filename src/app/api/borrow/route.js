import { getClientPromise } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import corsHeaders from "@/lib/cors";

const JWT_SECRET = process.env.JWT_SECRET || "mydefaulyjwtsecret";

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

// 1. GET: List borrowing requests (Requirement 6 & 10)
export async function GET(req) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401, headers: corsHeaders });
  }

  try {
    const client = await getClientPromise();
    const db = client.db("library_db");

    let query = {};
    // ADMIN can see all requests, USER can only see their own
    if (user.role !== "ADMIN") {
      query.email = user.email; 
    }

    const requests = await db.collection("borrow_requests").find(query).sort({ createdAt: -1 }).toArray();
    return NextResponse.json(requests, { status: 200, headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500, headers: corsHeaders });
  }
}

// 2. POST: Create a new borrowing request (Requirement 5 & 9)
export async function POST(req) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { bookId, targetDate } = body;

    if (!bookId || !targetDate) {
      return NextResponse.json({ message: "Book ID and Target Date are required" }, { status: 400, headers: corsHeaders });
    }

    const client = await getClientPromise();
    const db = client.db("library_db");

    // Verify book exists and is not deleted
    const book = await db.collection("books").findOne({ _id: new ObjectId(bookId), status: { $ne: "DELETED" } });
    if (!book) {
      return NextResponse.json({ message: "Book not found or unavailable" }, { status: 404, headers: corsHeaders });
    }

    const newRequest = {
      userId: user.id || user.email, // Required field [cite: 94]
      email: user.email,
      bookId: new ObjectId(bookId),
      bookTitle: book.title,
      createdAt: new Date(), // Required field [cite: 95]
      targetDate: new Date(targetDate), // Required field 
      status: "INIT", // Required initial status 
    };

    const result = await db.collection("borrow_requests").insertOne(newRequest);
    return NextResponse.json({ ...newRequest, _id: result.insertedId }, { status: 201, headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500, headers: corsHeaders });
  }
}

// 3. PATCH: Update request status (Requirement 10)
// This handles status transitions like ACCEPTED, CANCEL-ADMIN, etc.
export async function PATCH(req) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { requestId, status } = body;

    const client = await getClientPromise();
    const db = client.db("library_db");

    // Authorization logic for status transitions [cite: 105]
    if (user.role !== "ADMIN" && (status === "ACCEPTED" || status === "CANCEL-ADMIN")) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403, headers: corsHeaders });
    }

    const result = await db.collection("borrow_requests").updateOne(
      { _id: new ObjectId(requestId) },
      { $set: { status: status, updatedAt: new Date() } }
    );

    return NextResponse.json({ message: "Status updated" }, { status: 200, headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ message: "Update failed" }, { status: 400, headers: corsHeaders });
  }
}