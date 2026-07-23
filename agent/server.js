import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import summaryRouter from "./routes/summary.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use("/summary", summaryRouter);

app.get("/", (req, res) => {
    res.json({
        status: "ok",
        service: "LumiVoice Agent",
        message: "Agent is running successfully."
    });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(` LumiVoice Agent running on http://localhost:${PORT}`);
});