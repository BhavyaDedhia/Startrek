import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { join } from "path";
import fs from "fs";

const execPromise = promisify(exec);

export async function GET() {
  try {
    // Check if temp directory exists
    const tempDir = join(process.cwd(), "temp");
    if (!fs.existsSync(tempDir)) {
      try {
        fs.mkdirSync(tempDir, { recursive: true });
      } catch (error) {
        return NextResponse.json({ 
          message: "Failed to create temp directory", 
          error: error.message 
        }, { status: 500 });
      }
    }
    
    // Check if Python is installed
    try {
      const { stdout: pythonVersion } = await execPromise("python --version");
      
      // Check if the transcribe.py script exists
      const scriptPath = join(process.cwd(), "src", "scripts", "transcribe.py");
      const scriptExists = fs.existsSync(scriptPath);
      
      // Check if required Python packages are installed
      const { stdout: pipList } = await execPromise("pip list");
      const hasTorch = pipList.includes("torch");
      const hasTorchaudio = pipList.includes("torchaudio");
      const hasTransformers = pipList.includes("transformers");
      
      return NextResponse.json({
        message: "Audio transcription system status",
        python: pythonVersion.trim(),
        tempDirectoryExists: fs.existsSync(tempDir),
        transcriptionScriptExists: scriptExists,
        dependencies: {
          torch: hasTorch,
          torchaudio: hasTorchaudio,
          transformers: hasTransformers
        },
        status: scriptExists && hasTorch && hasTorchaudio && hasTransformers ? "Ready" : "Missing components"
      });
    } catch (error) {
      return NextResponse.json({ 
        message: "Python check failed", 
        error: error.message 
      }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ 
      message: "Test failed", 
      error: error.message 
    }, { status: 500 });
  }
} 