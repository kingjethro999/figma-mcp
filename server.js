// server.js
require('dotenv').config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());

const PORT = 3000;

// 🔐 Get Figma token from environment variable
const FIGMA_TOKEN = process.env.FIGMA_TOKEN;

// Validate that the token exists
if (!FIGMA_TOKEN) {
  console.error("❌ FIGMA_TOKEN environment variable is not set!");
  console.error("Please create a .env file with: FIGMA_TOKEN=your_token_here");
  process.exit(1);
}

// 🧠 API Endpoint to fetch Figma file
app.get("/figma/:fileKey", async (req, res) => {
  const fileKey = req.params.fileKey;

  try {
    const response = await axios.get(`https://api.figma.com/v1/files/${fileKey}`, {
      headers: {
        "X-Figma-Token": FIGMA_TOKEN,
      },
    });

    res.status(200).json(response.data); // Return the raw Figma data
  } catch (error) {
    console.error("Error fetching from Figma:", error.message);
    res.status(500).json({ error: "Unable to fetch Figma file." });
  }
});

// 🔥 Start server
app.listen(PORT, () => {
  console.log(`MCP Figma Server running at http://localhost:${PORT}`);
});
