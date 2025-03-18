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
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-blue-500 to-indigo-600">
      <div className="w-full max-w-md bg-white p-8 shadow-xl rounded-lg">
        {/* Logo */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">NeoAssist</h1>
          <p className="text-gray-500">Create Your Account</p>
        </div>
        
        {/* Step 1: Form Inputs */}
        {step === 1 && (
          <form onSubmit={handleSubmit}>
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-3 border rounded-md shadow-sm focus:ring focus:ring-blue-300"
                placeholder="Enter your full name"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 border rounded-md shadow-sm focus:ring focus:ring-blue-300"
                placeholder="Enter your email"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-1">Mobile Number</label>
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="w-full p-3 border rounded-md shadow-sm focus:ring focus:ring-blue-300"
                placeholder="Enter 10-digit mobile number"
                maxLength={10}
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-1">Aadhar Number</label>
              <input
                type="text"
                value={aadhar}
                onChange={(e) => setAadhar(e.target.value)}
                className="w-full p-3 border rounded-md shadow-sm focus:ring focus:ring-blue-300"
                placeholder="Enter 12-digit Aadhar number"
                maxLength={12}
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 border rounded-md shadow-sm focus:ring focus:ring-blue-300"
                placeholder="Create a strong password"
              />
              <p className="text-xs text-gray-500 mt-1">
                At least 8 characters with uppercase, lowercase, and number
              </p>
            </div>
            
            <div className="mb-6">
              <label className="block text-gray-700 font-medium mb-1">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-3 border rounded-md shadow-sm focus:ring focus:ring-blue-300"
                placeholder="Confirm your password"
              />
            </div>
            
            <button
              type="submit"
              className="w-full bg-blue-500 text-white py-3 rounded-md hover:bg-blue-600 transition"
            >
              Continue to Face Verification
            </button>
            
            <p className="text-center text-gray-500 text-sm mt-4">
              Already have an account? <Link href="/login" className="text-blue-500">Login here</Link>
            </p>
          </form>
        )}
        
        {/* Step 2: Face Verification */}
        {step === 2 && (
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              Aadhar Face Verification
            </h2>
            
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            
            <p className="text-gray-600 text-sm mb-4">
              Please position your face in the frame and ensure good lighting for accurate verification.
            </p>
            
            <div className="flex flex-col items-center mb-6">
              {!faceDetected ? (
                <>
                  <div className="w-full h-64 bg-gray-100 rounded-lg overflow-hidden mb-4 relative">
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
                    <div className="absolute inset-0 border-4 border-dashed border-blue-400 pointer-events-none"></div>
                  </div>
                  
                  <div className="mt-2 text-xs text-gray-500 mb-4">
                    {isCameraActive ? (
                      <p className="text-green-500">Camera connected ✓</p>
                    ) : (
                      <p>Camera status: disconnected</p>
                    )}
                  </div>
                  
                  <button
                    onClick={captureImage}
                    disabled={!isCameraActive}
                    className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 transition disabled:bg-gray-400"
                  >
                    {isCameraActive ? "Capture Image" : "Waiting for camera..."}
                  </button>
                  
                  {cameraFailed && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-yellow-700 text-sm">Having trouble with the camera?</p>
                      <button
                        onClick={() => {
                          setStep(1);
                          stopCamera();
                        }}
                        className="mt-2 text-blue-500 text-sm underline"
                      >
                        Go back to form
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="w-full h-64 bg-gray-100 rounded-lg overflow-hidden mb-4">
                    <img 
                      src={faceCapture} 
                      alt="Captured face" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex space-x-4">
                    <button
                      onClick={retakeImage}
                      className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600 transition"
                    >
                      Retake
                    </button>
                    <button
                      onClick={completeRegistration}
                      className="bg-green-500 text-white px-6 py-2 rounded-md hover:bg-green-600 transition"
                      disabled={isLoading}
                    >
                      {isLoading ? "Processing..." : "Complete Registration"}
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
              className="w-full mt-4 border border-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-50 transition"
            >
              Back to Form
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 