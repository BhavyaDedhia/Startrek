const fs = require('fs');
const path = require('path');

// Ensure directories exist for audio transcription
console.log('Setting up audio transcription directories...');

// Create temp directory
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  console.log(`Creating temp directory: ${tempDir}`);
  fs.mkdirSync(tempDir, { recursive: true });
} else {
  console.log(`Temp directory already exists: ${tempDir}`);
}

// Create scripts directory if it doesn't exist
const scriptsDir = path.join(__dirname, 'src', 'scripts');
if (!fs.existsSync(scriptsDir)) {
  console.log(`Creating scripts directory: ${scriptsDir}`);
  fs.mkdirSync(scriptsDir, { recursive: true });
} else {
  console.log(`Scripts directory already exists: ${scriptsDir}`);
}

// Verify transcribe.py exists
const transcribeScript = path.join(scriptsDir, 'transcribe.py');
if (fs.existsSync(transcribeScript)) {
  console.log(`Transcription script found: ${transcribeScript}`);
} else {
  console.log(`Warning: Transcription script not found: ${transcribeScript}`);
  console.log('Please ensure the transcribe.py file is in the src/scripts directory');
}

console.log('Audio transcription setup complete!');
console.log('');
console.log('To test audio transcription, run:');
console.log('1. Start your server: npm run dev');
console.log('2. Visit http://localhost:3000/api/test-audio');
console.log('3. Try recording audio in the Query section of your profile'); 