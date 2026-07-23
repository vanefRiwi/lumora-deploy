# Lumora AI Agent

The **Lumora AI Agent** is a lightweight backend service responsible for handling AI-powered lesson summarization for the Lumora platform.

It receives lesson content from the frontend, sends it to the Google Gemini API, generates a concise summary, and returns the result to the frontend, where it can also be read aloud using the Text-to-Speech service.

---

# Features

- AI-powered lesson summarization
- Google Gemini integration
- REST API built with Express.js
- Frontend integration support
- JSON request/response
- Ready for Text-to-Speech integration

---

# Tech Stack

- Node.js
- Express.js
- Google Gemini API
- dotenv
- CORS

---

# Project Structure

```text
agent/
│
├── routes/
│   └── summary.js
│
├── services/
│   └── gemini.js
│
├── .env
├── package.json
├── server.js
└── README.md
```

---

# Installation

Navigate to the project folder:

```bash
cd RIWI_integrative_project
```

Navigate to the Agent folder:

```bash
cd agent
```

Install all dependencies:

```bash
npm install
```

---

# Environment Setup

Create a file named **.env** inside the **agent** folder.

Add the following variables:

```env
GEMINI_API_KEY=<YOUR_GEMINI_API_KEY>
PORT=3001
```

---

# Run the Agent

Start the development server:

```bash
npm run dev
```

Or run the application normally:

```bash
npm start
```

The Agent will be running at:

```text
http://localhost:3001
```

---

# API Endpoint

## Generate Lesson Summary

**POST**

```text
/summary
```

### Request Body

```json
{
  "text": "Artificial Intelligence is transforming education by helping students learn more efficiently."
}
```

### Successful Response

```json
{
  "summary": "Artificial Intelligence helps students learn more efficiently by providing intelligent educational support."
}
```

---

# How It Works

```text
Frontend
     │
     ▼
POST /summary
     │
     ▼
Lumora AI Agent
     │
     ▼
Google Gemini API
     │
     ▼
AI Generated Summary
     │
     ▼
Frontend
     │
     ▼
Text-to-Speech
```

---

# Available Scripts

Run the development server:

```bash
npm run dev
```

Run the production server:

```bash
npm start
```

---

# Environment Variables

| Variable | Description |
|----------|-------------|
| GEMINI_API_KEY | Google Gemini API Key |
| PORT | Server port (default: 3001) |

---

# Testing

Once the server is running, you can test the endpoint using Thunder Client or Postman.

**POST**

```text
http://localhost:3001/summary
```

Body:

```json
{
  "text": "Your lesson content here."
}
```

Expected response:

```json
{
  "summary": "AI-generated summary..."
}
```

---

# Authors

Developed for the **Lumora** educational platform as part of the **RIWI Integrative Project**.

Documentation