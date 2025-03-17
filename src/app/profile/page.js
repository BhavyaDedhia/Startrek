"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("admin"); // ✅ Default view is "admin"
  const [tickets, setTickets] = useState([]);
  const [query, setQuery] = useState(""); // ✅ For new queries
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      router.push("/login");
    }
  }, []);

  // ✅ Fetch tickets when "Ticket Tracking" is selected
  useEffect(() => {
    if (view === "tickets") {
      fetch("/api/tickets")
        .then((res) => res.json())
        .then((data) => setTickets(data))
        .catch((err) => console.error("Error fetching tickets:", err));
    }
  }, [view]);

  // ✅ Submit a new query (Generate a Ticket)
  const handleSubmitQuery = async () => {
    if (!query.trim()) return;
    const res = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, userName: user.name }),
    });
    if (res.ok) {
      const newTicket = await res.json();
      setTickets([...tickets, newTicket.ticket]);
      setQuery("");
    }
  };

  // ✅ Function to mark ticket as "Resolved"
  const handleResolveTicket = async (ticketId) => {
    const res = await fetch(`/api/tickets/${ticketId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Resolved" }),
    });

    if (res.ok) {
      setTickets(tickets.map(ticket => 
        ticket._id === ticketId ? { ...ticket, status: "Resolved" } : ticket
      ));
    }
  };

  if (!user) return <p className="text-center mt-10 text-lg font-semibold">Loading...</p>;

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-700 mb-6">NeoAssist</h1>
        <ul className="space-y-4">
          <li onClick={() => setView("admin")} className={`text-gray-700 font-medium cursor-pointer hover:text-blue-500 ${view === "admin" ? "text-blue-500 font-bold" : ""}`}>
            Admin
          </li>
          <li onClick={() => setView("passbook")} className={`text-gray-700 font-medium cursor-pointer hover:text-blue-500 ${view === "passbook" ? "text-blue-500 font-bold" : ""}`}>
            Passbook
          </li>
          <li onClick={() => setView("query")} className={`text-gray-700 font-medium cursor-pointer hover:text-blue-500 ${view === "query" ? "text-blue-500 font-bold" : ""}`}>
            Query
          </li>
          <li onClick={() => setView("tickets")} className={`text-gray-700 font-medium cursor-pointer hover:text-blue-500 ${view === "tickets" ? "text-blue-500 font-bold" : ""}`}>
            Ticket Tracking
          </li>
          <li onClick={() => setView("fraud")} className={`text-gray-700 font-medium cursor-pointer hover:text-blue-500 ${view === "fraud" ? "text-blue-500 font-bold" : ""}`}>
            Fraud Detection
          </li>
          <li className="text-gray-700 font-medium cursor-pointer hover:text-blue-500">Help & FAQ</li>
          <li 
            onClick={() => {
              localStorage.removeItem("user");
              router.push("/login");
            }} 
            className="text-red-500 font-medium cursor-pointer hover:text-red-700 mt-6"
          >
            Log Out
          </li>
        </ul>
      </div>

      {/* Main Content - Switch Views Based on Clicked Sidebar Button */}
      <div className="flex-1 p-8">
        {view === "admin" && (
          <>
            <h1 className="text-3xl font-semibold">Welcome back, {user.name || "User"}!</h1>
            <p className="text-gray-600">Your banking dashboard.</p>
            {/* Account Overview */}
            <div className="grid grid-cols-3 gap-6 mt-6">
              <div className="bg-white p-6 shadow-md rounded-lg">
                <p className="text-gray-600">Total Balance</p>
                <h2 className="text-2xl font-bold">₹3,750,000</h2>
                <p className="text-green-500">+15% from last month</p>
              </div>
              <div className="bg-white p-6 shadow-md rounded-lg">
                <p className="text-gray-600">Active Accounts</p>
                <h2 className="text-2xl font-bold">3</h2>
                <p className="text-gray-500">Savings, Current, Fixed Deposit</p>
              </div>
              <div className="bg-white p-6 shadow-md rounded-lg">
                <p className="text-gray-600">Pending Support Requests</p>
                <h2 className="text-2xl font-bold">1</h2>
                <p className="text-yellow-500">Awaiting bank response</p>
              </div>
            </div>
          </>
        )}

        {view === "tickets" && (
          <>
            <h1 className="text-3xl font-semibold mb-4">Ticket Tracking</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {tickets.length === 0 ? (
                <p className="text-gray-500">No tickets found.</p>
              ) : (
                tickets.map((ticket) => (
                  <div key={ticket._id} className="bg-white p-4 rounded-lg shadow-md">
                    <h2 className="text-lg font-semibold">{ticket.category} - {ticket.query}</h2>
                    <p className="text-gray-600 text-sm">Asked by: {ticket.userName}</p>
                    <p className={`mt-2 text-sm font-semibold ${ticket.status === "Resolved" ? "text-green-500" : "text-yellow-500"}`}>
                      Status: {ticket.status}
                    </p>
                    <p className="text-gray-400 text-xs">Created At: {new Date(ticket.createdAt).toLocaleString()}</p>
                    {ticket.status !== "Resolved" && (
                      <button onClick={() => handleResolveTicket(ticket._id)} className="mt-3 bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600">
                        Mark as Resolved
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {view === "fraud" && (
          <>
            <h1 className="text-3xl font-semibold">Fraud Detection</h1>
            <p className="text-gray-600">Monitor and detect suspicious activities.</p>
          </>
        )}
      </div>
    </div>
  );
}
