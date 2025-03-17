"use client";
import { useState } from "react";
import { useRouter } from "next/navigation"; // ✅ Import router for redirection

export default function Login() {
  const [activeTab, setActiveTab] = useState("traditional");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter(); // ✅ Initialize router for navigation

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (res.ok) {
      localStorage.setItem("user", JSON.stringify(data)); // ✅ Store user details in local storage
      router.push(`/profile`); // ✅ Redirect to Profile page
    } else {
      setError(data.message);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-blue-500 to-indigo-600">
      <div className="w-full max-w-md bg-white p-8 shadow-xl rounded-lg">
        {/* Logo */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Union Bank</h1>
          <p className="text-gray-500">Secure Banking Login</p>
        </div>

        {/* Toggle Buttons */}
        <div className="flex mb-6 border-b">
          <button
            className={`w-1/2 py-2 text-lg font-medium ${
              activeTab === "face"
                ? "border-b-4 border-blue-500 text-blue-500"
                : "text-gray-500"
            }`}
            onClick={() => setActiveTab("face")}
          >
            Face Recognition
          </button>
          <button
            className={`w-1/2 py-2 text-lg font-medium ${
              activeTab === "traditional"
                ? "border-b-4 border-blue-500 text-blue-500"
                : "text-gray-500"
            }`}
            onClick={() => setActiveTab("traditional")}
          >
            Traditional Login
          </button>
        </div>

        {/* Traditional Login */}
        {activeTab === "traditional" && (
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              Account Login
            </h2>

            {error && <p className="text-red-500 text-sm mb-2">{error}</p>}

            <div className="mb-4">
              <label className="block text-gray-700 font-medium">Email</label>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 border rounded-md shadow-sm focus:ring focus:ring-blue-300"
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 font-medium">Password</label>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 border rounded-md shadow-sm focus:ring focus:ring-blue-300"
              />
            </div>

            <button
              onClick={handleLogin}
              className="w-full bg-blue-500 text-white py-3 rounded-md hover:bg-blue-600 transition"
            >
              Login
            </button>

            <p className="text-center text-gray-500 text-sm mt-4">
              Forgot your password? <a href="#" className="text-blue-500">Reset it</a>
            </p>
          </div>
        )}

        {/* Face Recognition Login */}
        {activeTab === "face" && (
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              Face Recognition Login
            </h2>

            <p className="text-gray-500 text-sm mb-4">
              Log in securely using your face as your password.
            </p>

            <div className="flex flex-col items-center justify-center w-full h-48 bg-gray-200 rounded-lg shadow-md">
              <span className="text-gray-500 text-6xl">📷</span>
            </div>

            <button className="w-full bg-blue-500 text-white py-3 rounded-md mt-4 hover:bg-blue-600 transition">
              Start Camera
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
