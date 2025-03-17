import { NextResponse } from "next/server";
import { writeFile, mkdir, unlink, readFile } from "fs/promises";
import { join } from "path";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { existsSync } from "fs";

const execPromise = promisify(exec);

// Read settings to check if we have an API key
async function readSettings() {
  try {
    const settingsPath = join(process.cwd(), "settings.json");
    if (!existsSync(settingsPath)) return { apiKey: "" };
    
    const data = await readFile(settingsPath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading settings:", error);
    return { apiKey: "" };
  }
}

// Simple demo transcription for fallback
function generateDemoResponse() {
  const bankingQueries = [
    "What is my current account balance?",
    "Can you show me my recent transactions?",
    "I'd like to transfer money to my savings account",
    "How do I apply for a loan?",
    "Is there a way to increase my credit limit?",
    "I need help with my mortgage payment",
    "When is my next credit card payment due?",
    "Can you help me set up automatic bill payments?",
    "I want to know about your investment options",
    "How do I report a lost debit card?"
  ];
  
  const randomQuery = bankingQueries[Math.floor(Math.random() * bankingQueries.length)];
  return { transcription: randomQuery, note: "Fallback demo mode - browser transcription recommended" };
}

export async function POST(req) {
  try {
    // Check if this is a browser transcription fallback request
    const formData = await req.formData();
    const useFallbackOnly = formData.get("fallbackOnly") === "true";
    
    if (useFallbackOnly) {
      console.log("Using demo fallback mode directly");
      return NextResponse.json(generateDemoResponse());
    }
    
    // Regular file-based transcription (as fallback for browsers without Web Speech API)
    const audioFile = formData.get("audio");
    
    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }
    
    console.log("Received audio file:", audioFile.name, audioFile.type, audioFile.size);
    
    // Create temporary directory if it doesn't exist
    const tempDir = join(process.cwd(), "temp");
    await mkdir(tempDir, { recursive: true });
    
    // Generate unique filename
    const timestamp = Date.now();
    const filename = `recording_${timestamp}${path.extname(audioFile.name) || ".webm"}`;
    const filepath = join(tempDir, filename);
    
    // Save the audio file
    try {
      const bytes = await audioFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filepath, buffer);
      console.log(`Audio file saved to ${filepath}`);
    } catch (error) {
      console.error("Error saving audio file:", error);
      return NextResponse.json({ error: "Failed to save audio file" }, { status: 500 });
    }
    
    // Generate demo response directly
    const demoResponse = generateDemoResponse();
    
    // Clean up the temporary file
    try {
      await unlink(filepath);
      console.log("Temporary file deleted");
    } catch (error) {
      console.error("Error deleting temporary file:", error);
    }
    
    return NextResponse.json(demoResponse);
  } catch (error) {
    console.error("Error in transcribe API:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
} 