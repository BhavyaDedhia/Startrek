import { NextResponse } from "next/server";
import multer from "multer";
import path from "path";
import fs from "fs";
import Ticket from "@/models/Ticket";
import connectDB from "@/lib/mongodb";
import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

// ✅ Set up Multer Storage Configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(process.cwd(), "public/uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

// ✅ Initialize Multer
const upload = multer({ storage });
const uploadMiddleware = upload.single("video");

// ✅ Disable Body Parser for File Uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

// ✅ Helper Function to Handle FormData
async function handleUpload(req) {
  return new Promise((resolve, reject) => {
    uploadMiddleware(req, {}, (err) => {
      if (err) {
        console.error("❌ Multer Error:", err);
        reject(err);
      } else {
        console.log("✅ Multer File Upload Success:", req.file);
        resolve(req);
      }
    });
  });
}

// ✅ API POST Handler
export async function POST(req) {
  try {
    console.log("📥 Received Upload Request");

    await connectDB();

    // ✅ Process FormData
    const parsedReq = await handleUpload(req);

    // ✅ Debug: Log Request Body
    console.log("🔍 Request Body:", parsedReq.body);

    // ✅ Debug: Check If File Exists
    if (!parsedReq.file) {
      console.error("❌ No File Found");
      return NextResponse.json({ message: "No file uploaded" }, { status: 400 });
    }

    const videoPath = `/uploads/${parsedReq.file.filename}`;
    console.log(`✅ Video Uploaded: ${videoPath}`);

    return NextResponse.json({ message: "Video uploaded successfully", videoPath });
  } catch (error) {
    console.error("❌ Error in Upload:", error);
    return NextResponse.json({ message: "Upload failed", error }, { status: 500 });
  }
}
