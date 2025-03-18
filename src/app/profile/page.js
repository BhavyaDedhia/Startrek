"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("dashboard");
  const [tickets, setTickets] = useState([]);
  const [query, setQuery] = useState("");
  const [queryCategory, setQueryCategory] = useState("Account");
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [usedAudioInput, setUsedAudioInput] = useState(false);
  const [systemStatus, setSystemStatus] = useState(null);
  const [transcriptionError, setTranscriptionError] = useState(null);
  const [loadingMessage, setLoadingMessage] = useState("");
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const router = useRouter();
  
  // Reference to speech recognition
  const recognitionRef = useRef(null);
  const [isBrowserTranscriptionSupported, setIsBrowserTranscriptionSupported] = useState(false);

  // Check if browser supports speech recognition
  useEffect(() => {
    // Check for browser speech recognition support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsBrowserTranscriptionSupported(!!SpeechRecognition);
  }, []);

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
    const fetchTickets = async () => {
      if (user) {
        try {
          const res = await fetch(`/api/tickets?name=${encodeURIComponent(user.name)}`);
          if (!res.ok) {
            throw new Error('Failed to fetch tickets');
          }
          const data = await res.json();
          console.log('Fetched tickets:', data); // Debug log
          setTickets(data);
        } catch (err) {
          console.error("Error fetching tickets:", err);
        }
      }
    };

    fetchTickets();
  }, [user]); // Remove view dependency to fetch tickets whenever user changes

  // Start audio recording using Web Speech API or fallback
  const startRecording = async () => {
    setTranscriptionError(null);
    setAudioBlob(null);
    
    try {
      // Try to use Web Speech API first if supported
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (SpeechRecognition && isBrowserTranscriptionSupported) {
        // Browser transcription
        recognitionRef.current = new SpeechRecognition();
        const recognition = recognitionRef.current;
        
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        
        let finalTranscript = '';
        
        recognition.onresult = (event) => {
          let interimTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            } else {
              interimTranscript += transcript;
            }
          }
          
          // Update the query with the current transcription
          setQuery(finalTranscript || interimTranscript);
        };
        
        recognition.onerror = (event) => {
          console.error('Speech recognition error', event.error);
          setTranscriptionError(`Error: ${event.error}. Please try again.`);
          setIsRecording(false);
        };
        
        recognition.start();
        setIsRecording(true);
        setUsedAudioInput(true);
        
        return;
      }
      
      // Fallback to MediaRecorder if Web Speech API is not supported
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setAudioBlob(audioBlob);
        
        // Free up the microphone
        stream.getTracks().forEach(track => track.stop());
        
        // Process the audio for demo transcription
        await processAudio(audioBlob);
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
      
    } catch (error) {
      console.error("Error starting recording:", error);
      setTranscriptionError(`Could not access microphone: ${error.message}`);
    }
  };

  // Stop recording
  const stopRecording = async () => {
    setIsRecording(false);
    
    // If using Web Speech API
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      return;
    }
    
    // If using MediaRecorder fallback
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
  };
  
  // Process audio with demo mode (for browsers without Web Speech API)
  const processAudio = async (blob) => {
    setIsLoading(true);
    setUsedAudioInput(true);
    setLoadingMessage("Processing audio... Please wait");
    setTranscriptionError(null);
    
    try {
      const formData = new FormData();
      formData.append("audio", blob);
      formData.append("fallbackOnly", "true");
      
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });
      
      const result = await response.json();
      
      if (response.ok) {
        if (result.transcription) {
          setQuery(result.transcription);
          
          if (result.note) {
            setTranscriptionError(`Note: ${result.note}`);
          }
        } else if (result.error) {
          setTranscriptionError(result.error);
          setQuery("");
        }
      } else {
        setTranscriptionError(result.error || "Failed to transcribe audio");
        setQuery("");
      }
    } catch (error) {
      console.error("Error processing audio:", error);
      setTranscriptionError("Error processing audio: " + error.message);
      setQuery("");
    } finally {
      setIsLoading(false);
    }
  };

  // Function to show transcription messages with proper styling
  const renderTranscriptionMessage = () => {
    if (transcriptionError) {
      return (
        <div className="mt-2 p-2 bg-red-100 border border-red-400 rounded-md">
          <p className="text-red-800 text-sm">{transcriptionError}</p>
        </div>
      );
    }
    
    if (query && usedAudioInput) {
      return (
        <div className="mt-2 p-2 bg-green-100 border border-green-400 rounded-md">
          <p className="text-green-800 text-sm font-medium">Transcription:</p>
          <p className="text-gray-800">{query}</p>
          <div className="mt-2 text-xs text-gray-500">
            <p>Speak clearly and pause for a moment before stopping.</p>
            <p>Review the transcription before submitting your query.</p>
            <p className="mt-1 text-green-600">
              {isBrowserTranscriptionSupported 
                ? "Using browser's built-in speech recognition." 
                : "Using demo transcription mode."}
            </p>
          </div>
        </div>
      );
    }
    
    return null;
  };

  // ✅ Submit a new query (Generate a Ticket)
  const handleSubmitQuery = async () => {
    // Only allow submission if we have actual query text
    if (!query.trim()) {
      alert("Please enter your query text or record a valid audio message");
      return;
    }
    
    setIsLoading(true);
    setLoadingMessage(usedAudioInput ? "Processing transcribed query..." : "Processing query...");
    
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: user.name,
          category: queryCategory, 
          query: query.trim(),
          audioUsed: usedAudioInput
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        console.log('New ticket created:', data); // Debug log
        setQuery("");
        setAudioBlob(null);
        setUsedAudioInput(false);
        setView("tickets");
        // Fetch updated tickets
        const ticketsRes = await fetch(`/api/tickets?name=${encodeURIComponent(user.name)}`);
        const ticketsData = await ticketsRes.json();
        console.log('Updated tickets:', ticketsData); // Debug log
        setTickets(ticketsData);
      } else {
        throw new Error('Failed to create ticket');
      }
    } catch (error) {
      console.error("Error submitting query:", error);
      alert("Failed to submit your query. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Test audio transcription system
  const testTranscriptionSystem = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/test-transcribe');
      const data = await res.json();
      console.log("Transcription system status:", data);
      setSystemStatus(data);
      
      if (data.status === "Ready") {
        alert("Transcription system is ready to use!");
      } else {
        alert(`Transcription system is not ready: ${JSON.stringify(data.diagnostics)}`);
      }
    } catch (error) {
      console.error("Error testing transcription system:", error);
      alert("Error testing transcription system. Check console for details.");
    } finally {
      setIsLoading(false);
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

  // Handle logout function
  const handleLogout = () => {
    localStorage.removeItem("user");
    router.push("/login");
  };

  if (!user) return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100">
      <div className="w-full max-w-md p-8 space-y-4 bg-white rounded-lg shadow-lg">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
            </svg>
          </div>
        </div>
        <p className="text-center text-lg font-medium text-gray-600">Loading your profile...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-700">NeoAssist</h1>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-gray-600">Welcome,</p>
              <p className="font-semibold text-gray-800">{user.name}</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <div className="w-full md:w-64 bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-8 text-white">
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4">
                <span className="text-3xl font-bold text-blue-700">{user.name.charAt(0).toUpperCase()}</span>
              </div>
              <h2 className="text-xl font-bold">{user.name}</h2>
              <p className="text-blue-100 text-sm">{user.email}</p>
            </div>
          </div>
          
          <nav className="p-4">
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => setView("dashboard")}
                  className={`w-full flex items-center p-3 rounded-md ${
                    view === "dashboard" 
                      ? "bg-blue-100 text-blue-700" 
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  Dashboard
                </button>
              </li>
              <li>
                <button
                  onClick={() => setView("passbook")}
                  className={`w-full flex items-center p-3 rounded-md ${
                    view === "passbook" 
                      ? "bg-blue-100 text-blue-700" 
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Passbook
                </button>
              </li>
              <li>
                <button
                  onClick={() => setView("query")}
                  className={`w-full flex items-center p-3 rounded-md ${
                    view === "query" 
                      ? "bg-blue-100 text-blue-700" 
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  Submit Query
                </button>
              </li>
              <li>
                <button
                  onClick={() => setView("tickets")}
                  className={`w-full flex items-center p-3 rounded-md ${
                    view === "tickets" 
                      ? "bg-blue-100 text-blue-700" 
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  My Tickets
                </button>
              </li>
              <li>
                <button
                  onClick={() => setView("fraud")}
                  className={`w-full flex items-center p-3 rounded-md ${
                    view === "fraud" 
                      ? "bg-blue-100 text-blue-700" 
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Fraud Detection
                </button>
              </li>
            </ul>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-6">
            {/* Dashboard View */}
            {view === "dashboard" && (
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
                    <h3 className="text-lg font-medium mb-2">Total Balance</h3>
                    <p className="text-3xl font-bold">₹3,750,000</p>
                    <div className="mt-4 flex items-center text-blue-100">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                      </svg>
                      <span>15% from last month</span>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
                    <h3 className="text-lg font-medium mb-2">Active Accounts</h3>
                    <p className="text-3xl font-bold">3</p>
                    <p className="mt-4 text-purple-100">Savings, Current, Fixed Deposit</p>
                  </div>
                  
                  <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-lg p-6 text-white">
                    <h3 className="text-lg font-medium mb-2">Support Requests</h3>
                    <p className="text-3xl font-bold">{tickets.length}</p>
                    <p className="mt-4 text-amber-100">
                      {tickets.filter(t => t.status === "pending").length} pending
                    </p>
                  </div>
                </div>
                
                <div className="mt-8">
                  <h3 className="text-xl font-bold text-gray-800 mb-4">Recent Activity</h3>
                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="space-y-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mr-4">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium">Salary Deposit</p>
                          <p className="text-sm text-gray-500">Today, 9:45 AM</p>
                        </div>
                        <div className="ml-auto">
                          <p className="font-medium text-green-600">+₹75,000</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mr-4">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium">Electricity Bill</p>
                          <p className="text-sm text-gray-500">Yesterday</p>
                        </div>
                        <div className="ml-auto">
                          <p className="font-medium text-red-600">-₹2,450</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-4">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium">Fund Transfer</p>
                          <p className="text-sm text-gray-500">May 21, 2023</p>
                        </div>
                        <div className="ml-auto">
                          <p className="font-medium text-red-600">-₹15,000</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
        
            {/* Passbook View */}
            {view === "passbook" && (
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Passbook</h2>
                <p className="text-gray-600 mb-6">View your transaction history and account details.</p>
                
                {/* Placeholder content */}
                <div className="bg-gray-50 rounded-lg p-6 text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-600">Passbook feature coming soon.</p>
                </div>
              </div>
            )}
            
            {/* Query Form View */}
            {view === "query" && (
              <>
                <h1 className="text-3xl font-semibold mb-6">Submit a Query</h1>
                <div className="bg-white p-6 shadow-md rounded-lg">
                  <div className="mb-4">
                    <label className="block text-gray-700 font-medium mb-2">Query Category</label>
                    <select
                      value={queryCategory}
                      onChange={(e) => setQueryCategory(e.target.value)}
                      className="w-full p-3 border rounded-md shadow-sm focus:ring focus:ring-blue-300"
                    >
                      <option value="Account">Account</option>
                      <option value="Loan">Loan</option>
                      <option value="Fraud">Fraud</option>
                      <option value="Security">Security</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="flex items-center mb-4">
                    <div className="flex-1 h-px bg-gray-300"></div>
                    <div className="px-4 text-gray-500 font-medium">Choose Input Method</div>
                    <div className="flex-1 h-px bg-gray-300"></div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Text Input Option */}
                    <div className={`border p-4 rounded-lg ${!usedAudioInput ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium text-gray-800">Text Input</h3>
                        <button 
                          onClick={() => {
                            setUsedAudioInput(false);
                            setAudioBlob(null);
                          }}
                          className={`px-3 py-1 rounded-md text-sm ${!usedAudioInput ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                        >
                          Select
                        </button>
                      </div>
                      <textarea
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Type your query here..."
                        className="w-full p-3 border rounded-md shadow-sm focus:ring focus:ring-blue-300 min-h-[120px]"
                        disabled={usedAudioInput && audioBlob}
                      ></textarea>
                    </div>

                    {/* Audio Input Option */}
                    <div className={`border p-4 rounded-lg ${usedAudioInput ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium text-gray-800">Voice Input</h3>
                        <button 
                          onClick={() => setUsedAudioInput(true)}
                          className={`px-3 py-1 rounded-md text-sm ${usedAudioInput ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                        >
                          Select
                        </button>
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-4">
                          {!isRecording ? (
                            <button
                              onClick={startRecording}
                              className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 flex items-center w-full justify-center"
                              disabled={isLoading}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                              </svg>
                              Start Recording
                            </button>
                          ) : (
                            <button
                              onClick={stopRecording}
                              className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 flex items-center w-full justify-center"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                              </svg>
                              Stop Recording
                            </button>
                          )}
                        </div>
                        {audioBlob && (
                          <div className="mt-2">
                            <p className="text-sm text-gray-600 mb-1">Review your recording:</p>
                            <audio src={URL.createObjectURL(audioBlob)} controls className="w-full" />
                          </div>
                        )}
                        {/* Display transcription result or error */}
                        {renderTranscriptionMessage()}
                        
                        {/* Test transcription system button */}
                        <div className="mt-4">
                          <button
                            onClick={testTranscriptionSystem}
                            className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center w-full justify-center"
                            disabled={isLoading}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Test Transcription System
                          </button>
                        </div>
                        
                        {/* Show system status if available */}
                        {systemStatus && (
                          <div className="mt-2 p-2 bg-gray-100 rounded-md">
                            <p className="font-semibold">System status: 
                              <span className={systemStatus.status === "Ready" ? " text-green-500" : " text-red-500"}>
                                {" " + systemStatus.status}
                              </span>
                            </p>
                            {systemStatus.status !== "Ready" && systemStatus.diagnostics && (
                              <div className="mt-1">
                                <p className="text-sm font-semibold text-gray-700">Diagnostics:</p>
                                <pre className="mt-1 p-2 bg-gray-200 rounded text-xs overflow-auto max-h-40 text-gray-800">
                                  {JSON.stringify(systemStatus.diagnostics, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {isLoading && (
                    <div className="my-4 p-3 bg-blue-50 text-blue-600 rounded-md">
                      <p className="flex items-center">
                        <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {loadingMessage || "Processing... Please wait"}
                      </p>
                    </div>
                  )}

                  <button
                    onClick={handleSubmitQuery}
                    disabled={(!query.trim() && !usedAudioInput) || isLoading}
                    className={`w-full py-3 rounded-md ${
                      (!query.trim() && !usedAudioInput) || isLoading
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-blue-500 hover:bg-blue-600"
                    } text-white font-medium transition`}
                  >
                    {isLoading ? "Submitting..." : "Submit Query"}
                  </button>
                </div>
              </>
            )}

            {view === "tickets" && (
              <>
                <h1 className="text-3xl font-semibold mb-4">Your Ticket Tracking</h1>
                
                {/* Ticket List */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {tickets.length === 0 ? (
                    <div className="col-span-full text-center py-8">
                      <p className="text-gray-500 text-lg">No tickets found.</p>
                      <p className="text-gray-400 text-sm mt-2">Submit a query to create a new ticket.</p>
                    </div>
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
      </div>
    </div>
  );
}
