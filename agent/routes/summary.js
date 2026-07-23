import express from "express";
import { summarizeText } from "../services/gemini.js";

const router = express.Router();

//=========================
// ROUTES
//=========================
/**
 * This route receives a POST request with a lesson text in the body.
 * It uses the summarizeText function to generate a summary of the lesson.
 * The summary is then sent back in the response.
 *
 * The body may optionally include `apiKey`: a Gemini key the user pasted in
 * the voice assistant settings. When present it is used for this request,
 * so an expired key can be swapped from the UI without touching the .env.
 */
router.post("/", async (req, res) => {
    try {
        const { text, apiKey } = req.body;

        if (!text) {
            return res.status(400).json({
                error: "Text is required."
            });
        }

        const summary = await summarizeText(text, apiKey);

        res.json({
            summary
        });

    } catch (error) {
        console.error("Summary error:", error);

        res.status(500).json({
            error: "Failed to generate summary."
        });
    }
});

export default router;
