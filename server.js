// server.js
require('dotenv').config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.static('public'));
app.use(express.json());

const PORT = process.env.PORT || 3000;

// 🔐 Get Figma token from environment variable
const FIGMA_TOKEN = process.env.FIGMA_TOKEN;

// Validate that the token exists
if (!FIGMA_TOKEN) {
  console.error("❌ FIGMA_TOKEN environment variable is not set!");
  console.error("Please create a .env file with: FIGMA_TOKEN=your_token_here");
  process.exit(1);
}

// In-memory storage for request history (for simple deployment)
let requestHistory = [];

// 🏠 Home page with embedded interface
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>MCP Figma Server</title>
                 <style>
             * {
                 margin: 0;
                 padding: 0;
                 box-sizing: border-box;
             }
             body {
                 font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
                 background: #0d1117;
                 color: #c9d1d9;
                 min-height: 100vh;
                 padding: 20px;
                 line-height: 1.6;
             }
             .container {
                 max-width: 1400px;
                 margin: 0 auto;
                 background: #161b22;
                 border: 1px solid #30363d;
                 border-radius: 6px;
                 overflow: hidden;
                 box-shadow: 0 0 20px rgba(0,0,0,0.5);
             }
             .header {
                 background: #21262d;
                 border-bottom: 1px solid #30363d;
                 padding: 20px 30px;
             }
             .header h1 {
                 font-size: 1.8rem;
                 margin-bottom: 5px;
                 color: #58a6ff;
                 font-weight: 600;
             }
             .header p {
                 color: #8b949e;
                 font-size: 0.9rem;
             }
             .content {
                 padding: 30px;
             }
             .section {
                 margin-bottom: 40px;
             }
             .section h2 {
                 color: #f0f6fc;
                 margin-bottom: 15px;
                 font-size: 1.2rem;
                 font-weight: 600;
                 display: flex;
                 align-items: center;
                 gap: 8px;
             }
             .section h2::before {
                 content: "▶";
                 color: #58a6ff;
                 font-size: 0.8rem;
             }
             .api-form {
                 background: #21262d;
                 border: 1px solid #30363d;
                 padding: 20px;
                 border-radius: 6px;
                 margin-bottom: 20px;
             }
             .form-group {
                 margin-bottom: 15px;
             }
             .form-group label {
                 display: block;
                 margin-bottom: 6px;
                 font-weight: 500;
                 color: #f0f6fc;
                 font-size: 0.9rem;
             }
             .form-group input {
                 width: 100%;
                 padding: 8px 12px;
                 background: #0d1117;
                 border: 1px solid #30363d;
                 border-radius: 6px;
                 color: #c9d1d9;
                 font-family: inherit;
                 font-size: 14px;
                 transition: border-color 0.2s;
             }
             .form-group input:focus {
                 outline: none;
                 border-color: #58a6ff;
                 box-shadow: 0 0 0 3px rgba(88, 166, 255, 0.1);
             }
             .form-group input::placeholder {
                 color: #6e7681;
             }
             .btn {
                 background: #238636;
                 color: white;
                 padding: 8px 16px;
                 border: none;
                 border-radius: 6px;
                 font-size: 14px;
                 font-weight: 500;
                 cursor: pointer;
                 font-family: inherit;
                 transition: background-color 0.2s;
             }
             .btn:hover {
                 background: #2ea043;
             }
             .btn.secondary {
                 background: #21262d;
                 border: 1px solid #30363d;
                 color: #c9d1d9;
             }
             .btn.secondary:hover {
                 background: #30363d;
             }
             .table-container {
                 overflow-x: auto;
                 border: 1px solid #30363d;
                 border-radius: 6px;
                 background: #0d1117;
             }
             table {
                 width: 100%;
                 border-collapse: collapse;
             }
             th, td {
                 padding: 12px 16px;
                 text-align: left;
                 border-bottom: 1px solid #21262d;
                 font-size: 13px;
             }
             th {
                 background: #161b22;
                 font-weight: 600;
                 color: #f0f6fc;
                 border-bottom: 1px solid #30363d;
             }
             tr:hover {
                 background: #161b22;
             }
             .status-success {
                 color: #3fb950;
                 font-weight: 600;
             }
             .status-error {
                 color: #f85149;
                 font-weight: 600;
             }
             .timestamp {
                 color: #8b949e;
                 font-size: 12px;
             }
             .refresh-btn {
                 float: right;
                 margin-bottom: 15px;
             }
             .endpoint-info {
                 background: #0d1117;
                 border: 1px solid #30363d;
                 border-left: 3px solid #58a6ff;
                 padding: 16px;
                 border-radius: 6px;
                 font-size: 13px;
             }
             .endpoint-info code {
                 background: #21262d;
                 color: #79c0ff;
                 padding: 2px 6px;
                 border-radius: 3px;
                 font-family: inherit;
                 font-size: 12px;
             }
             .endpoint-info p {
                 margin-bottom: 8px;
             }
             .endpoint-info p:last-child {
                 margin-bottom: 0;
             }
             .no-data {
                 text-align: center;
                 color: #6e7681;
                 font-style: italic;
                 padding: 20px;
             }
             .file-key {
                 font-family: inherit;
                 color: #79c0ff;
                 background: #21262d;
                 padding: 2px 4px;
                 border-radius: 3px;
                 font-size: 12px;
             }
             .response-time {
                 color: #a5a5a5;
             }
             .ip-address {
                 color: #8b949e;
                 font-size: 12px;
             }
         </style>
    </head>
    <body>
                 <div class="container">
             <div class="header">
                 <h1>figma-mcp-server</h1>
                 <p>REST API proxy for Figma with request monitoring</p>
             </div>
             
             <div class="content">
                 <div class="section">
                     <h2>API Documentation</h2>
                     <div class="endpoint-info">
                         <p><strong>GET</strong> <code>/figma/{fileKey}</code></p>
                         <p><strong>Base URL:</strong> <code>${req.protocol}://${req.get('host')}</code></p>
                         <p><strong>Headers:</strong> Content-Type: application/json</p>
                         <p><strong>Auth:</strong> Figma token configured server-side</p>
                     </div>
                 </div>
 
                 <div class="section">
                     <h2>API Testing</h2>
                     <div class="api-form">
                         <div class="form-group">
                             <label for="fileKey">fileKey (string):</label>
                             <input type="text" id="fileKey" placeholder="e.g., ABC123DEF456" />
                         </div>
                         <button class="btn" onclick="testAPI()">SEND REQUEST</button>
                     </div>
                 </div>
 
                 <div class="section">
                     <h2>Request Logs</h2>
                     <button class="btn secondary refresh-btn" onclick="refreshHistory()">REFRESH</button>
                     <div class="table-container">
                         <table id="historyTable">
                             <thead>
                                 <tr>
                                     <th>TIMESTAMP</th>
                                     <th>FILE_KEY</th>
                                     <th>STATUS</th>
                                     <th>LATENCY</th>
                                     <th>CLIENT_IP</th>
                                 </tr>
                             </thead>
                             <tbody id="historyBody">
                                 <tr>
                                     <td colspan="5" class="no-data">No requests logged</td>
                                 </tr>
                             </tbody>
                         </table>
                     </div>
                 </div>
             </div>
         </div>

        <script>
                         async function testAPI() {
                 const fileKey = document.getElementById('fileKey').value.trim();
                 if (!fileKey) {
                     console.error('[ERROR] fileKey parameter required');
                     return;
                 }
 
                 console.log(\`[REQUEST] GET /figma/\${fileKey}\`);
                 
                 try {
                     const response = await fetch(\`/figma/\${fileKey}\`);
                     const data = await response.json();
                     
                     if (response.ok) {
                         console.log(\`[SUCCESS] Status: \${response.status}\`);
                         console.log('[RESPONSE]', data);
                     } else {
                         console.error(\`[ERROR] Status: \${response.status}\`);
                         console.error('[ERROR_DETAILS]', data);
                     }
                 } catch (error) {
                     console.error(\`[NETWORK_ERROR] \${error.message}\`);
                 }
                 
                 // Refresh logs after API call
                 setTimeout(refreshHistory, 500);
             }

             async function refreshHistory() {
                 try {
                     const response = await fetch('/api/history');
                     const history = await response.json();
                     
                     const tbody = document.getElementById('historyBody');
                     
                     if (history.length === 0) {
                         tbody.innerHTML = '<tr><td colspan="5" class="no-data">No requests logged</td></tr>';
                         return;
                     }
                     
                     tbody.innerHTML = history.map(req => \`
                         <tr>
                             <td class="timestamp">\${new Date(req.timestamp).toISOString()}</td>
                             <td class="file-key">\${req.fileKey}</td>
                             <td class="\${req.status === 'success' ? 'status-success' : 'status-error'}">\${req.status.toUpperCase()}</td>
                             <td class="response-time">\${req.responseTime}ms</td>
                             <td class="ip-address">\${req.ip}</td>
                         </tr>
                     \`).join('');
                 } catch (error) {
                     console.error('[ERROR] Failed to refresh logs:', error);
                 }
             }

            // Auto-refresh history every 30 seconds
            setInterval(refreshHistory, 30000);
            
            // Load history on page load
            refreshHistory();
        </script>
    </body>
    </html>
  `);
});

// 📊 API endpoint to get request history
app.get("/api/history", (req, res) => {
  res.json(requestHistory.slice(-50)); // Return last 50 requests
});

// 🧠 API Endpoint to fetch Figma file with history tracking
app.get("/figma/:fileKey", async (req, res) => {
  const fileKey = req.params.fileKey;
  const startTime = Date.now();
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

  try {
    const response = await axios.get(`https://api.figma.com/v1/files/${fileKey}`, {
      headers: {
        "X-Figma-Token": FIGMA_TOKEN,
      },
    });

    const responseTime = Date.now() - startTime;

    // Log successful request
    requestHistory.push({
      timestamp: new Date().toISOString(),
      fileKey: fileKey,
      status: 'success',
      responseTime: responseTime,
      ip: clientIP
    });

    // Keep only last 100 requests to prevent memory issues
    if (requestHistory.length > 100) {
      requestHistory = requestHistory.slice(-100);
    }

    res.status(200).json(response.data);
  } catch (error) {
    const responseTime = Date.now() - startTime;

    // Log failed request
    requestHistory.push({
      timestamp: new Date().toISOString(),
      fileKey: fileKey,
      status: 'error',
      responseTime: responseTime,
      ip: clientIP,
      error: error.message
    });

    // Keep only last 100 requests
    if (requestHistory.length > 100) {
      requestHistory = requestHistory.slice(-100);
    }

    console.error("Error fetching from Figma:", error.message);
    res.status(500).json({ error: "Unable to fetch Figma file." });
  }
});

// 🔥 Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`MCP Figma Server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
