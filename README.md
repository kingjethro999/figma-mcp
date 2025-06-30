# Figma Server - REST API + MCP

A **dual-purpose server** that provides Figma API integration both as a **REST API** (for web apps) and **MCP server** (for AI assistants like Cursor).

## 🚀 Two Servers in One!

### 🌐 **REST API Server** (`server.js`)
- Web interface at `http://localhost:3000`
- REST endpoints like `GET /figma/{fileKey}`
- Perfect for web apps, testing, and Vercel deployment
- **Live Demo:** [figma-mcp-lilac.vercel.app](http://figma-mcp-lilac.vercel.app)

### 🤖 **MCP Server** (`src/index.ts`)
- Direct integration with AI assistants like Cursor
- Uses Model Context Protocol for seamless communication
- Advanced code generation from Figma designs

## Features

Both servers provide the following Figma tools:

- **get_figma_file**: Get complete Figma file data by file key
- **get_figma_file_nodes**: Get specific nodes from a Figma file
- **get_figma_images**: Export images from Figma file nodes
- **get_figma_comments**: Get comments from a Figma file
- **get_figma_node_summary**: Get detailed analysis of a specific node with all properties
- **get_figma_file_overview**: Get a concise overview of a Figma file
- **🚀 generate_code_from_figma_node**: Generate ready-to-use React/Vue/HTML code from a Figma node

### REST API Features
- 🌐 **Web Interface**: User-friendly testing interface at `/`
- 📊 **Request Monitoring**: Real-time request history and performance tracking
- 🔒 **IP Privacy**: Each user only sees their own request history (🔒 padlock for others)
- ⚙️ **Custom API Tokens**: Users can configure their own Figma tokens
- 📈 **Analytics**: Response times, success rates, and error tracking

## Setup

### 1. Get Your Figma Token

1. Go to [Figma Developer Settings](https://www.figma.com/developers/api#access-tokens)
2. Click "Create a new personal access token"
3. Copy the token (you'll need it for configuration)

### 2. Configure Environment

Create a `.env` file in the project root:

```bash
# Required: Figma API Token
FIGMA_TOKEN=your_figma_token_here

# Optional: Supabase for persistent request history
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Note:** If Supabase credentials are not provided, the server will use in-memory storage for request history.

### 3. Install Dependencies

```bash
npm install
```

### 4. Optional: Supabase Database Setup

For persistent request history with IP privacy, you can optionally set up Supabase:

1. Create a [Supabase](https://supabase.com) project
2. Run the SQL schema from `supabase-schema.sql` in your Supabase SQL editor
3. Get your project URL and anon key from Settings > API
4. Add them to your `.env` file

**Benefits of using Supabase:**
- 🔒 **IP Privacy**: Users can only see their own request history
- 📊 **Persistent Storage**: Request history survives server restarts
- 🏗️ **Scalable**: Better performance for high-traffic deployments

## Cursor Configuration

To add this MCP server to Cursor, update your `mcp.json` file (located at `C:\Users\king1\.cursor\mcp.json`):

```json
{
  "mcpServers": {
    "figma": {
      "command": "node",
      "args": ["C:/Users/king1/Desktop/mcp-figma-server/dist/index.js"],
      "env": {
        "FIGMA_TOKEN": "your_actual_figma_token_here"
      }
    }
  }
}
```

**Important**: Replace `your_actual_figma_token_here` with your actual Figma token.

## Usage

Once configured, you can use these tools in Cursor:

### 🚀 Generate Code from Figma (NEW!)
```
Generate a React component from Figma node 1-1085 in file ABC123DEF456
Generate a TypeScript React component named TodoCard from Figma node 1-1085 in file ABC123DEF456
Generate Vue component from Figma node 1-1085 in file ABC123DEF456
Generate HTML/CSS from Figma node 1-1085 in file ABC123DEF456
```

### Get Detailed Node Analysis
```
Get detailed analysis of Figma node 1-1085 from file ABC123DEF456
```

### Get Figma File Data
```
Get the complete data for Figma file with key: ABC123DEF456
```

### Get File Overview
```
Get overview of Figma file ABC123DEF456
```

### Get Specific Nodes
```
Get nodes "1:2,1:3" from Figma file ABC123DEF456
```

### Export Images
```
Export images from nodes "1:2,1:3" in Figma file ABC123DEF456 as PNG at 2x scale
```

### Get Comments
```
Get all comments from Figma file ABC123DEF456
```

## Finding Figma File Keys

The file key is found in the Figma URL:
```
https://www.figma.com/file/ABC123DEF456/My-Design-File
                        ↑
                   This is the file key
```

## Development

### Watch Mode
```bash
npm run dev
```

## 🛠️ Development & Deployment

### **REST API Server** (Default)
```bash
# Start REST API server (http://localhost:3000)
npm start

# Development mode
npm run dev

# Deploy to Vercel (automatic - uses server.js)
```

### **MCP Server** (For Cursor Integration)
```bash
# Build and start MCP server
npm run mcp

# MCP development mode (auto-rebuild)
npm run dev:mcp

# Build MCP only
npm run build:mcp
```

## 🔒 Privacy & Security

### IP-Based Privacy
The request history system implements IP-based privacy:
- ✅ You can see **all details** of your own requests
- 🔒 Other users' requests show as **"🔒 Private"** (padlock icon)
- 📊 This keeps request logs useful while maintaining privacy

### Supabase Schema
The `supabase-schema.sql` file includes:
- Row-level security policies
- Automatic cleanup of old requests (keeps last 1000)
- Efficient indexing for performance
- IP address hashing for enhanced privacy

## Troubleshooting

1. **"FIGMA_TOKEN environment variable is required"**: Make sure you've set your Figma token in the environment variables or `.env` file.

2. **"Figma API error: 403"**: Your Figma token might be invalid or expired. Generate a new one.

3. **"Figma API error: 404"**: The file key might be incorrect or you don't have access to the file.

4. **Supabase connection issues**: Check your `SUPABASE_URL` and `SUPABASE_ANON_KEY` in the `.env` file. The server will fallback to in-memory storage if Supabase fails.

5. **Request history not showing**: If using Supabase, ensure the schema has been properly applied and RLS policies are configured.

## 🎨 Code Generation Features

The `generate_code_from_figma_node` tool automatically converts Figma designs into production-ready code:

### Supported Frameworks
- **React** (`react`) - Standard React components
- **React TypeScript** (`react-ts`) - TypeScript React components with props interface
- **Vue** (`vue`) - Vue.js single file components
- **HTML/CSS** (`html`) - Pure HTML with CSS styles

### What Gets Generated
- ✅ **Exact dimensions** from Figma
- ✅ **Colors** (fills, strokes, backgrounds)
- ✅ **Typography** (font family, size, weight, spacing)
- ✅ **Layout** (flexbox, padding, gaps, alignment)
- ✅ **Border radius** and opacity
- ✅ **Responsive suggestions** for mobile
- ✅ **Clean, readable code** ready to use

### Example Usage in Cursor
```
Generate a React TypeScript component called TodoItem from Figma node 1-1085 in file kgBkWn4JRin8noikesEWuz
```

This will instantly create a complete component with proper styling that matches your Figma design!

## License

ISC 