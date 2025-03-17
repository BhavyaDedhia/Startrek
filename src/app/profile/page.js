"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Profile() {
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      router.push("/login"); // Redirect to login if not authenticated
    }
  }, []);

  if (!user) return <p className="text-center mt-10">Loading...</p>;

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-700 mb-6">NeoAssist Bank</h1>
        <ul className="space-y-4">
          <li className="text-gray-700 font-medium cursor-pointer hover:text-blue-500">
            Dashboard
          </li>
          <li className="text-gray-700 font-medium cursor-pointer hover:text-blue-500">
            Accounts
          </li>
          <li className="text-gray-700 font-medium cursor-pointer hover:text-blue-500">
            Passbook
          </li>
          <li className="text-gray-700 font-medium cursor-pointer hover:text-blue-500">
            Support Tickets
          </li>
          <li className="text-gray-700 font-medium cursor-pointer hover:text-blue-500">
            Help & FAQ
          </li>
          <li className="text-gray-700 font-medium cursor-pointer hover:text-red-500 mt-6">
            Logout
          </li>
        </ul>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-semibold">Welcome back, {user.email}</h1>
          <button className="bg-black text-white px-4 py-2 rounded-md">
            View Accounts
          </button>
        </div>

        {/* Account Overview */}
        <div className="grid grid-cols-3 gap-6">
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

        {/* Transactions Section */}
        <div className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">Recent Transactions</h2>
          <div className="bg-white p-6 shadow-md rounded-lg">
            <div className="flex justify-between border-b pb-2 mb-2">
              <span>🛒 Flipkart Purchase</span>
              <span className="text-red-500">- ₹1,250.00</span>
            </div>
            <div className="flex justify-between border-b pb-2 mb-2">
              <span>💰 Salary Credit</span>
              <span className="text-green-500">+ ₹85,000.00</span>
            </div>
            <div className="flex justify-between">
              <span>🔌 Electricity Bill</span>
              <span className="text-red-500">- ₹2,800.00</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
