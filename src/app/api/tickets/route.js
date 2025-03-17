import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Ticket from "@/models/Ticket";

// ✅ Fetch All Tickets or Filter by Name (GET)
export async function GET(req) {
  try {
    await connectDB();
    console.log("Connected to MongoDB");
    
    // Get the URL and query params
    const { searchParams } = new URL(req.url);
    const name = searchParams.get("name");
    console.log("Fetching tickets for name:", name);
    
    // If name is provided, filter tickets by name
    let query = {};
    if (name) {
      query.name = name;
    }
    
    const tickets = await Ticket.find(query).sort({ createdAt: -1 }); // Sort by latest
    console.log("Found tickets:", tickets);
    
    return NextResponse.json(tickets);
  } catch (error) {
    console.error("Error in GET /api/tickets:", error);
    return NextResponse.json({ 
      message: "Error fetching tickets", 
      error: error.message 
    }, { status: 500 });
  }
}

// ✅ Create a New Ticket (POST)
export async function POST(req) {
  try {
    await connectDB();
    console.log("Connected to MongoDB");
    
    const body = await req.json();
    console.log("Received ticket data:", body);
    
    const { name, category, query } = body;

    if (!name || !category || !query) {
      return NextResponse.json({ 
        message: "All fields are required",
        received: { name, category, query }
      }, { status: 400 });
    }

    const newTicket = new Ticket({
      name,
      category,
      query,
      status: "Pending",
    });

    await newTicket.save();
    console.log("Created new ticket:", newTicket);
    
    return NextResponse.json({ 
      message: "Ticket created successfully", 
      ticket: newTicket 
    });
  } catch (error) {
    console.error("Error in POST /api/tickets:", error);
    return NextResponse.json({ 
      message: "Error creating ticket", 
      error: error.message 
    }, { status: 500 });
  }
}
