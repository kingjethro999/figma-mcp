// server.js
require('dotenv').config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const path = require("path");
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.static('public'));
app.use(express.json());

const PORT = process.env.PORT || 3000;

// 🔐 Get environment variables
const FIGMA_TOKEN = process.env.FIGMA_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Validate that required environment variables exist
if (!FIGMA_TOKEN) {
  console.error("❌ FIGMA_TOKEN environment variable is not set!");
  console.error("Please create a .env file with: FIGMA_TOKEN=your_token_here");
  process.exit(1);
}

// Initialize Supabase client (optional - falls back to in-memory if not configured)
let supabase = null;
let useDatabase = false;

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    useDatabase = true;
    console.log("✅ Supabase connected - using database for request history");
  } catch (error) {
    console.error("❌ Supabase connection failed:", error.message);
    console.log("📦 Falling back to in-memory storage");
  }
} else {
  console.log("📦 Using in-memory storage for request history");
}

// Fallback in-memory storage
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
                     <h2>🔑 API Configuration</h2>
                     <div class="api-form">
                         <div class="form-group">
                             <label for="customApiKey">Your Figma API Token (Optional):</label>
                             <input type="password" id="customApiKey" placeholder="figd_..." />
                             <small style="color: #8b949e; font-size: 12px; margin-top: 4px; display: block;">
                                 📖 <a href="https://www.figma.com/developers/api#access-tokens" target="_blank" style="color: #58a6ff;">How to get your Figma API token</a>
                             </small>
                         </div>
                         <div class="form-group">
                             <label for="customFileKey">File Key (Optional):</label>
                             <input type="text" id="customFileKey" placeholder="ABC123DEF456" />
                             <small style="color: #8b949e; font-size: 12px; margin-top: 4px; display: block;">
                                 💡 <strong>How to find File Key:</strong> From your Figma URL: <code>figma.com/file/<span style="color: #58a6ff;">ABC123DEF456</span>/Your-File-Name</code>
                             </small>
                         </div>
                         <button class="btn secondary" onclick="saveApiConfig()">💾 Save Configuration</button>
                         <button class="btn secondary" onclick="clearApiConfig()">🗑️ Clear</button>
                     </div>
                 </div>
 
                 <div class="section">
                     <h2>API Documentation</h2>
                     <div class="endpoint-info">
                         <p><strong>GET</strong> <code>/figma/{fileKey}</code></p>
                         <p><strong>Base URL:</strong> <code>${req.protocol}://${req.get('host')}</code></p>
                         <p><strong>Headers:</strong> Content-Type: application/json</p>
                         <p><strong>Auth:</strong> <span id="authStatus">Figma token configured server-side</span></p>
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
                     
                     <div class="table-container">
                         <table id="historyTable">
                             <thead>
                                 <tr>
                                     <th>TIMESTAMP</th>
                                     <th>FILE_KEY</th>
                                     <th>STATUS</th>
                                     <th>LATENCY</th>
                                     <th>CLIENT_IP</th>
                                     <th><button class="btn secondary refresh-btn" onclick="refreshHistory()">REFRESH</button></th>
                                 </tr>
                             </thead>
                             <tbody id="historyBody">
                                 <tr>
                                     <td colspan="6" class="no-data">No requests logged</td>
                                 </tr>
                             </tbody>
                         </table>
                     </div>
                 </div>
             </div>
         </div>

        <script>
            // Load saved configuration on page load
            function loadApiConfig() {
                const savedApiKey = localStorage.getItem('figma_api_key');
                const savedFileKey = localStorage.getItem('figma_file_key');
                
                if (savedApiKey) {
                    document.getElementById('customApiKey').value = savedApiKey;
                    document.getElementById('authStatus').textContent = 'Using your custom API token';
                    document.getElementById('authStatus').style.color = '#3fb950';
                }
                
                if (savedFileKey) {
                    document.getElementById('customFileKey').value = savedFileKey;
                    document.getElementById('fileKey').value = savedFileKey;
                }
            }
            
            function saveApiConfig() {
                const apiKey = document.getElementById('customApiKey').value.trim();
                const fileKey = document.getElementById('customFileKey').value.trim();
                
                if (apiKey) {
                    localStorage.setItem('figma_api_key', apiKey);
                    document.getElementById('authStatus').textContent = 'Using your custom API token';
                    document.getElementById('authStatus').style.color = '#3fb950';
                    console.log('[CONFIG] ✅ Custom API key saved');
                }
                
                if (fileKey) {
                    localStorage.setItem('figma_file_key', fileKey);
                    document.getElementById('fileKey').value = fileKey;
                    console.log('[CONFIG] ✅ Custom file key saved and applied');
                }
                
                if (!apiKey && !fileKey) {
                    console.log('[CONFIG] ⚠️ No configuration provided');
                    return;
                }
                
                console.log('[CONFIG] 🎉 Configuration saved successfully!');
            }
            
            function clearApiConfig() {
                localStorage.removeItem('figma_api_key');
                localStorage.removeItem('figma_file_key');
                document.getElementById('customApiKey').value = '';
                document.getElementById('customFileKey').value = '';
                document.getElementById('fileKey').value = '';
                document.getElementById('authStatus').textContent = 'Figma token configured server-side';
                document.getElementById('authStatus').style.color = '#c9d1d9';
                console.log('[CONFIG] 🗑️ Configuration cleared');
            }

            async function testAPI() {
                const fileKey = document.getElementById('fileKey').value.trim();
                if (!fileKey) {
                    console.error('[ERROR] fileKey parameter required');
                    return;
                }

                console.log(\`[REQUEST] GET /figma/\${fileKey}\`);
                
                // Check if user has custom API key
                const customApiKey = localStorage.getItem('figma_api_key');
                const headers = { 'Content-Type': 'application/json' };
                
                if (customApiKey) {
                    headers['X-Custom-Figma-Token'] = customApiKey;
                    console.log('[REQUEST] Using custom API token');
                }
                
                try {
                    const response = await fetch(\`/figma/\${fileKey}\`, { headers });
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
                         tbody.innerHTML = '<tr><td colspan="6" class="no-data">No requests logged</td></tr>';
                         return;
                     }
                     
                     tbody.innerHTML = history.map(req => \`
                         <tr \${req.private ? 'style="opacity: 0.6;"' : ''}>
                             <td class="timestamp">\${new Date(req.timestamp).toISOString()}</td>
                             <td class="file-key">\${req.fileKey}</td>
                             <td class="\${req.status === 'success' ? 'status-success' : 'status-error'}">\${req.status.toUpperCase()}</td>
                             <td class="response-time">\${req.responseTime}ms</td>
                             <td class="ip-address">\${req.ip === '🔒' ? '<span style="color: #8b949e;">🔒 Private</span>' : req.ip}</td>
                             <td></td>
                         </tr>
                     \`).join('');
                 } catch (error) {
                     console.error('[ERROR] Failed to refresh logs:', error);
                 }
             }

            // Auto-refresh history every 30 seconds
            setInterval(refreshHistory, 30000);
            
            // Load configuration and history on page load
            loadApiConfig();
            refreshHistory();
        </script>
    </body>
    </html>
  `);
});

// 📊 API endpoint to get request history (IP-filtered)
app.get("/api/history", async (req, res) => {
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  
  try {
    if (useDatabase && supabase) {
      // Get requests from database
      const { data, error } = await supabase
        .from('figma_requests')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Supabase query error:', error);
        // Fallback to in-memory
        return res.json(requestHistory.slice(-50).map(req => 
          req.ip === clientIP ? req : { ...req, ip: '🔒', private: true }
        ));
      }

      // Filter and format requests for IP privacy
      const formattedRequests = data.map(dbReq => ({
        timestamp: dbReq.timestamp,
        fileKey: dbReq.file_key,
        status: dbReq.status,
        responseTime: dbReq.response_time,
        ip: dbReq.ip_address === clientIP ? dbReq.ip_address : '🔒',
        private: dbReq.ip_address !== clientIP,
        error: dbReq.ip_address === clientIP ? dbReq.error_message : undefined
      }));

      res.json(formattedRequests);
    } else {
      // Use in-memory storage with IP filtering
      const filteredHistory = requestHistory.slice(-50).map(req => 
        req.ip === clientIP ? req : { ...req, ip: '🔒', private: true }
      );
      res.json(filteredHistory);
    }
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch request history' });
  }
});

// 🧠 API Endpoint to fetch Figma file with history tracking
app.get("/figma/:fileKey", async (req, res) => {
  const fileKey = req.params.fileKey;
  const startTime = Date.now();
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

  // Check for custom API token from client
  const customToken = req.headers['x-custom-figma-token'];
  const apiToken = customToken || FIGMA_TOKEN;

  if (!apiToken) {
    const responseTime = Date.now() - startTime;
    await logRequest({
      timestamp: new Date().toISOString(),
      fileKey: fileKey,
      status: 'error',
      responseTime: responseTime,
      ip: clientIP,
      error: 'No API token available',
      userAgent: req.get('User-Agent') || 'unknown'
    });
    
    return res.status(400).json({ 
      error: "No Figma API token available. Please provide one in the configuration above." 
    });
  }

  try {
    const response = await axios.get(`https://api.figma.com/v1/files/${fileKey}`, {
      headers: {
        "X-Figma-Token": apiToken,
      },
    });

    const responseTime = Date.now() - startTime;

    // Log successful request
    await logRequest({
      timestamp: new Date().toISOString(),
      fileKey: fileKey,
      status: 'success',
      responseTime: responseTime,
      ip: clientIP,
      userAgent: req.get('User-Agent') || 'unknown'
    });

    res.status(200).json(response.data);
  } catch (error) {
    const responseTime = Date.now() - startTime;

    // Log failed request
    await logRequest({
      timestamp: new Date().toISOString(),
      fileKey: fileKey,
      status: 'error',
      responseTime: responseTime,
      ip: clientIP,
      error: error.message,
      userAgent: req.get('User-Agent') || 'unknown'
    });

    console.error("Error fetching from Figma:", error.message);
    res.status(500).json({ error: "Unable to fetch Figma file." });
  }
});

// 📝 Helper function to log requests
async function logRequest(requestData) {
  if (useDatabase && supabase) {
    try {
      const { error } = await supabase
        .from('figma_requests')
        .insert([{
          timestamp: requestData.timestamp,
          file_key: requestData.fileKey,
          status: requestData.status,
          response_time: requestData.responseTime,
          ip_address: requestData.ip,
          error_message: requestData.error || null,
          user_agent: requestData.userAgent
        }]);

      if (error) {
        console.error('Supabase insert error:', error);
        // Fallback to in-memory
        requestHistory.push(requestData);
        if (requestHistory.length > 100) {
          requestHistory = requestHistory.slice(-100);
        }
      }
    } catch (error) {
      console.error('Database logging failed:', error);
      // Fallback to in-memory
      requestHistory.push(requestData);
      if (requestHistory.length > 100) {
        requestHistory = requestHistory.slice(-100);
      }
    }
  } else {
    // Use in-memory storage
    requestHistory.push(requestData);
    if (requestHistory.length > 100) {
      requestHistory = requestHistory.slice(-100);
    }
  }
}

// 🔥 Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`MCP Figma Server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
