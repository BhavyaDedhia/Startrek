import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { join } from "path";
import fs from "fs";

const execPromise = promisify(exec);

export async function GET() {
  const results = {
    system: {},
    directories: {},
    python: {},
    files: {}
  };
  
  try {
    // 1. Check system info
    results.system.cwd = process.cwd();
    results.system.nodeVersion = process.version;
    results.system.platform = process.platform;
    
    // 2. Check directories
    const tempDir = join(process.cwd(), "temp");
    const scriptDir = join(process.cwd(), "src", "scripts");
    
    results.directories.tempExists = fs.existsSync(tempDir);
    results.directories.tempPath = tempDir;
    results.directories.scriptDirExists = fs.existsSync(scriptDir);
    results.directories.scriptDirPath = scriptDir;
    
    // Try to create temp directory if it doesn't exist
    if (!results.directories.tempExists) {
      try {
        fs.mkdirSync(tempDir, { recursive: true });
        results.directories.tempDirCreated = true;
        results.directories.tempExists = fs.existsSync(tempDir);
      } catch (error) {
        results.directories.tempDirError = error.message;
      }
    }
    
    // 3. Check transcription script
    const scriptPath = join(scriptDir, "transcribe.py");
    results.files.scriptExists = fs.existsSync(scriptPath);
    results.files.scriptPath = scriptPath;
    
    if (results.files.scriptExists) {
      try {
        const stats = fs.statSync(scriptPath);
        results.files.scriptSize = stats.size;
        results.files.scriptPerms = stats.mode.toString(8);
        results.files.scriptModified = stats.mtime;
      } catch (error) {
        results.files.scriptStatsError = error.message;
      }
    }
    
    // 4. Check Python and dependencies
    try {
      const { stdout: pythonVersion } = await execPromise("python --version");
      results.python.version = pythonVersion.trim();
      
      try {
        const { stdout: pipList } = await execPromise("pip list");
        results.python.torch = pipList.includes("torch");
        results.python.torchaudio = pipList.includes("torchaudio");
        results.python.transformers = pipList.includes("transformers");
        
        // Run a simple Python check
        if (results.files.scriptExists) {
          try {
            const testCommand = `python -c "import sys; import torch; import torchaudio; import transformers; print('Python imports successful')"`;
            const { stdout, stderr } = await execPromise(testCommand);
            results.python.importTest = stdout.trim();
            if (stderr) {
              results.python.importTestError = stderr;
            }
          } catch (error) {
            results.python.importTestError = error.message;
          }
        }
      } catch (error) {
        results.python.pipError = error.message;
      }
    } catch (error) {
      results.python.error = error.message;
    }
    
    // 5. Determine status
    let isReady = 
      results.directories.tempExists && 
      results.directories.scriptDirExists &&
      results.files.scriptExists &&
      results.python.version &&
      results.python.torch &&
      results.python.torchaudio &&
      results.python.transformers;
    
    return NextResponse.json({
      status: isReady ? "Ready" : "Not Ready",
      message: "Audio transcription system diagnostic results",
      diagnostics: results
    });
    
  } catch (error) {
    return NextResponse.json({ 
      status: "Error",
      message: "Diagnostic check failed", 
      error: error.message 
    }, { status: 500 });
  }
} 