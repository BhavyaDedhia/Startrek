import mongoose from "mongoose";

const TicketSchema = new mongoose.Schema({
  userName: { type: String, required: true }, // User who created the ticket
  category: { type: String, required: true, enum: ["Loan", "Account", "Fraud", "Security", "Other"] }, // Category of query
  query: { type: String, required: true }, // Query text
  status: { type: String, enum: ["Pending", "Resolved"], default: "Pending" }, // Query status
  createdAt: { type: Date, default: Date.now }, // Query creation time
});

const Ticket = mongoose.models.Ticket || mongoose.model("Ticket", TicketSchema);
export default Ticket;
