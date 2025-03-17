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

  // ✅ Fetch only the logged-in user's tickets
  useEffect(() => {
    if (view === "tickets" && user) {
      fetch(`/api/tickets?name=${encodeURIComponent(user.name)}`)
        .then((res) => res.json())
        .then((data) => setTickets(data))
        .catch((err) => console.error("Error fetching tickets:", err));
    }
  }, [view, user]);

  // ✅ Submit a new query (Generate a Ticket)
  const handleSubmitQuery = async () => {
    if (!query.trim()) return;
    const res = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, name: user.name }), // ✅ Using "name" instead of "userName"
    });
    if (res.ok) {
      const newTicket = await res.json();
      setTickets([...tickets, newTicket.ticket]);
      setQuery("");
    }
  };

  // ✅ Mark ticket as "Resolved" and delete it from UI & Database
  const handleResolveTicket = async (ticketId) => {
    const res = await fetch(`/api/tickets/${ticketId}`, {
      method: "DELETE",
    });

    if (res.ok) {
      // Remove the ticket from the state after deletion
      setTickets(tickets.filter(ticket => ticket._id !== ticketId));
    }
  };

  if (!user) return <p className="text-center mt-10 text-lg font-semibold">Loading...</p>;

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-700 mb-6">NeoAssist</h1>
        <ul className="space-y-4">
          <li onClick={() => setView("admin")} 
            className={`cursor-pointer font-medium p-2 rounded-md ${
              view === "admin" ? "bg-blue-500 text-white" : "text-gray-700 hover:text-blue-500"
            }`}
          >
            Admin
          </li>
          <li onClick={() => setView("passbook")} 
            className={`cursor-pointer font-medium p-2 rounded-md ${
              view === "passbook" ? "bg-blue-500 text-white" : "text-gray-700 hover:text-blue-500"
            }`}
          >
            Passbook
          </li>
          <li onClick={() => setView("query")} 
            className={`cursor-pointer font-medium p-2 rounded-md ${
              view === "query" ? "bg-blue-500 text-white" : "text-gray-700 hover:text-blue-500"
            }`}
          >
            Query
          </li>
          <li onClick={() => setView("tickets")} 
            className={`cursor-pointer font-medium p-2 rounded-md ${
              view === "tickets" ? "bg-blue-500 text-white" : "text-gray-700 hover:text-blue-500"
            }`}
          >
            Ticket Tracking
          </li>
          <li onClick={() => setView("fraud")} 
            className={`cursor-pointer font-medium p-2 rounded-md ${
              view === "fraud" ? "bg-blue-500 text-white" : "text-gray-700 hover:text-blue-500"
            }`}
          >
            Fraud Detection
          </li>
          <li className="cursor-pointer font-medium p-2 text-gray-700 hover:text-blue-500">Help & FAQ</li>
          <li 
            onClick={() => {
              localStorage.removeItem("user");
              router.push("/login");
            }} 
            className="text-red-500 font-medium cursor-pointer hover:text-red-700 mt-6 p-2 rounded-md"
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
            <h1 className="text-3xl font-semibold mb-4">Your Ticket Tracking</h1>
            
            {/* Ticket List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {tickets.length === 0 ? (
                <p className="text-gray-500">No tickets found.</p>
              ) : (
                tickets.map((ticket) => (
                  <div key={ticket._id} className="bg-white p-6 rounded-lg shadow-md flex flex-col justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-800">{ticket.category}</h2>
                      <p className="text-gray-600 text-sm mt-2">{ticket.query}</p>
                      <p className={`mt-2 text-sm font-semibold ${ticket.status === "Resolved" ? "text-green-500" : "text-yellow-500"}`}>
                        Status: {ticket.status}
                      </p>
                      <p className="text-gray-400 text-xs mt-2">Created At: {new Date(ticket.createdAt).toLocaleString()}</p>
                    </div>
                    {ticket.status !== "Resolved" && (
                      <button 
                        onClick={() => handleResolveTicket(ticket._id)}
                        className="mt-4 bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 w-full"
                      >
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
