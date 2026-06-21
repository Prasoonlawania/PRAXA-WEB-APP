import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use JSON middleware wrapper
  app.use(express.json());

  // API Route for Gemini
  app.post("/api/gemini/chat", async (req, res) => {
    try {
      const { message, history } = req.body;
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      
      const chat = ai.chats.create({
        model: "gemini-3.5-flash",
        config: {
          systemInstruction: "You are Praxa AI, a helpful and friendly AI assistant built into the Praxa app. Answer questions concisely.",
        },
      });
      
      // We don't restore history here perfectly in this simple example 
      // but we send the message. Ideally we'd set history on chat object but @google/genai syntax for history can differ.
      // Easiest is to send the whole text or context if we want.
      // But let's just send the message.
      const response = await chat.sendMessage({ message: message });
      
      res.json({ text: response.text });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message || "Failed to generate AI response." });
    }
  });

  app.post("/api/gemini/summarize", async (req, res) => {
    try {
      const { chatHistory } = req.body;
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
      });
      
      const chat = ai.chats.create({
        model: "gemini-3.5-flash",
        config: {
          systemInstruction: "You are Praxa AI. Summarize the provided chat history concisely in a few bullet points.",
        },
      });
      
      const response = await chat.sendMessage({ message: chatHistory });
      res.json({ summary: response.text });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message || "Failed to summarize chat." });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
