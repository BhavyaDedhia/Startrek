"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Login() {
  const [activeTab, setActiveTab] = useState("traditional");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [faceCapture, setFaceCapture] = useState(null);
  const [cameraFailed, setCameraFailed] = useState(false);
  const [streamReady, setStreamReady] = useState(null);
  
  const router = useRouter();
  const videoContainerRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const videoRef = useRef(null);

  // Handle traditional login
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("user", JSON.stringify(data));
        router.push(`/profile`);
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError("An error occurred. Please try again.");
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Check for camera compatibility
  const checkCameraCompatibility = () => {
    // Check if getUserMedia is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error("Camera API not supported in this browser");
      setError("Camera not supported in this browser. Please use traditional login or try a different browser.");
      setCameraFailed(true);
      return false;
    }
    return true;
  };
  
  // Two-step camera initialization to avoid the ref/rendering issue
  const startCamera = async () => {
    setError("");
    setCameraFailed(false);
    
    // Check browser compatibility first
    if (!checkCameraCompatibility()) {
      return;
    }
    
    try {
      console.log("Requesting camera access...");
      
      // Request camera access with simple constraints
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      console.log("Camera access granted");
      
      // Store the stream reference
      streamRef.current = stream;
      
      // First activate the camera UI which will render the video element
      setIsCameraActive(true);
      
      // Store stream to apply after video element is available
      setStreamReady(stream);
            
    } catch (err) {
      console.error("Camera access error:", err.name, err.message);
      setCameraFailed(true);
      
      if (err.name === "NotAllowedError") {
        setError("Camera access denied. Please allow camera access in your browser settings and try again.");
      } else if (err.name === "NotFoundError") {
        setError("No camera found. Please connect a camera and try again.");
      } else if (err.name === "NotReadableError") {
        setError("Camera is in use by another application. Please close other apps using the camera.");
      } else {
        setError(`Could not access camera: ${err.message}`);
      }
    }
  };
  
  // Effect to attach stream to video element once both are available
  useEffect(() => {
    // If we have a stream waiting and the video element is now rendered
    if (streamReady && videoRef.current) {
      console.log("Applying stream to video element");
      videoRef.current.srcObject = streamReady;
      setStreamReady(null); // Clear the waiting stream
    }
  }, [streamReady, isCameraActive]);
  
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Clear waiting stream if any
    setStreamReady(null);
    
    // Clear video source safely
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject = null;
      videoRef.current.load(); // Reset the video element
    }
    
    setIsCameraActive(false);
  };
  
  const handleCanPlay = () => {
    console.log("Video can play - camera ready");
  };
  
  const handleVideoError = (e) => {
    console.error("Video error:", e);
    setCameraFailed(true);
    stopCamera();
  };
  
  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) {
      console.error("Video or canvas element not available for capture");
      return;
    }
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const imageData = canvas.toDataURL('image/jpeg');
    setFaceCapture(imageData);
    
    // After capturing, we can stop the camera
    stopCamera();
    
    // Process face login
    handleFaceLogin(imageData);
  };
  
  const handleFaceLogin = async (faceData) => {
    setError("");
    setIsLoading(true);
    
    try {
      const res = await fetch("/api/auth/face-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ faceData }),
      });
      
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("user", JSON.stringify(data));
        router.push(`/profile`);
      } else {
        setError(data.message || "Face recognition failed");
        // Reset face capture to try again
        setFaceCapture(null);
      }
    } catch (error) {
      setError("An error occurred. Please try again.");
      console.error("Face login error:", error);
      setFaceCapture(null);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Effect to handle tab changes
  useEffect(() => {
    if (activeTab === "face" && !isCameraActive && !faceCapture && !cameraFailed) {
      // Add a delay to ensure the DOM has rendered
      const timer = setTimeout(() => {
        startCamera();
      }, 300); // Longer delay for more reliability
      
      return () => clearTimeout(timer);
    }
    
    // Clean up when tab changes
    if (activeTab !== "face") {
      stopCamera();
    }
    
  }, [activeTab, isCameraActive, faceCapture, cameraFailed]);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col md:flex-row overflow-hidden">
      {/* Left panel with background and branding */}
      <div className="hidden md:flex md:w-2/5 bg-gradient-to-br from-purple-900 via-indigo-800 to-blue-900 text-white p-12 flex-col justify-between">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-2">NeoAssist</h1>
          <p className="text-blue-200 text-lg font-light">Banking. Reimagined.</p>
          
          <div className="mt-16">
            <h2 className="text-2xl font-bold mb-6">Smart Banking for the Digital Age</h2>
            <p className="text-blue-100 opacity-80 mb-4">Experience secure, intelligent, and personalized banking at your fingertips.</p>
            <div className="flex space-x-3 mt-8">
              <span className="h-1 w-12 bg-blue-400 rounded-full"></span>
              <span className="h-1 w-12 bg-blue-200 opacity-50 rounded-full"></span>
              <span className="h-1 w-12 bg-blue-200 opacity-50 rounded-full"></span>
            </div>
          </div>
        </div>
        
        <div className="mt-auto">
          <div className="flex space-x-6 mb-8">
            <div className="bg-white/10 backdrop-blur-lg p-4 rounded-xl">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div className="bg-white/10 backdrop-blur-lg p-4 rounded-xl">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className="bg-white/10 backdrop-blur-lg p-4 rounded-xl">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
              </svg>
            </div>
          </div>
          <p className="text-blue-200 text-sm opacity-70">© 2024 NeoAssist. All rights reserved.</p>
        </div>
      </div>
      
      {/* Right panel with login form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-10 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile logo - only shows on small screens */}
          <div className="md:hidden text-center mb-10">
            <h1 className="text-3xl font-bold text-gray-900">NeoAssist</h1>
            <p className="text-gray-600">Banking. Reimagined.</p>
          </div>
          
          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-10">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Welcome Back</h2>
            
            {/* Login Method Tabs */}
            <div className="flex bg-gray-100 p-1 rounded-lg mb-8">
              <button
                className={`flex-1 py-3 rounded-md font-medium text-sm transition-all duration-200 ${
                  activeTab === "traditional"
                    ? "bg-white text-blue-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-800"
                }`}
                onClick={() => setActiveTab("traditional")}
              >
                <div className="flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Password
                </div>
              </button>
              <button
                className={`flex-1 py-3 rounded-md font-medium text-sm transition-all duration-200 ${
                  activeTab === "face"
                    ? "bg-white text-blue-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-800"
                }`}
                onClick={() => {
                  setActiveTab("face");
                  setIsCameraActive(false);
                  setFaceCapture(null);
                  setCameraFailed(false);
                  setStreamReady(null);
                }}
              >
                <div className="flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                  Face ID
                </div>
              </button>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-md">
                <div className="flex">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}

            {/* Traditional Login */}
            {activeTab === "traditional" && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">Email Address</label>
                  <input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700" htmlFor="password">Password</label>
                    <a href="#" className="text-sm text-blue-600 hover:text-blue-800 font-medium">Forgot?</a>
                  </div>
                  <input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>

                <button
                  onClick={handleLogin}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition shadow-md flex items-center justify-center"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Signing in...
                    </>
                  ) : (
                    <>Sign In</>
                  )}
                </button>

                <div className="flex items-center justify-center mt-6">
                  <p className="text-sm text-gray-600">
                    Don't have an account? <Link href="/signup" className="text-blue-600 hover:text-blue-800 font-medium">Create account</Link>
                  </p>
                </div>
              </div>
            )}

            {/* Face Recognition Login */}
            {activeTab === "face" && (
              <div className="space-y-6">
                <p className="text-gray-600 text-sm text-center mb-6">
                  Quick and secure login using your face
                </p>

                {!faceCapture ? (
                  <div className="space-y-6">
                    <div className="relative overflow-hidden rounded-xl bg-gradient-to-b from-gray-100 to-gray-200 shadow-inner border border-gray-300">
                      <div className="aspect-w-4 aspect-h-3">
                        {!isCameraActive ? (
                          <div className="flex flex-col items-center justify-center h-full p-6">
                            <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mb-3">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </div>
                            <p className="text-gray-600 text-sm font-medium">Camera inactive</p>
                            <p className="text-gray-500 text-xs mt-1">Click the button below to start</p>
                          </div>
                        ) : (
                          <>
                            <video 
                              key="camera-video"
                              ref={videoRef}
                              autoPlay 
                              playsInline
                              muted
                              onCanPlay={handleCanPlay}
                              onError={handleVideoError}
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 border-4 border-dashed border-blue-400 opacity-70 pointer-events-none rounded-xl flex items-center justify-center">
                              <div className="w-36 h-36 border-2 border-white rounded-full flex items-center justify-center">
                                <div className="w-32 h-32 border border-white rounded-full"></div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-center text-xs text-gray-500 h-5">
                      {isCameraActive ? (
                        <span className="flex items-center text-green-500 font-medium">
                          <span className="relative flex h-3 w-3 mr-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                          </span>
                          Camera connected
                        </span>
                      ) : (
                        <span>Camera disconnected</span>
                      )}
                    </div>
                    
                    <button 
                      onClick={isCameraActive ? captureImage : startCamera}
                      disabled={isLoading}
                      className={`w-full py-3 rounded-lg flex items-center justify-center font-medium transition shadow-md ${
                        isCameraActive 
                          ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700" 
                          : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700"
                      }`}
                    >
                      {isLoading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </>
                      ) : (
                        <>
                          {isCameraActive ? (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              Capture Face
                            </>
                          ) : (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              Start Camera
                            </>
                          )}
                        </>
                      )}
                    </button>
                    
                    {cameraFailed && (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mt-4">
                        <div className="flex">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500 mt-0.5 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <div>
                            <p className="text-sm text-amber-800 font-medium">Having trouble with the camera?</p>
                            <button
                              onClick={() => setActiveTab("traditional")}
                              className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                            >
                              Switch to password login
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="relative overflow-hidden rounded-xl bg-gradient-to-b from-gray-100 to-gray-200 shadow-inner border border-gray-300">
                      <div className="aspect-w-4 aspect-h-3">
                        <img 
                          src={faceCapture} 
                          alt="Captured face" 
                          className="object-cover w-full h-full rounded-xl"
                        />
                      </div>
                    </div>
                    
                    {isLoading ? (
                      <div className="flex flex-col items-center justify-center py-4">
                        <div className="flex items-center space-x-2 text-blue-600">
                          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Verifying your identity...</span>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setFaceCapture(null);
                          startCamera();
                        }}
                        className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition shadow-sm flex items-center justify-center font-medium"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Try Again
                      </button>
                    )}
                  </div>
                )}
                
                <div className="flex items-center justify-center pt-2">
                  <p className="text-sm text-gray-600">
                    Don't have an account? <Link href="/signup" className="text-blue-600 hover:text-blue-800 font-medium">Sign up</Link>
                  </p>
                </div>
              </div>
            )}
          </div>
          
          <canvas ref={canvasRef} className="hidden"></canvas>
        </div>
      </div>
    </div>
  );
}
