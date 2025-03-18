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
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-blue-500 to-indigo-600">
      <div className="w-full max-w-md bg-white p-8 shadow-xl rounded-lg">
        {/* Logo */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">NeoAssist</h1>
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
            onClick={() => {
              setActiveTab("face");
              // Reset camera state when switching to face tab
              setIsCameraActive(false);
              setFaceCapture(null);
              setCameraFailed(false);
              setStreamReady(null);
            }}
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
              disabled={isLoading}
              className="w-full bg-blue-500 text-white py-3 rounded-md hover:bg-blue-600 transition"
            >
              {isLoading ? "Logging in..." : "Login"}
            </button>

            <div className="flex justify-between mt-4">
              <p className="text-gray-500 text-sm">
                <a href="#" className="text-blue-500">Forgot password?</a>
              </p>
              <p className="text-gray-500 text-sm">
                <Link href="/signup" className="text-blue-500">Create account</Link>
              </p>
            </div>
          </div>
        )}

        {/* Face Recognition Login */}
        {activeTab === "face" && (
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              Face Recognition Login
            </h2>

            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

            <p className="text-gray-500 text-sm mb-4">
              Log in securely using your face as your password.
            </p>

            {!faceCapture ? (
              <div className="relative">
                <div className="flex flex-col items-center justify-center w-full h-48 bg-gray-200 rounded-lg shadow-md overflow-hidden">
                  {!isCameraActive ? (
                    <div className="flex flex-col items-center justify-center h-full">
                      <span className="text-gray-500 text-6xl mb-2">📷</span>
                      <p className="text-gray-500 text-sm">Camera inactive</p>
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
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 border-4 border-dashed border-blue-400 pointer-events-none"></div>
                    </>
                  )}
                </div>
                
                <div className="mt-2 text-xs text-gray-500">
                  {isCameraActive ? (
                    <p className="text-green-500">Camera connected ✓</p>
                  ) : (
                    <p>Camera status: disconnected</p>
                  )}
                </div>
                
                <button 
                  onClick={isCameraActive ? captureImage : startCamera}
                  className="w-full bg-blue-500 text-white py-3 rounded-md mt-4 hover:bg-blue-600 transition"
                  disabled={isLoading}
                >
                  {isLoading 
                    ? "Processing..." 
                    : isCameraActive 
                      ? "Capture Face" 
                      : "Start Camera"
                  }
                </button>
                
                {cameraFailed && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-yellow-700 text-sm">Having trouble with the camera?</p>
                    <button
                      onClick={() => setActiveTab("traditional")}
                      className="mt-2 text-blue-500 text-sm underline"
                    >
                      Switch to traditional login
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-full h-48 bg-gray-200 rounded-lg shadow-md overflow-hidden">
                  <img 
                    src={faceCapture} 
                    alt="Captured face" 
                    className="w-full h-full object-cover"
                  />
                </div>
                {isLoading ? (
                  <p className="mt-4 text-blue-500">Verifying your identity...</p>
                ) : (
                  <button
                    onClick={() => {
                      setFaceCapture(null);
                      startCamera();
                    }}
                    className="w-full bg-gray-500 text-white py-3 rounded-md mt-4 hover:bg-gray-600 transition"
                  >
                    Try Again
                  </button>
                )}
              </div>
            )}
            
            <canvas ref={canvasRef} className="hidden"></canvas>
            
            <p className="text-center text-gray-500 text-sm mt-6">
              Don't have an account? <Link href="/signup" className="text-blue-500">Sign up</Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
