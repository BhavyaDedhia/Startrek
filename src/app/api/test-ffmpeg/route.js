import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execPromise = promisify(exec);

export async function GET() {
  try {
    // Check if FFmpeg is installed
    const ffmpegPath = path.join(process.cwd(), "node_modules", "@ffmpeg-installer", "ffmpeg", "bin", "ffmpeg.exe");
    
    const ffmpegExists = fs.existsSync(ffmpegPath);
    
    if (!ffmpegExists) {
      return NextResponse.json({
        status: "error",
        message: "FFmpeg executable not found",
        path: ffmpegPath
      }, { status: 404 });
    }
    
    // Try to run FFmpeg to check version
    try {
      const { stdout, stderr } = await execPromise(`"${ffmpegPath}" -version`);
      
      return NextResponse.json({
        status: "success",
        message: "FFmpeg is properly installed",
        path: ffmpegPath,
        version: stdout.split('\n')[0],
        details: {
          stdout,
          stderr
        }
      });
    } catch (error) {
      return NextResponse.json({
        status: "error",
        message: "FFmpeg executable found but failed to run",
        path: ffmpegPath,
        error: error.message,
        stderr: error.stderr
      }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({
      status: "error",
      message: "Error checking FFmpeg",
      error: error.message
    }, { status: 500 });
  }
} 