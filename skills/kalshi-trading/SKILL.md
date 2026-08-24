# Kalshi Trading Skill

**ALWAYS read this file before using any Kalshi tools.**

## Trading Safety Rules

### Read-Only Tools (Safe to Use)
These tools are safe to call any time:
- `kalshi_get_balance` - Check account balance
- `kalshi_list_markets` - Browse available markets
- `kalshi_get_market` - Get details about a specific market
- `kalshi_get_orderbook` - View current orderbook
- `kalshi_get_positions` - View current positions
- `kalshi_list_orders` - View current orders

### Write Tools (Require User Approval)
**NEVER** use these tools unless the user explicitly requests a specific trade:
- `kalshi_create_order` - Place an order
- `kalshi_cancel_order` - Cancel an order

### Before Placing ANY Order

When the user asks to place a trade, you MUST:

1. **Confirm the market** - Show the user the market details (ticker, title, current prices)
2. **Confirm the side** - Ask: "You want to buy YES at X?" or "You want to sell YES (buy NO) at Y?"
3. **Confirm the size** - Verify the number of contracts
4. **Confirm the price** - Show the exact price in dollars (0.01 to 0.99 format)
5. **Wait for explicit approval** - User must say "yes", "confirm", or similar

### Trading Terminology

- **Side**: Use `bid` to buy YES, use `ask` to sell YES
- **Price**: Fixed-point dollar string (e.g., "0.5600" means 56 cents)
- **Count**: Fixed-point contract count (e.g., "10.00" means 10 contracts)
- **Ticker**: Market identifier (e.g., "HIGHNY-24JAN01-T60")

### Never Invent Prices or Fills

- NEVER make up or estimate fill prices
- ALWAYS use the actual orderbook prices shown by `kalshi_get_orderbook`
- If the user wants market orders, explain they need to specify a limit price
- Show the current best bid/ask before any order

### Demo vs Production

- **Demo**: https://external-api.demo.kalshi.co (for testing, fake money)
- **Production**: https://external-api.kalshi.com (real money)
- When testing the plugin, prefer using the demo environment
- Make sure the user knows which environment they're using

### Error Handling

If an order fails:
1. Show the exact error message from Kalshi
2. Check balance with `kalshi_get_balance`
3. Verify the market is still open with `kalshi_get_market`
4. Never retry automatically - ask the user what to do

### Order Types

- `time_in_force`: Use `good_till_canceled` for resting orders, `immediate_or_cancel` for immediate execution
- `self_trade_prevention_type`: Use `taker_at_cross` (cancels taker order if would self-trade)
- `post_only`: Set to `true` to ensure order only adds liquidity (doesn't take)

## Example Flows

### Safe Browsing Flow
1. User: "What markets are popular right now?"
2. Agent: Call `kalshi_list_markets` and show results
3. Agent: Explain the markets in plain language

### Trading Flow (User Initiated)
1. User: "Buy 10 YES on HIGHNY-24JAN01-T60 at 56 cents"
2. Agent: Call `kalshi_get_market` to show market details
3. Agent: Call `kalshi_get_orderbook` to show current prices
4. Agent: Confirm with user: "You want to buy 10 YES contracts at $0.56 on [Market Name]?"
5. User: "Yes, confirm"
6. Agent: Call `kalshi_create_order` with exact parameters
7. Agent: Show order result (order_id, fill_count, etc.)

## Remember

- Read-only operations: Always safe
- Write operations: Only with explicit user approval
- Never guess prices or outcomes
- Always confirm before trading
