import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import OpenAI from "openai";

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);

  // Use JSON middleware wrapper
  app.use(express.json());

  // CORS middleware to allow local cross-origin API access
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
    } else {
      next();
    }
  });

  // API Route for OpenAI ChatGPT
  app.post("/api/openai/chat", async (req, res) => {
    try {
      const { message, history } = req.body;
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      
      const messages: any[] = [
        {
          role: "system",
          content: "You are Praxa AI, a helpful and friendly AI assistant built into the Praxa app. Answer questions concisely."
        }
      ];

      if (history && Array.isArray(history)) {
        history.forEach(item => {
          messages.push({
            role: item.role === 'model' ? 'assistant' : 'user',
            content: item.parts?.[0]?.text || ""
          });
        });
      }

      messages.push({
        role: "user",
        content: message
      });
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: messages,
      });
      
      const reply = response.choices[0]?.message?.content || "Empty response from AI.";
      res.json({ text: reply });
    } catch (e: any) {
      console.error("OpenAI error:", e);
      res.status(500).json({ error: e.message || "Failed to generate AI response." });
    }
  });

  app.post("/api/openai/summarize", async (req, res) => {
    try {
      const { chatHistory } = req.body;
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are Praxa AI. Summarize the provided chat history concisely in a few bullet points."
          },
          {
            role: "user",
            content: chatHistory
          }
        ],
      });
      
      const summary = response.choices[0]?.message?.content || "Failed to generate summary.";
      res.json({ summary });
    } catch (e: any) {
      console.error("OpenAI error:", e);
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
