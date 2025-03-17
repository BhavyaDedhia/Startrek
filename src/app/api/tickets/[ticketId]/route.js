import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Ticket from "@/models/Ticket";

// Delete a ticket
export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const { ticketId } = params;
    
    // Verify that the ID is valid
    if (!ticketId || ticketId.length !== 24) {
      return NextResponse.json({ message: "Invalid ticket ID" }, { status: 400 });
    }
    
    // Find and delete the ticket
    const deletedTicket = await Ticket.findByIdAndDelete(ticketId);
    
    if (!deletedTicket) {
      return NextResponse.json({ message: "Ticket not found" }, { status: 404 });
    }
    
    return NextResponse.json({ message: "Ticket deleted successfully" });
  } catch (error) {
    console.error("Error deleting ticket:", error);
    return NextResponse.json({ message: "Error deleting ticket", error }, { status: 500 });
  }
}
