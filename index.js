import openai from "./config/open-ai.js";
import express from "express";
import cors from "cors";

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// In-memory chat history per user
const chatHistoryMap = {};

app.post("/chat", async (req, res) => {
  try {
    const { userId, userInput } = req.body;

    // Initialize chat history with strict guidelines
    if (!chatHistoryMap[userId]) {
      chatHistoryMap[userId] = [
        ["system",
          `Company: Go Smart Solutions  
          Industry: Technology & Software (UAE & GCC)  

          Services:  
          - Custom Software (eCommerce, HR, finance, logistics, warehouse, shipping, inventory, ROAD recharge, meeting room booking)  
          - AI & Machine Learning (automation, predictive analytics, NLP, computer vision, AI chatbots, analytics)  
          - Cloud & SaaS (multi-tenant SaaS, subscriptions, cloud integration, APIs)  
          - Cybersecurity (enterprise security, risk assessment, compliance)  
          - Web & Mobile Apps (custom UI/UX, responsive design, CMS, eCommerce, web apps)  
          - Automation & Chatbots (real-time AI chatbots, process automation)  

          Expertise:  
          - Frontend: React, UI/UX, responsive design  
          - Backend: Laravel, APIs, security  
          - Database: SQL optimization, cloud-based architectures  
          - AI & Automation: AI-driven analytics, ML, automation  

          Strengths:  
          - Scalable, secure solutions by experienced professionals  
          - AI-driven innovation  
          - Proven track record across UAE & GCC  
          - Customer-centric, tailored strategies  

          Location: Alfutaim Office Tower, Day to Day Building, 1st Floor - Office 102, Smart Hub HQ  
          Contact: +971 50 440 6565 | Ibrahim@smartclassic.ae  

          Guidelines:  
          - Answer only about Go Smart Solutions like services, locations, contact etc.  
          - Keep responses short and direct (max 2 sentences).`
        ]
      ];
    }

    const chatHistory = chatHistoryMap[userId];

    // Prepare messages for OpenAI API
    const messages = chatHistory.map(([role, content]) => ({ role, content }));
    messages.push({ role: "user", content: userInput });

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages
    });

    const botResponse = completion.choices[0].message.content.trim();

    // Store chat history
    chatHistory.push(["user", userInput]);
    chatHistory.push(["assistant", botResponse]);

    // Keep history manageable: Remove old user & assistant messages but **keep system message**
    if (chatHistory.length > 10) {
      chatHistory.splice(1, chatHistory.length - 9); // Keeps system message at index 0
    }

    res.json({ botResponse });
  } catch (error) {
    console.error("Error processing chat:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
