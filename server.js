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
        [
          "system", 
          `Company: Go Smart Solutions  
          Industry: Technology & Software Solution Provider (UAE & GCC)  

          Core Services:  
          - Custom Software Development (eCommerce, HR, finance, logistics, warehouse, shipping, inventory management, ROAD network recharge, meeting room booking)  
          - AI & Machine Learning (automation, predictive analytics, NLP, computer vision, AI chatbots, AI-powered analytics)  
          - Cloud & SaaS Solutions (multi-tenant SaaS, subscription management, cloud integration, API development)  
          - Cybersecurity (enterprise-grade security solutions, risk assessment, compliance)  
          - Web & Mobile App Development (custom UI/UX, responsive design, CMS, eCommerce platforms, web applications)  
          - Automation & Chatbots (real-time AI-driven chatbots, process automation)  

          Technical Expertise:  
          - Frontend: React, UI/UX, responsive development  
          - Backend: Laravel, API integration, security optimization  
          - Database: SQL optimization, cloud-based architectures  
          - AI & Automation: AI-driven analytics, machine learning, process automation  

          Key Differentiators:  
          - Experienced professionals delivering scalable, secure solutions  
          - AI-powered, automation-driven innovation  
          - Proven track record across industries in UAE & GCC  
          - Customer-centric approach with tailored strategies  

          Location: Alfutaim Office Tower, Day to Day Building, 1st Floor - Office 102, Smart Hub HQ  
          Contact: +971 50 440 6565 | Ibrahim@smartclassic.ae`
        ]
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
