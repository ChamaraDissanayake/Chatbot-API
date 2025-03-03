import express from "express";
import cors from "cors";
import { openai, assistantId } from "./config/open-ai.js"; // Import from open-ai.js

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// In-memory storage for thread IDs per user (replace with DB later)
const userThreadMap = {};

app.post("/chat", async (req, res) => {
  try {
    const { userId, userInput } = req.body;

    if (!userId || !userInput) {
      return res.status(400).json({ error: "userId and userInput are required" });
    }

    let threadId = userThreadMap[userId];

    if (!threadId) {
      const thread = await openai.beta.threads.create();
      threadId = thread.id;
      userThreadMap[userId] = threadId;
    }

    await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: userInput,
    });

    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: assistantId,
    });

    let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    while (runStatus.status !== "completed") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    }

    // ✅ Optimized: Fetch only the latest assistant message
    const messages = await openai.beta.threads.messages.list(threadId, { order: "desc", limit: 1 });

    const botResponse = messages.data.length > 0 ? messages.data[0].content[0].text.value : "I'm not sure how to respond.";

    res.json({ botResponse });
  } catch (error) {
    console.error("Error processing chat:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// Endpoint to retrieve full chat history for a user
app.get("/chat/history", async (req, res) => {
  try {
    const { userId, limit = 10, offset = 0 } = req.query;

    // Validate input
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    // Retrieve threadId from memory (replace with DB later)
    const threadId = userThreadMap[userId];

    if (!threadId) {
      return res.status(404).json({ error: "No chat history found for this user" });
    }

    // Fetch messages with pagination (limit + offset)
    const messages = await openai.beta.threads.messages.list(threadId, {
      limit: parseInt(limit) + parseInt(offset), // Fetch extra messages to apply offset
      order: "desc", // Get latest messages first
    });

    // Apply offset manually
    const paginatedMessages = messages.data.slice(offset, offset + parseInt(limit));

    // Format response
    const chatHistory = paginatedMessages.map((msg) => ({
      role: msg.role,
      content: msg.content[0].text.value,
      timestamp: msg.created_at,
    }));

    res.json({ chatHistory });
  } catch (error) {
    console.error("Error retrieving chat history:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});