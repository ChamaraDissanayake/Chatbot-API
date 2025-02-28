import openai from "./config/open-ai.js";
import express from "express";
import cors from 'cors';

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// In-memory storage of chat history (this can be enhanced with a database for persistence)
const chatHistoryMap = {};

app.post("/chat", async (req, res) => {
  try {
    const { userId, userInput } = req.body;

    // Retrieve or initialize chat history for the user
    if (!chatHistoryMap[userId]) {
      chatHistoryMap[userId] = [
        // Add a system message to guide the bot's behavior for the session
        ["system", `You are an AI assistant for XYZ Corporation.

        Company Overview:
        - XYZ Corporation specializes in providing software solutions and visa-related services.
        - Branches: Dubai, Sharjah, and Abu Dhabi.
        - Employee Count: 50 staff members.
        - Services: Visa processing, renewals, cancellations, and general consulting.

        Key Information:
        - Refund Policy: Customers can request a refund within 30 days of purchase under certain conditions.
        - Customer Support: Available 24/7 via our website or helpline.
        - Premium Plans: Include priority visa services, analytics, and extended support.

        Guidelines for responses:
        - Provide short, direct answers (no more than 2 sentences).
        - Do not include greetings in responses.`]
      ];
    }
    const chatHistory = chatHistoryMap[userId];

    // Prepare messages array for the OpenAI API
    const messages = chatHistory.map(([role, content]) => ({
      role,
      content,
    }));
    messages.push({ role: "user", content: userInput });

    // Call OpenAI API to get a response
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages,
    });

    const botResponse = completion.choices[0].message.content;

    // Add user input and bot response to chat history
    chatHistory.push(["user", userInput]);
    chatHistory.push(["assistant", botResponse]);

    // Respond with the bot's message
    res.json({ botResponse });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
