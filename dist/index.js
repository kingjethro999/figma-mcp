#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
const FIGMA_TOKEN = process.env.FIGMA_TOKEN;
if (!FIGMA_TOKEN) {
    console.error('FIGMA_TOKEN environment variable is required');
    process.exit(1);
}
class FigmaMCPServer {
    constructor() {
        this.server = new index_js_1.Server({
            name: 'figma-mcp-server',
            version: '1.0.0',
        }, {
            capabilities: {
                tools: {},
            },
        });
        this.setupToolHandlers();
        this.setupErrorHandling();
    }
    setupErrorHandling() {
        this.server.onerror = (error) => {
            console.error('[MCP Error]', error);
        };
        process.on('SIGINT', async () => {
            await this.server.close();
            process.exit(0);
        });
    }
    // Helper function to normalize node IDs
    normalizeNodeId(nodeId) {
        // Handle different node ID formats
        // Convert "1-1085" to "1:1085" if needed
        if (nodeId.includes('-') && !nodeId.includes(':')) {
            const parts = nodeId.split('-');
            if (parts.length === 2 && !isNaN(Number(parts[0])) && !isNaN(Number(parts[1]))) {
                return `${parts[0]}:${parts[1]}`;
            }
        }
        return nodeId;
    }
    // Helper function to encode node IDs for API calls
    encodeNodeId(nodeId) {
        const normalized = this.normalizeNodeId(nodeId);
        return encodeURIComponent(normalized);
    }
    setupToolHandlers() {
        // List available tools
        this.server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
            return {
                tools: [
                    {
                        name: 'get_figma_file',
                        description: 'Get Figma file data by file key',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                fileKey: {
                                    type: 'string',
                                    description: 'The Figma file key (found in the Figma URL)',
                                },
                            },
                            required: ['fileKey'],
                        },
                    },
                    {
                        name: 'get_figma_file_nodes',
                        description: 'Get specific nodes from a Figma file',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                fileKey: {
                                    type: 'string',
                                    description: 'The Figma file key',
                                },
                                nodeIds: {
                                    type: 'array',
                                    items: { type: 'string' },
                                    description: 'Array of node IDs to fetch (format: "1:1085" or "1-1085")',
                                },
                            },
                            required: ['fileKey', 'nodeIds'],
                        },
                    },
                    {
                        name: 'get_figma_images',
                        description: 'Export images from Figma file nodes',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                fileKey: {
                                    type: 'string',
                                    description: 'The Figma file key',
                                },
                                nodeIds: {
                                    type: 'array',
                                    items: { type: 'string' },
                                    description: 'Array of node IDs to export as images',
                                },
                                format: {
                                    type: 'string',
                                    enum: ['jpg', 'png', 'svg', 'pdf'],
                                    default: 'png',
                                    description: 'Image export format',
                                },
                                scale: {
                                    type: 'number',
                                    default: 1,
                                    description: 'Image scale factor (1-4)',
                                },
                            },
                            required: ['fileKey', 'nodeIds'],
                        },
                    },
                    {
                        name: 'get_figma_comments',
                        description: 'Get comments from a Figma file',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                fileKey: {
                                    type: 'string',
                                    description: 'The Figma file key',
                                },
                            },
                            required: ['fileKey'],
                        },
                    },
                    {
                        name: 'get_figma_node_summary',
                        description: 'Get raw Figma node data without interpretation (prevents AI assumptions)',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                fileKey: {
                                    type: 'string',
                                    description: 'The Figma file key',
                                },
                                nodeId: {
                                    type: 'string',
                                    description: 'Single node ID to get detailed summary for (format: "1:1085" or "1-1085")',
                                },
                            },
                            required: ['fileKey', 'nodeId'],
                        },
                    },
                    {
                        name: 'get_figma_file_overview',
                        description: 'Get a concise overview of a Figma file (no overwhelming JSON)',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                fileKey: {
                                    type: 'string',
                                    description: 'The Figma file key',
                                },
                            },
                            required: ['fileKey'],
                        },
                    },
                    {
                        name: 'generate_code_from_figma_node',
                        description: 'Generate ready-to-use React/Vue/HTML code from a Figma node',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                fileKey: {
                                    type: 'string',
                                    description: 'The Figma file key',
                                },
                                nodeId: {
                                    type: 'string',
                                    description: 'Node ID to generate code for (format: "1:1085" or "1-1085")',
                                },
                                framework: {
                                    type: 'string',
                                    enum: ['react', 'vue', 'html', 'react-ts'],
                                    default: 'react',
                                    description: 'Framework to generate code for',
                                },
                                componentName: {
                                    type: 'string',
                                    description: 'Name for the generated component (optional)',
                                },
                            },
                            required: ['fileKey', 'nodeId'],
                        },
                    },
                ],
            };
        });
        // Handle tool calls
        this.server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            if (!args || typeof args !== 'object') {
                throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, 'Invalid or missing arguments');
            }
            try {
                switch (name) {
                    case 'get_figma_file':
                        const fileArgs = args;
                        return await this.getFigmaFile(fileArgs.fileKey);
                    case 'get_figma_file_nodes':
                        const nodeArgs = args;
                        return await this.getFigmaFileNodes(nodeArgs.fileKey, nodeArgs.nodeIds);
                    case 'get_figma_images':
                        const imageArgs = args;
                        return await this.getFigmaImages(imageArgs.fileKey, imageArgs.nodeIds, imageArgs.format || 'png', imageArgs.scale || 1);
                    case 'get_figma_comments':
                        const commentArgs = args;
                        return await this.getFigmaComments(commentArgs.fileKey);
                    case 'get_figma_node_summary':
                        const summaryArgs = args;
                        return await this.getFigmaNodeSummary(summaryArgs.fileKey, summaryArgs.nodeId);
                    case 'get_figma_file_overview':
                        const overviewArgs = args;
                        return await this.getFigmaFileOverview(overviewArgs.fileKey);
                    case 'generate_code_from_figma_node':
                        const codeArgs = args;
                        return await this.generateCodeFromFigmaNode(codeArgs.fileKey, codeArgs.nodeId, codeArgs.framework || 'react', codeArgs.componentName);
                    default:
                        throw new types_js_1.McpError(types_js_1.ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
                }
            }
            catch (error) {
                if (error instanceof types_js_1.McpError) {
                    throw error;
                }
                const errorMessage = error instanceof Error ? error.message : String(error);
                throw new types_js_1.McpError(types_js_1.ErrorCode.InternalError, `Tool execution failed: ${errorMessage}`);
            }
        });
    }
    async getFigmaFile(fileKey) {
        try {
            const response = await axios_1.default.get(`https://api.figma.com/v1/files/${fileKey}`, {
                headers: {
                    'X-Figma-Token': FIGMA_TOKEN,
                },
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: `Figma file data retrieved successfully for file: ${fileKey}`,
                    },
                    {
                        type: 'text',
                        text: JSON.stringify(response.data, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                throw new types_js_1.McpError(types_js_1.ErrorCode.InternalError, `Figma API error: ${error.response?.status} ${error.response?.statusText}`);
            }
            throw error;
        }
    }
    async getFigmaFileNodes(fileKey, nodeIds) {
        try {
            // Normalize and encode node IDs
            const normalizedNodeIds = nodeIds.map(id => this.encodeNodeId(id));
            const nodeIdsParam = normalizedNodeIds.join(',');
            console.error(`Fetching nodes: ${nodeIdsParam} for file: ${fileKey}`);
            const response = await axios_1.default.get(`https://api.figma.com/v1/files/${fileKey}/nodes?ids=${nodeIdsParam}`, {
                headers: {
                    'X-Figma-Token': FIGMA_TOKEN,
                },
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: `Figma file nodes retrieved successfully for file: ${fileKey}`,
                    },
                    {
                        type: 'text',
                        text: JSON.stringify(response.data, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                throw new types_js_1.McpError(types_js_1.ErrorCode.InternalError, `Figma API error: ${error.response?.status} ${error.response?.statusText}. Response: ${JSON.stringify(error.response?.data)}`);
            }
            throw error;
        }
    }
    async getFigmaImages(fileKey, nodeIds, format = 'png', scale = 1) {
        try {
            // Normalize and encode node IDs
            const normalizedNodeIds = nodeIds.map(id => this.encodeNodeId(id));
            const nodeIdsParam = normalizedNodeIds.join(',');
            const response = await axios_1.default.get(`https://api.figma.com/v1/images/${fileKey}?ids=${nodeIdsParam}&format=${format}&scale=${scale}`, {
                headers: {
                    'X-Figma-Token': FIGMA_TOKEN,
                },
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: `Figma images exported successfully for file: ${fileKey}`,
                    },
                    {
                        type: 'text',
                        text: JSON.stringify(response.data, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                throw new types_js_1.McpError(types_js_1.ErrorCode.InternalError, `Figma API error: ${error.response?.status} ${error.response?.statusText}`);
            }
            throw error;
        }
    }
    async getFigmaComments(fileKey) {
        try {
            const response = await axios_1.default.get(`https://api.figma.com/v1/files/${fileKey}/comments`, {
                headers: {
                    'X-Figma-Token': FIGMA_TOKEN,
                },
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: `Figma comments retrieved successfully for file: ${fileKey}`,
                    },
                    {
                        type: 'text',
                        text: JSON.stringify(response.data, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                throw new types_js_1.McpError(types_js_1.ErrorCode.InternalError, `Figma API error: ${error.response?.status} ${error.response?.statusText}`);
            }
            throw error;
        }
    }
    async getFigmaNodeSummary(fileKey, nodeId) {
        try {
            // Normalize and encode the node ID
            const normalizedNodeId = this.encodeNodeId(nodeId);
            console.error(`Fetching raw node data: ${normalizedNodeId} for file: ${fileKey}`);
            const response = await axios_1.default.get(`https://api.figma.com/v1/files/${fileKey}/nodes?ids=${normalizedNodeId}`, {
                headers: {
                    'X-Figma-Token': FIGMA_TOKEN,
                },
            });
            // Try to find the node with the original ID or normalized ID
            const originalNodeId = this.normalizeNodeId(nodeId);
            const nodeData = response.data.nodes[originalNodeId] || response.data.nodes[nodeId];
            if (!nodeData) {
                throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, `Node ${nodeId} (normalized: ${originalNodeId}) not found. Available nodes: ${Object.keys(response.data.nodes).join(', ')}`);
            }
            // Return RAW Figma data without interpretation
            return {
                content: [
                    {
                        type: 'text',
                        text: `📄 **Raw Figma Node Data for ${nodeId}**\n\n` +
                            `**Node ID:** ${nodeId} (normalized: ${originalNodeId})\n` +
                            `**File Key:** ${fileKey}\n\n` +
                            `**RAW DATA:**\n\`\`\`json\n${JSON.stringify(nodeData.document, null, 2)}\n\`\`\``,
                    },
                ],
            };
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                throw new types_js_1.McpError(types_js_1.ErrorCode.InternalError, `Figma API error: ${error.response?.status} ${error.response?.statusText}. Response: ${JSON.stringify(error.response?.data)}`);
            }
            throw error;
        }
    }
    async getFigmaFileOverview(fileKey) {
        try {
            const response = await axios_1.default.get(`https://api.figma.com/v1/files/${fileKey}`, {
                headers: {
                    'X-Figma-Token': FIGMA_TOKEN,
                },
            });
            const file = response.data;
            const document = file.document;
            // Count elements
            const pageCount = document.children ? document.children.length : 0;
            let totalFrames = 0;
            let totalComponents = 0;
            if (document.children) {
                document.children.forEach((page) => {
                    if (page.children) {
                        page.children.forEach((child) => {
                            if (child.type === 'FRAME')
                                totalFrames++;
                            if (child.type === 'COMPONENT')
                                totalComponents++;
                        });
                    }
                });
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `📄 **Figma File Overview**\n\n` +
                            `**Name:** ${file.name}\n` +
                            `**Last Modified:** ${new Date(file.lastModified).toLocaleString()}\n` +
                            `**Version:** ${file.version}\n` +
                            `**Pages:** ${pageCount}\n` +
                            `**Total Frames:** ${totalFrames}\n` +
                            `**Components:** ${totalComponents}\n` +
                            `**File Key:** ${fileKey}\n\n` +
                            `**Pages:**\n` +
                            (document.children ?
                                document.children.map((page, i) => `  ${i + 1}. ${page.name || 'Unnamed Page'} (${page.children ? page.children.length : 0} items)`).join('\n') :
                                'No pages found'),
                    },
                ],
            };
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                throw new types_js_1.McpError(types_js_1.ErrorCode.InternalError, `Figma API error: ${error.response?.status} ${error.response?.statusText}`);
            }
            throw error;
        }
    }
    async generateCodeFromFigmaNode(fileKey, nodeId, framework = 'react', componentName) {
        try {
            // Normalize and encode the node ID
            const normalizedNodeId = this.encodeNodeId(nodeId);
            const response = await axios_1.default.get(`https://api.figma.com/v1/files/${fileKey}/nodes?ids=${normalizedNodeId}`, {
                headers: {
                    'X-Figma-Token': FIGMA_TOKEN,
                },
            });
            // Try to find the node with the original ID or normalized ID
            const originalNodeId = this.normalizeNodeId(nodeId);
            const nodeData = response.data.nodes[originalNodeId] || response.data.nodes[nodeId];
            if (!nodeData) {
                throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, `Node ${nodeId} not found`);
            }
            const node = nodeData.document;
            const name = componentName || node.name?.replace(/[^a-zA-Z0-9]/g, '') || 'FigmaComponent';
            // Helper functions for code generation
            const formatColor = (color) => {
                if (!color)
                    return 'transparent';
                if (color.r !== undefined) {
                    const r = Math.round(color.r * 255);
                    const g = Math.round(color.g * 255);
                    const b = Math.round(color.b * 255);
                    const a = color.a !== undefined ? color.a : 1;
                    return a < 1 ? `rgba(${r}, ${g}, ${b}, ${a})` : `rgb(${r}, ${g}, ${b})`;
                }
                return 'transparent';
            };
            const generateCSS = (node) => {
                let styles = {};
                // Dimensions
                if (node.absoluteBoundingBox) {
                    styles.width = `${Math.round(node.absoluteBoundingBox.width)}px`;
                    styles.height = `${Math.round(node.absoluteBoundingBox.height)}px`;
                }
                // Background/Fills
                if (node.fills && node.fills.length > 0) {
                    const fill = node.fills[0];
                    if (fill.type === 'SOLID' && fill.color) {
                        styles.backgroundColor = formatColor(fill.color);
                    }
                }
                // Border/Strokes
                if (node.strokes && node.strokes.length > 0) {
                    const stroke = node.strokes[0];
                    if (stroke.color) {
                        styles.border = `${node.strokeWeight || 1}px solid ${formatColor(stroke.color)}`;
                    }
                }
                // Border Radius
                if (node.cornerRadius !== undefined) {
                    styles.borderRadius = `${node.cornerRadius}px`;
                }
                // Opacity
                if (node.opacity !== undefined && node.opacity < 1) {
                    styles.opacity = node.opacity;
                }
                // Typography (for text nodes)
                if (node.type === 'TEXT' && node.style) {
                    const style = node.style;
                    if (style.fontFamily)
                        styles.fontFamily = `'${style.fontFamily}', sans-serif`;
                    if (style.fontSize)
                        styles.fontSize = `${style.fontSize}px`;
                    if (style.fontWeight)
                        styles.fontWeight = style.fontWeight;
                    if (style.lineHeightPx)
                        styles.lineHeight = `${style.lineHeightPx}px`;
                    if (style.letterSpacing)
                        styles.letterSpacing = `${style.letterSpacing}px`;
                    if (style.textAlignHorizontal) {
                        styles.textAlign = style.textAlignHorizontal.toLowerCase();
                    }
                }
                // Layout (for frames)
                if (node.layoutMode) {
                    styles.display = 'flex';
                    styles.flexDirection = node.layoutMode === 'HORIZONTAL' ? 'row' : 'column';
                    if (node.itemSpacing)
                        styles.gap = `${node.itemSpacing}px`;
                    if (node.paddingLeft !== undefined) {
                        styles.padding = `${node.paddingTop || 0}px ${node.paddingRight || 0}px ${node.paddingBottom || 0}px ${node.paddingLeft || 0}px`;
                    }
                    // Alignment
                    if (node.primaryAxisAlignItems) {
                        const alignment = node.primaryAxisAlignItems;
                        if (alignment === 'CENTER')
                            styles.justifyContent = 'center';
                        else if (alignment === 'MAX')
                            styles.justifyContent = 'flex-end';
                        else
                            styles.justifyContent = 'flex-start';
                    }
                    if (node.counterAxisAlignItems) {
                        const alignment = node.counterAxisAlignItems;
                        if (alignment === 'CENTER')
                            styles.alignItems = 'center';
                        else if (alignment === 'MAX')
                            styles.alignItems = 'flex-end';
                        else
                            styles.alignItems = 'flex-start';
                    }
                }
                // Position
                styles.position = 'relative';
                return styles;
            };
            const stylesToCSS = (styles) => {
                return Object.entries(styles)
                    .map(([key, value]) => {
                    const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
                    return `  ${cssKey}: ${value};`;
                })
                    .join('\n');
            };
            const stylesToReactStyle = (styles) => {
                const styleEntries = Object.entries(styles)
                    .map(([key, value]) => `    ${key}: '${value}'`)
                    .join(',\n');
                return `{\n${styleEntries}\n  }`;
            };
            let generatedCode = '';
            // Generate children components recursively
            const generateChildren = (node) => {
                if (!node.children || node.children.length === 0) {
                    if (node.type === 'TEXT' && node.characters) {
                        return node.characters;
                    }
                    return '';
                }
                return node.children.map((child) => {
                    const childStyles = generateCSS(child);
                    const childContent = generateChildren(child);
                    if (framework === 'react' || framework === 'react-ts') {
                        return `    <div style={${stylesToReactStyle(childStyles).replace(/\n/g, '\n      ')}}>\n      ${childContent}\n    </div>`;
                    }
                    else if (framework === 'html') {
                        return `  <div class="${child.name?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'element'}">\n    ${childContent}\n  </div>`;
                    }
                    else if (framework === 'vue') {
                        return `  <div class="${child.name?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'element'}">\n    ${childContent}\n  </div>`;
                    }
                    return childContent;
                }).join('\n');
            };
            // Generate code based on framework
            switch (framework) {
                case 'react':
                    const reactStyles = generateCSS(node);
                    const reactChildren = generateChildren(node);
                    generatedCode = `import React from 'react';

const ${name} = () => {
const styles = ${stylesToReactStyle(reactStyles)};

return (
<div style={styles}>
${reactChildren || `      {/* ${name} content */}`}
</div>
);
};

export default ${name};`;
                    break;
                case 'react-ts':
                    const reactTsStyles = generateCSS(node);
                    const reactTsChildren = generateChildren(node);
                    generatedCode = `import React from 'react';

interface ${name}Props {
children?: React.ReactNode;
className?: string;
}

const ${name}: React.FC<${name}Props> = ({ children, className }) => {
const styles: React.CSSProperties = ${stylesToReactStyle(reactTsStyles)};

return (
<div style={styles} className={className}>
${reactTsChildren || `      {children || '${name} content'}`}
</div>
);
};

export default ${name};`;
                    break;
                case 'vue':
                    const vueStyles = generateCSS(node);
                    const vueChildren = generateChildren(node);
                    // Generate CSS for Vue child elements
                    const generateVueChildCSS = (node, prefix = '') => {
                        let css = '';
                        if (node.children) {
                            node.children.forEach((child) => {
                                const childClass = child.name?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'element';
                                const childStyles = generateCSS(child);
                                css += `\n.${prefix}${childClass} {\n${stylesToCSS(childStyles)}\n}\n`;
                                css += generateVueChildCSS(child, `${prefix}${childClass}-`);
                            });
                        }
                        return css;
                    };
                    generatedCode = `<template>
<div class="${name.toLowerCase()}">
${vueChildren || `    <!-- ${name} content -->`}
</div>
</template>

<script>
export default {
name: '${name}',
};
</script>

<style scoped>
.${name.toLowerCase()} {
${stylesToCSS(vueStyles)}
}${generateVueChildCSS(node, `${name.toLowerCase()}-`)}
</style>`;
                    break;
                case 'html':
                    const htmlStyles = generateCSS(node);
                    const htmlChildren = generateChildren(node);
                    // Generate CSS for all child elements
                    const generateChildCSS = (node, prefix = '') => {
                        let css = '';
                        if (node.children) {
                            node.children.forEach((child) => {
                                const childClass = child.name?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'element';
                                const childStyles = generateCSS(child);
                                css += `\n.${prefix}${childClass} {\n${stylesToCSS(childStyles)}\n}\n`;
                                css += generateChildCSS(child, `${prefix}${childClass}-`);
                            });
                        }
                        return css;
                    };
                    generatedCode = `<!-- ${name} Component -->
<div class="${name.toLowerCase()}">
${htmlChildren || `  <!-- ${name} content -->`}
</div>

<style>
.${name.toLowerCase()} {
${stylesToCSS(htmlStyles)}
}${generateChildCSS(node, `${name.toLowerCase()}-`)}
</style>`;
                    break;
            }
            // Generate responsive version if needed
            let responsiveNote = '';
            if (node.absoluteBoundingBox && node.absoluteBoundingBox.width > 768) {
                responsiveNote = `\n\n/* 📱 Responsive Suggestions */
/* Add these media queries for mobile responsiveness */
/*
@media (max-width: 768px) {
.${name.toLowerCase()} {
width: 100%;
max-width: 100vw;
padding: 16px;
}
}
*/`;
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `🎨 **Generated ${framework.toUpperCase()} Component: ${name}**\n\n` +
                            `**Source:** Figma node ${nodeId}\n` +
                            `**Dimensions:** ${node.absoluteBoundingBox ? `${Math.round(node.absoluteBoundingBox.width)}px × ${Math.round(node.absoluteBoundingBox.height)}px` : 'Auto'}\n` +
                            `**Type:** ${node.type}\n\n` +
                            `\`\`\`${framework === 'html' ? 'html' : framework === 'vue' ? 'vue' : 'jsx'}\n${generatedCode}\`\`\`${responsiveNote}`,
                    },
                ],
            };
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                throw new types_js_1.McpError(types_js_1.ErrorCode.InternalError, `Figma API error: ${error.response?.status} ${error.response?.statusText}`);
            }
            throw error;
        }
    }
    async run() {
        const transport = new stdio_js_1.StdioServerTransport();
        await this.server.connect(transport);
        console.error('Figma MCP server running on stdio');
    }
}
// Start the server
const server = new FigmaMCPServer();
server.run().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map