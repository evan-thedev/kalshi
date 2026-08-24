# Kalshi Prediction Markets Plugin for Cursor

A Cursor marketplace plugin that connects to the [Kalshi](https://kalshi.com) prediction markets API, enabling AI agents to read markets and place trades with user approval.

## Features

- **Read Market Data**: Browse markets, check prices, view orderbooks
- **Portfolio Management**: Check balance and view positions
- **Order Placement**: Place and cancel orders (only with explicit user approval)
- **Demo & Production**: Supports both demo and production environments
- **Secure Authentication**: RSA-PSS signature-based authentication

## Installation

### 1. Create API Keys

Visit [https://kalshi.com/account/profile](https://kalshi.com/account/profile) and:
1. Click "Create New API Key"
2. Save your **Key ID** (KALSHI_ACCESS_KEY)
3. Download and save your **Private Key** (KALSHI_PRIVATE_KEY) - you won't be able to retrieve it again!

For testing, you can also create keys on the demo environment at [https://demo.kalshi.com/account/profile](https://demo.kalshi.com/account/profile).

### 2. Install the Plugin

1. Open Cursor
2. Go to Settings → Plugins → Marketplace
3. Search for "kalshi"
4. Click Install

Or clone this repository and install locally:
```bash
git clone https://github.com/evanparrott/kalshi
```

### 3. Configure Variables

In Cursor, go to Settings → Plugins → kalshi and set:

- **KALSHI_ACCESS_KEY**: Your API Key ID from Kalshi
- **KALSHI_PRIVATE_KEY**: Your RSA private key (entire PEM file contents)
- **KALSHI_BASE_URL** (optional): 
  - Production: `https://external-api.kalshi.com` (default)
  - Demo: `https://external-api.demo.kalshi.co`

## Available Tools

### Read-Only Tools (Safe)
- `kalshi_get_balance` - Check account balance and portfolio value
- `kalshi_list_markets` - Browse available prediction markets
- `kalshi_get_market` - Get details about a specific market
- `kalshi_get_orderbook` - View current orderbook with prices
- `kalshi_get_positions` - View your current positions
- `kalshi_list_orders` - View your current orders

### Write Tools (Require User Approval)
- `kalshi_create_order` - Place a new order
- `kalshi_cancel_order` - Cancel an existing order

## Usage Examples

### Browse Markets
```
"What prediction markets are available on Kalshi?"
```

### Check Balance
```
"What's my Kalshi account balance?"
```

### Get Market Info
```
"Show me details about the market HIGHNY-24JAN01-T60"
```

### Place an Order (Requires Confirmation)
```
"Buy 10 YES contracts on HIGHNY-24JAN01-T60 at 56 cents"
```

The agent will:
1. Show you the market details
2. Display the current orderbook
3. Ask for your explicit confirmation
4. Only then place the order

## Safety Features

- **Skill File**: The plugin includes a skill file that agents must read before trading
- **Explicit Approval Required**: Orders are never placed without user confirmation
- **No Price Guessing**: Agents must use actual orderbook prices
- **Clear Confirmations**: All trade parameters are confirmed before execution
- **Demo Mode**: Test safely with fake money on the demo environment

## Demo vs Production

### Demo Environment
- Base URL: `https://external-api.demo.kalshi.co`
- Uses fake money for testing
- Separate account and API keys
- Perfect for testing the plugin

### Production Environment
- Base URL: `https://external-api.kalshi.com`
- Uses real money
- Default if KALSHI_BASE_URL is not set

**Always test with demo first!**

## Development

### Prerequisites
- Node.js 18 or higher
- npm

### Local Development
```bash
# Clone the repository
git clone https://github.com/evanparrott/kalshi
cd kalshi

# Install dependencies
npm install

# Set environment variables
export KALSHI_ACCESS_KEY="your-key-id"
export KALSHI_PRIVATE_KEY="$(cat path/to/your/private-key.pem)"
export KALSHI_BASE_URL="https://external-api.demo.kalshi.co"

# Run the server
npm start
```

### Testing
The MCP server communicates via stdio. You can test it with the MCP Inspector or integrate it directly into Cursor.

## Publishing to Cursor Marketplace

This plugin is designed to be submitted to the Cursor marketplace:

1. Ensure all requirements are met:
   - Public GitHub repository
   - Valid `.cursor-plugin/plugin.json`
   - Valid `.cursor-plugin/mcp.json`
   - Skill file at `skills/kalshi-trading/SKILL.md`
   - Working MCP server
   - No secrets in the repository

2. Submit at: [https://cursor.com/marketplace/publish](https://cursor.com/marketplace/publish)

3. Provide:
   - Repository URL
   - Plugin description
   - Usage examples
   - Any special installation notes

## API Reference

For full Kalshi API documentation, visit:
- [Official API Docs](https://docs.kalshi.com)
- [Getting Started](https://docs.kalshi.com/getting_started/api_keys)
- [API Reference](https://docs.kalshi.com/llms.txt)

## Security Notes

- Never commit your API keys or private key to version control
- Store private keys securely
- Use demo environment for testing
- Private keys cannot be recovered - save them immediately when generated
- The plugin uses RSA-PSS SHA256 signatures for authentication

## Troubleshooting

### "Failed to parse KALSHI_PRIVATE_KEY"
Ensure your private key is in PEM format and includes the full key with headers:
```
-----BEGIN PRIVATE KEY-----
...
-----END PRIVATE KEY-----
```

### "Unauthorized" errors
- Verify your KALSHI_ACCESS_KEY is correct
- Ensure KALSHI_PRIVATE_KEY matches the key for your KALSHI_ACCESS_KEY
- Check you're using the right base URL (demo vs production)

### "Market not found" errors
- Verify the ticker symbol is correct
- Check the market status with `kalshi_get_market`
- Markets may be closed or settled

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Author

Evan Parrott

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Disclaimer

This is an unofficial plugin. Use at your own risk. Trading prediction markets involves financial risk. Always understand what you're trading and never trade more than you can afford to lose.

## Links

- [Kalshi Website](https://kalshi.com)
- [Kalshi API Documentation](https://docs.kalshi.com)
- [Cursor Marketplace](https://cursor.com/marketplace)
- [Report Issues](https://github.com/evanparrott/kalshi/issues)
