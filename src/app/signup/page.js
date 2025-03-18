"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Signup() {
  const router = useRouter();
  
  // Form inputs
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mobile, setMobile] = useState("");
  const [aadhar, setAadhar] = useState("");
  
  // UI states
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Form, 2: Face verification
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceCapture, setFaceCapture] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraFailed, setCameraFailed] = useState(false);
  const [isComponentMounted, setIsComponentMounted] = useState(false);
  
  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const retryCountRef = useRef(0);
  
  // Validation functions
  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };
  
  const validateMobile = (mobile) => {
    const re = /^[6-9]\d{9}$/;
    return re.test(mobile);
  };
  
  const validateAadhar = (aadhar) => {
    const re = /^\d{12}$/;
    return re.test(aadhar);
  };
  
  const validatePassword = (password) => {
    // At least 8 characters, with at least one uppercase, one lowercase, and one number
    const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
    return re.test(password);
  };
  
  // Handle form validation and submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    // Validate inputs
    if (!name) return setError("Name is required");
    if (!email) return setError("Email is required");
    if (!validateEmail(email)) return setError("Invalid email format");
    if (!password) return setError("Password is required");
    if (!validatePassword(password)) 
      return setError("Password must be at least 8 characters with at least one uppercase letter, one lowercase letter, and one number");
    if (password !== confirmPassword) return setError("Passwords do not match");
    if (!mobile) return setError("Mobile number is required");
    if (!validateMobile(mobile)) return setError("Invalid mobile number format");
    if (!aadhar) return setError("Aadhar number is required");
    if (!validateAadhar(aadhar)) return setError("Invalid Aadhar number format");
    
    // Move to face verification step
    setStep(2);
    startCamera();
  };
  
  // Check for camera compatibility
  const checkCameraCompatibility = () => {
    // Check if getUserMedia is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error("Camera API not supported in this browser");
      setError("Camera not supported in this browser. Please try a different browser for signup.");
      setCameraFailed(true);
      return false;
    }
    return true;
  };
  
  // Camera functions
  const startCamera = async () => {
    setError("");
    setCameraFailed(false);
    
    // Don't attempt to start camera if component is unmounting
    if (!isComponentMounted) {
      console.log("Component not mounted, skipping camera start");
      return;
    }
    
    // Check browser compatibility first
    if (!checkCameraCompatibility()) {
      return;
    }
    
    // Double check video ref is available
    if (!videoRef.current) {
      console.error("Video ref still not available - startCamera");
      setError("Camera initialization failed. Please refresh the page and try again.");
      setCameraFailed(true);
      return;
    }
    
    try {
      console.log("Requesting camera access for signup...");
      
      // Try simpler constraints first
      let constraints = { video: true };
      
      try {
        // Enhanced constraints if basic ones work
        constraints = { 
          video: { 
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 } 
          } 
        };
      } catch (err) {
        console.warn("Using simple video constraints:", err);
      }
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("Camera access granted for signup");
      
      // Extra safety check
      if (!videoRef.current || !isComponentMounted) {
        console.error("Video element lost after camera initialization or component unmounted");
        stream.getTracks().forEach(track => track.stop());
        setError("Video initialization failed. Please refresh and try again.");
        setCameraFailed(true);
        return;
      }
      
      videoRef.current.srcObject = stream;
      streamRef.current = stream;
      
      // Add timeout in case onCanPlay doesn't fire
      const canPlayTimeout = setTimeout(() => {
        if (isComponentMounted && !isCameraActive) {
          console.log("Setting camera active from timeout");
          setIsCameraActive(true);
        }
      }, 3000);
      
      // Setup onCanPlay handler directly
      videoRef.current.oncanplay = () => {
        console.log("Video can play - camera ready");
        clearTimeout(canPlayTimeout);
        if (isComponentMounted) {
          setIsCameraActive(true);
        }
      };
      
    } catch (err) {
      console.error("Signup camera access error:", err.name, err.message);
      if (isComponentMounted) {
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
    }
  };
  
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setIsCameraActive(false);
    }
  };
  
  const captureImage = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video && canvas) {
      const context = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const imageData = canvas.toDataURL('image/jpeg');
      setFaceCapture(imageData);
      setFaceDetected(true);
      
      // After capturing, we can stop the camera
      stopCamera();
    }
  };
  
  const retakeImage = () => {
    setFaceCapture(null);
    setFaceDetected(false);
    startCamera();
  };
  
  // Handle registration with face verification
  const completeRegistration = async () => {
    if (!faceCapture) {
      return setError("Face capture is required for verification");
    }
    
    setIsLoading(true);
    
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          mobile,
          aadhar,
          faceData: faceCapture
        }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        // Save user data to localStorage and redirect to profile
        localStorage.setItem("user", JSON.stringify(data));
        router.push("/profile");
      } else {
        setError(data.message || "Registration failed");
        // If face verification failed, go back to face capture
        if (data.error === "face_verification_failed") {
          setFaceDetected(false);
          setFaceCapture(null);
          startCamera();
        }
      }
    } catch (err) {
      console.error("Registration error:", err);
      setError("An error occurred during registration. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Mark component as mounted
  useEffect(() => {
    setIsComponentMounted(true);
    return () => {
      setIsComponentMounted(false);
      stopCamera();
    };
  }, []);
  
  // Cleanup and camera initialization
  useEffect(() => {
    // Only run once component is definitely mounted
    if (!isComponentMounted) return;
    
    let timerId = null;
    
    const initCamera = () => {
      if (step === 2 && !isCameraActive && !faceCapture && !cameraFailed && isComponentMounted) {
        if (videoRef.current) {
          console.log("Video ref found, starting camera");
          retryCountRef.current = 0;
          startCamera();
        } else {
          retryCountRef.current += 1;
          console.error(`Video ref not available yet, waiting... (attempt ${retryCountRef.current})`);
          
          // Exponential backoff with max of 2 seconds
          const delay = Math.min(500 * Math.pow(1.5, retryCountRef.current - 1), 2000);
          
          if (retryCountRef.current > 10) {
            console.error("Max retries reached, giving up");
            setCameraFailed(true);
            setError("Unable to initialize camera. Please refresh the page or try another browser.");
            return;
          }
          
          // Try again after delay
          timerId = setTimeout(initCamera, delay);
        }
      }
    };
    
    // Give the DOM a moment to render before attempting to access the video element
    timerId = setTimeout(initCamera, 500);
    
    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, [step, isCameraActive, faceCapture, cameraFailed, isComponentMounted]);
  
  return (
    <div className="min-h-screen flex flex-col md:flex-row overflow-hidden">
      {/* Left panel with background and branding */}
      <div className="hidden md:flex md:w-2/5 bg-gradient-to-br from-purple-900 via-indigo-800 to-blue-900 text-white p-12 flex-col justify-between">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-2">NeoAssist</h1>
          <p className="text-blue-200 text-lg font-light">Banking. Reimagined.</p>
          
          <div className="mt-16">
            <h2 className="text-2xl font-bold mb-6">Create Your Banking Account</h2>
            <p className="text-blue-100 opacity-80 mb-4">Start your journey with NeoAssist's secure, intelligent banking platform.</p>
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
      
      {/* Right panel with signup form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-10 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile logo - only shows on small screens */}
          <div className="md:hidden text-center mb-10">
            <h1 className="text-3xl font-bold text-gray-900">NeoAssist</h1>
            <p className="text-gray-600">Banking. Reimagined.</p>
          </div>
          
          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-10">
            {/* Step 1: Form */}
            {step === 1 && (
              <>
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Create Account</h2>
                
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
                
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="name">Full Name</label>
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">Email Address</label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="mobile">Mobile Number</label>
                      <input
                        id="mobile"
                        type="tel"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        placeholder="10-digit number"
                        maxLength={10}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="aadhar">Aadhar Number</label>
                      <input
                        id="aadhar"
                        type="text"
                        value={aadhar}
                        onChange={(e) => setAadhar(e.target.value)}
                        placeholder="12-digit number"
                        maxLength={12}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">Password</label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a strong password"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      At least 8 characters with uppercase, lowercase, and number
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="confirmPassword">Confirm Password</label>
                    <input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your password"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                  
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition shadow-md"
                  >
                    Continue to Face Verification
                  </button>
                  
                  <div className="flex items-center justify-center mt-6">
                    <p className="text-sm text-gray-600">
                      Already have an account? <Link href="/login" className="text-blue-600 hover:text-blue-800 font-medium">Sign in</Link>
                    </p>
                  </div>
                </form>
              </>
            )}
            
            {/* Step 2: Face Verification */}
            {step === 2 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-1">Face Verification</h2>
                <p className="text-gray-500 mb-6 text-sm">Complete your secure account setup</p>
                
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
                
                <div className="flex flex-col items-center mb-6">
                  {!faceDetected ? (
                    <>
                      <div className="w-full h-64 bg-gray-100 rounded-xl overflow-hidden mb-4 relative shadow-inner border border-gray-200">
                        {!isCameraActive ? (
                          <div className="flex flex-col items-center justify-center h-full p-6">
                            <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mb-3">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                              </svg>
                            </div>
                            <p className="text-gray-600 text-sm font-medium">Initializing camera...</p>
                            <p className="text-gray-500 text-xs mt-1">Please allow camera access when prompted</p>
                          </div>
                        ) : (
                          <>
                            <video
                              ref={videoRef}
                              autoPlay
                              playsInline
                              muted
                              onCanPlay={() => {
                                console.log("Signup video can play from React handler");
                                if (isComponentMounted) {
                                  setIsCameraActive(true);
                                }
                              }}
                              onError={(e) => {
                                console.error("Signup video error:", e);
                                if (isComponentMounted) {
                                  setCameraFailed(true);
                                }
                              }}
                              className="w-full h-full object-cover"
                            ></video>
                            <div className="absolute inset-0 border-4 border-dashed border-blue-400 opacity-70 pointer-events-none rounded-xl flex items-center justify-center">
                              <div className="w-36 h-36 border-2 border-white rounded-full flex items-center justify-center">
                                <div className="w-32 h-32 border border-white rounded-full"></div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-center text-xs text-gray-500 h-5 mb-4">
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
                        onClick={captureImage}
                        disabled={!isCameraActive}
                        className={`w-full py-3 rounded-lg flex items-center justify-center font-medium transition shadow-md ${
                          isCameraActive 
                            ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700" 
                            : "bg-gray-400 text-white cursor-not-allowed"
                        }`}
                      >
                        {isCameraActive ? (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Capture Image
                          </>
                        ) : (
                          "Waiting for camera..."
                        )}
                      </button>
                      
                      {cameraFailed && (
                        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg w-full">
                          <div className="flex">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500 mt-0.5 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <div>
                              <p className="text-sm text-amber-800 font-medium">Having trouble with the camera?</p>
                              <button
                                onClick={() => {
                                  setStep(1);
                                  stopCamera();
                                }}
                                className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                              >
                                Go back to form
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="w-full h-64 bg-gray-100 rounded-xl overflow-hidden mb-4 shadow-inner border border-gray-200">
                        <img
                          src={faceCapture}
                          alt="Captured face"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      
                      <div className="flex space-x-4 w-full">
                        <button
                          onClick={retakeImage}
                          className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition shadow-sm flex items-center justify-center font-medium"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Retake
                        </button>
                        <button
                          onClick={completeRegistration}
                          disabled={isLoading}
                          className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition shadow-md flex items-center justify-center font-medium"
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
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Complete Registration
                            </>
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </div>
                
                <canvas ref={canvasRef} className="hidden"></canvas>
                
                <button
                  onClick={() => {
                    setStep(1);
                    stopCamera();
                  }}
                  className="w-full mt-6 border border-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-50 transition flex items-center justify-center font-medium"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Form
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 