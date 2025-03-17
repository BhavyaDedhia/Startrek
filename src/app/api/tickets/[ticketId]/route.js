import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Ticket from "@/models/Ticket";

// ✅ Delete Ticket (DELETE)
export async function DELETE(req, { params }) {
  try {
    await connectDB();
    await Ticket.findByIdAndDelete(params.ticketId);
    return NextResponse.json({ message: "Ticket deleted successfully" });
  } catch (error) {
    return NextResponse.json({ message: "Error deleting ticket", error }, { status: 500 });
  }
}
