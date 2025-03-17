import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Ticket from "@/models/Ticket";

// ✅ Fetch All Tickets (GET)
export async function GET() {
  try {
    await connectDB();
    const tickets = await Ticket.find({}).sort({ createdAt: -1 }); // Sort by latest
    return NextResponse.json(tickets);
  } catch (error) {
    return NextResponse.json({ message: "Error fetching tickets", error }, { status: 500 });
  }
}

// ✅ Create a New Ticket (POST)
export async function POST(req) {
  try {
    await connectDB();
    const { userName, category, query } = await req.json();

    if (!userName || !category || !query) {
      return NextResponse.json({ message: "All fields are required" }, { status: 400 });
    }

    const newTicket = new Ticket({
      userName,
      category,
      query,
      status: "Pending",
    });

    await newTicket.save();
    return NextResponse.json({ message: "Ticket created successfully", ticket: newTicket });
  } catch (error) {
    return NextResponse.json({ message: "Error creating ticket", error }, { status: 500 });
  }
}
