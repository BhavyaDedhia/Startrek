import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Ticket from "@/models/Ticket";

export async function GET() {
    try {
        await connectDB();
        
        // Create a test ticket
        const testTicket = new Ticket({
            name: "Test User",
            category: "Account",
            query: "This is a test ticket",
            status: "Pending"
        });
        
        await testTicket.save();
        
        // Fetch all tickets
        const tickets = await Ticket.find({});
        
        return NextResponse.json({ 
            message: "MongoDB Connected Successfully!",
            tickets: tickets
        });
    } catch (error) {
        console.error("MongoDB Connection Error:", error);
        return NextResponse.json({ 
            message: "Database Connection Failed", 
            error: error.message 
        }, { status: 500 });
    }
}
