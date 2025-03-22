import express from "express";
import cors from "cors";
import { openai, assistantId } from "./config/open-ai.js"; // Import from open-ai.js
import db from "./database.js";
import { deleteOldMessages } from "./database.js";

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

    // Retrieve thread from DB if not in memory
    if (!threadId) {
      const thread = db.prepare("SELECT id FROM chat_threads WHERE user_id = ?").get(userId);
      if (thread) {
        threadId = thread.id;
      } else {
        const newThread = await openai.beta.threads.create();
        threadId = newThread.id;
        db.prepare("INSERT INTO chat_threads (id, user_id) VALUES (?, ?)").run(threadId, userId);
      }
      userThreadMap[userId] = threadId;
    }

    // Send user input to OpenAI API
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

    // Fetch latest assistant message
    const messages = await openai.beta.threads.messages.list(threadId, { order: "desc", limit: 1 });
    const botResponse = messages.data.length > 0 ? messages.data[0].content[0].text.value : "I'm not sure how to respond.";

    // Store messages in SQLite
    const insertMessage = db.prepare("INSERT INTO chat_messages (thread_id, role, content) VALUES (?, ?, ?)");
    insertMessage.run(threadId, "user", userInput);
    insertMessage.run(threadId, "assistant", botResponse);

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
    if (!userId) return res.status(400).json({ error: "userId is required" });

    // Get thread ID
    const thread = db.prepare("SELECT id FROM chat_threads WHERE user_id = ?").get(userId);
    if (!thread) return res.status(404).json({ error: "No chat history found" });

    // Fetch messages with pagination
    const messages = db
      .prepare("SELECT role, content, timestamp FROM chat_messages WHERE thread_id = ? ORDER BY id DESC LIMIT ? OFFSET ?")
      .all(thread.id, parseInt(limit), parseInt(offset));

    res.json({ chatHistory: messages });
  } catch (error) {
    console.error("Error retrieving chat history:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// Run cleanup every 24 hours
setInterval(() => {
  console.log("🔄 Running chat history cleanup...");
  deleteOldMessages();
}, 24 * 60 * 60 * 1000); // 24 hours

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});