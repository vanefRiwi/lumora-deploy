import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Google Gemini Service
// Responsible for communicating with the Google Gemini API to generate
// summaries of lessons.
//
// The API key can come from two places, in this order:
//   1. `userApiKey`, a key the user pasted in the voice assistant settings
//      (sent per request from the frontend). Lets the user swap an expired
//      key from the UI without touching the code or .env.
//   2. process.env.GEMINI_API_KEY, the server default from the .env file.

// Build the prompt sent to Gemini
export async function summarizeText(text, userApiKey) {
    // Prefer the user-provided key; fall back to the server .env key.
    const apiKey = (userApiKey && userApiKey.trim()) || process.env.GEMINI_API_KEY;

    const ai = new GoogleGenAI({ apiKey });

    try {
        const prompt = `
You are an educational assistant for Lumora.

Summarize the following lesson in a concise way.
Use simple language and keep the most important ideas.

Lesson:
${text}
`;

        const response = await ai.models.generateContent({
            model: "gemini-3.1-flash-lite",
            contents: prompt,
        });

        return response.text;
    } catch (error) {
        console.error("========== GEMINI ERROR ==========");
        console.error(error);

        if (error.message) {
            console.error("Message:", error.message);
        }

        if (error.status) {
            console.error("Status:", error.status);
        }

        if (error.cause) {
            console.error("Cause:", error.cause);
        }

        throw error;
    }
}
