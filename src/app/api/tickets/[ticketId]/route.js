import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Ticket from "@/models/Ticket";

// ✅ Update Ticket Status (PUT)
export async function PUT(req, { params }) {
  try {
    await connectDB();
    const { status } = await req.json();
    const updatedTicket = await Ticket.findByIdAndUpdate(params.ticketId, { status }, { new: true });

    if (!updatedTicket) return NextResponse.json({ message: "Ticket not found" }, { status: 404 });

    return NextResponse.json(updatedTicket);
  } catch (error) {
    return NextResponse.json({ message: "Error updating ticket", error }, { status: 500 });
  }
}
