# StudyMate AI - Exam Preparation & Academic Assistant

A full-stack university study companion powered by Google Gemini, React, TypeScript, Tailwind CSS, Express, and Vite.

---

## 🚀 Running in Windows PowerShell

Follow these step-by-step instructions to run the application locally on your Windows machine using PowerShell.

### Prerequisites

1. **Node.js**: Install Node.js (version 20 or higher is recommended).
   - Check if installed in PowerShell:
     ```powershell
     node -v
     npm -v
     ```
   - Download from [nodejs.org](https://nodejs.org/) if not installed.

2. **Git** (optional, if cloning):
   ```powershell
   git --version
   ```

---

### Step 1: Open PowerShell and Navigate to the Project

Open **Windows PowerShell** or **PowerShell 7** as regular user (or administrator if preferred):

```powershell
cd C:\path\to\your\project-folder
```

---

### Step 2: Set Your Environment Variables

Create a `.env` file in the root folder (or set the environment variable directly in PowerShell).

#### Option A: Create a `.env` file (Recommended)
In PowerShell:
```powershell
New-Item -Path .env -ItemType File -Force
Set-Content -Path .env -Value 'GEMINI_API_KEY="your_actual_gemini_api_key_here"'
```

#### Option B: Set the environment variable for the current PowerShell session
```powershell
$env:GEMINI_API_KEY="your_actual_gemini_api_key_here"
```

*(You can get a free Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey).)*

---

### Step 3: Install Dependencies

Run `npm install` in PowerShell:

```powershell
npm install
```

If you encounter any execution policy or script restrictions in PowerShell, run:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
npm install
```

---

### Step 4: Start the Development Server

Run the development command:

```powershell
npm run dev
```

This starts the full-stack server (`server.ts` with Express + Vite middleware).

You will see:
```text
Gemini AI client initialized with GEMINI_API_KEY.
StudyMate AI Server running on http://localhost:3000
```

---

### Step 5: Open in Your Browser

Open your browser and navigate to:
```
http://localhost:3000
```

---

## 🛠️ Production Build & Run in PowerShell

To test the production build:

```powershell
# 1. Build client bundle
npm run build

# 2. Run the production server
$env:NODE_ENV="production"
npm start
```

---

## ❓ Common PowerShell Troubleshooting

1. **`npm : File ... cannot be loaded because running scripts is disabled on this system`**:
   - Solution: Run this one-time command in PowerShell:
     ```powershell
     Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
     ```

2. **Port 3000 already in use**:
   - Find and kill the process using port 3000:
     ```powershell
     Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force
     ```
   - Or run on an alternate port:
     ```powershell
     $env:PORT="3001"
     npm run dev
     ```

3. **Running in the background in PowerShell**:
   ```powershell
   Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev"
   ```

---

## ☕ Pure Java Edition in PowerShell

StudyMate AI also includes a pure **Java (Spring Boot 3 + Maven / Standalone CLI)** version located in `/java`:

### Option 1: Standalone Java Console App (No Maven Required)
```powershell
cd java\src\main\java
javac com\studymate\cli\StudyMateConsoleApp.java
$env:GEMINI_API_KEY="your_api_key_here"
java com.studymate.cli.StudyMateConsoleApp
```

### Option 2: Full Spring Boot 3 REST API Server (Port 8080)
```powershell
cd java
mvn clean spring-boot:run
```

