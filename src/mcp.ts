import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerMarketTools } from './mcp/tools/market';
import { registerOrderTools } from './mcp/tools/order';
import { registerPositionTools } from './mcp/tools/position';
import { registerAccountTools } from './mcp/tools/account';
import { registerTransferTools } from './mcp/tools/transfer';

const server = new McpServer({
  name: 'hyperliquid-mcp',
  version: '0.1.0',
});

// Register all tool groups
registerMarketTools(server);
registerOrderTools(server);
registerPositionTools(server);
registerAccountTools(server);
registerTransferTools(server);

// Start server
const transport = new StdioServerTransport();
server.connect(transport).catch((err) => {
  console.error('MCP server error:', err);
  process.exit(1);
});
