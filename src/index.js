#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import crypto from "crypto";

const KALSHI_ACCESS_KEY = process.env.KALSHI_ACCESS_KEY;
const KALSHI_PRIVATE_KEY = process.env.KALSHI_PRIVATE_KEY;
const KALSHI_BASE_URL = process.env.KALSHI_BASE_URL || "https://external-api.kalshi.com";

if (!KALSHI_ACCESS_KEY || !KALSHI_PRIVATE_KEY) {
  console.error("Error: KALSHI_ACCESS_KEY and KALSHI_PRIVATE_KEY environment variables are required");
  process.exit(1);
}

// Parse the RSA private key
let privateKey;
try {
  privateKey = crypto.createPrivateKey({
    key: KALSHI_PRIVATE_KEY,
    format: "pem",
  });
} catch (error) {
  console.error("Error: Failed to parse KALSHI_PRIVATE_KEY:", error.message);
  process.exit(1);
}

/**
 * Sign a request using RSA-PSS with SHA256
 * @param {string} message - The message to sign (timestamp + method + path)
 * @returns {string} Base64 encoded signature
 */
function signRequest(message) {
  const signature = crypto.sign(null, Buffer.from(message, "utf8"), {
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
  });
  return signature.toString("base64");
}

/**
 * Make an authenticated request to the Kalshi API
 * @param {string} method - HTTP method (GET, POST, DELETE)
 * @param {string} path - API path (without query parameters)
 * @param {object} options - Additional options (query, body)
 * @returns {Promise<object>} API response
 */
async function kalshiRequest(method, path, options = {}) {
  const timestamp = Date.now().toString();
  
  // Strip query parameters from path for signing
  const pathForSigning = path.split("?")[0];
  const messageToSign = timestamp + method.toUpperCase() + pathForSigning;
  const signature = signRequest(messageToSign);

  // Build full URL with query parameters
  let url = `${KALSHI_BASE_URL}${path}`;
  if (options.query) {
    const queryString = new URLSearchParams(options.query).toString();
    url = `${url}?${queryString}`;
  }

  const headers = {
    "KALSHI-ACCESS-KEY": KALSHI_ACCESS_KEY,
    "KALSHI-ACCESS-TIMESTAMP": timestamp,
    "KALSHI-ACCESS-SIGNATURE": signature,
    "Content-Type": "application/json",
  };

  const fetchOptions = {
    method,
    headers,
  };

  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, fetchOptions);
  const responseText = await response.text();
  
  if (!response.ok) {
    throw new Error(`Kalshi API error (${response.status}): ${responseText}`);
  }

  return responseText ? JSON.parse(responseText) : {};
}

// Create MCP server
const server = new Server(
  {
    name: "kalshi",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool definitions
const TOOLS = [
  {
    name: "kalshi_get_balance",
    description: "Get account balance and portfolio value. Safe to call any time.",
    inputSchema: {
      type: "object",
      properties: {
        subaccount: {
          type: "number",
          description: "Subaccount number (0 for primary, 1-63 for subaccounts). Defaults to 0.",
        },
      },
    },
  },
  {
    name: "kalshi_list_markets",
    description: "List available prediction markets with optional filters. Returns market tickers, titles, prices, and status.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Maximum number of markets to return (default 100, max 1000)",
        },
        cursor: {
          type: "string",
          description: "Pagination cursor from previous response",
        },
        status: {
          type: "string",
          enum: ["unopened", "open", "closed", "settled"],
          description: "Filter by market status",
        },
        series_ticker: {
          type: "string",
          description: "Filter by series ticker",
        },
        event_ticker: {
          type: "string",
          description: "Filter by event ticker",
        },
      },
    },
  },
  {
    name: "kalshi_get_market",
    description: "Get detailed information about a specific market by ticker",
    inputSchema: {
      type: "object",
      properties: {
        ticker: {
          type: "string",
          description: "Market ticker (e.g., 'HIGHNY-24JAN01-T60')",
        },
      },
      required: ["ticker"],
    },
  },
  {
    name: "kalshi_get_orderbook",
    description: "Get the current orderbook for a market, showing all bid/ask levels with prices and quantities",
    inputSchema: {
      type: "object",
      properties: {
        ticker: {
          type: "string",
          description: "Market ticker",
        },
        depth: {
          type: "number",
          description: "Number of price levels to return (default 100)",
        },
      },
      required: ["ticker"],
    },
  },
  {
    name: "kalshi_get_positions",
    description: "Get current positions across all markets",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Maximum number of positions to return",
        },
        cursor: {
          type: "string",
          description: "Pagination cursor",
        },
        ticker: {
          type: "string",
          description: "Filter by market ticker",
        },
      },
    },
  },
  {
    name: "kalshi_list_orders",
    description: "List orders with optional filters. Returns order details including status, fills, and prices.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Maximum number of orders to return",
        },
        cursor: {
          type: "string",
          description: "Pagination cursor",
        },
        ticker: {
          type: "string",
          description: "Filter by market ticker",
        },
        status: {
          type: "string",
          enum: ["resting", "canceled", "executed"],
          description: "Filter by order status",
        },
      },
    },
  },
  {
    name: "kalshi_create_order",
    description: "Create a new order. WARNING: Only use when user explicitly requests a trade. Always confirm market, side, size, and price with user first.",
    inputSchema: {
      type: "object",
      properties: {
        ticker: {
          type: "string",
          description: "Market ticker",
        },
        side: {
          type: "string",
          enum: ["bid", "ask"],
          description: "Order side: 'bid' = buy YES, 'ask' = sell YES",
        },
        count: {
          type: "string",
          description: "Number of contracts as fixed-point string (e.g., '10.00')",
        },
        price: {
          type: "string",
          description: "Price in dollars as fixed-point string (e.g., '0.5600' for 56 cents)",
        },
        time_in_force: {
          type: "string",
          enum: ["good_till_canceled", "immediate_or_cancel", "fill_or_kill"],
          description: "Order duration type (default: good_till_canceled)",
        },
        post_only: {
          type: "boolean",
          description: "If true, order will only add liquidity (default: false)",
        },
        client_order_id: {
          type: "string",
          description: "Optional client-provided order ID",
        },
      },
      required: ["ticker", "side", "count", "price"],
    },
  },
  {
    name: "kalshi_cancel_order",
    description: "Cancel an existing order. Only use when user explicitly requests cancellation.",
    inputSchema: {
      type: "object",
      properties: {
        order_id: {
          type: "string",
          description: "ID of the order to cancel",
        },
      },
      required: ["order_id"],
    },
  },
];

// Handle tool list requests
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: TOOLS,
  };
});

// Handle tool execution requests
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "kalshi_get_balance": {
        const query = {};
        if (args.subaccount !== undefined) {
          query.subaccount = args.subaccount;
        }
        const result = await kalshiRequest("GET", "/trade-api/v2/portfolio/balance", { query });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "kalshi_list_markets": {
        const query = {};
        if (args.limit) query.limit = args.limit;
        if (args.cursor) query.cursor = args.cursor;
        if (args.status) query.status = args.status;
        if (args.series_ticker) query.series_ticker = args.series_ticker;
        if (args.event_ticker) query.event_ticker = args.event_ticker;
        
        const result = await kalshiRequest("GET", "/trade-api/v2/markets", { query });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "kalshi_get_market": {
        const result = await kalshiRequest("GET", `/trade-api/v2/markets/${args.ticker}`);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "kalshi_get_orderbook": {
        const query = {};
        if (args.depth) query.depth = args.depth;
        
        const result = await kalshiRequest("GET", `/trade-api/v2/markets/${args.ticker}/orderbook`, { query });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "kalshi_get_positions": {
        const query = {};
        if (args.limit) query.limit = args.limit;
        if (args.cursor) query.cursor = args.cursor;
        if (args.ticker) query.ticker = args.ticker;
        
        const result = await kalshiRequest("GET", "/trade-api/v2/portfolio/positions", { query });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "kalshi_list_orders": {
        const query = {};
        if (args.limit) query.limit = args.limit;
        if (args.cursor) query.cursor = args.cursor;
        if (args.ticker) query.ticker = args.ticker;
        if (args.status) query.status = args.status;
        
        const result = await kalshiRequest("GET", "/trade-api/v2/portfolio/orders", { query });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "kalshi_create_order": {
        const body = {
          ticker: args.ticker,
          side: args.side,
          count: args.count,
          price: args.price,
          time_in_force: args.time_in_force || "good_till_canceled",
          self_trade_prevention_type: "taker_at_cross",
        };
        
        if (args.post_only !== undefined) body.post_only = args.post_only;
        if (args.client_order_id) body.client_order_id = args.client_order_id;
        
        const result = await kalshiRequest("POST", "/trade-api/v2/portfolio/events/orders", { body });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "kalshi_cancel_order": {
        const result = await kalshiRequest("DELETE", `/trade-api/v2/portfolio/events/orders/${args.order_id}`);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Kalshi MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
