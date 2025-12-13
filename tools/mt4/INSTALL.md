# TIME MetaTrader Bridge - Installation Guide

## MT4 Installation

1. **Copy the EA file:**
   - Copy `TIME_Bridge_EA.mq4` to your MT4 data folder:
   - `C:\Users\[YourName]\AppData\Roaming\MetaQuotes\Terminal\[ID]\MQL4\Experts\`
   - OR in MT4: File -> Open Data Folder -> MQL4 -> Experts

2. **Compile the EA:**
   - Open MetaEditor (F4 in MT4)
   - Open the `TIME_Bridge_EA.mq4` file
   - Press F7 to compile
   - Should show "0 errors, 0 warnings"

3. **Enable Auto Trading:**
   - In MT4: Tools -> Options -> Expert Advisors
   - Check "Allow automated trading"
   - Check "Allow DLL imports"

4. **Attach to Chart:**
   - Open any chart (e.g., EURUSD)
   - Drag `TIME_Bridge_EA` from Navigator (Ctrl+N) onto the chart
   - Configure settings:
     - TIME_Host: 127.0.0.1 (or your TIME server IP)
     - TIME_Port: 15555
     - EnableTrading: true (for live trading)
   - Click OK

5. **Verify Connection:**
   - Check the "Experts" tab at bottom of MT4
   - Should see: "[TIME] Connected to TIME server"
   - Should see: "[TIME] Authenticated with TIME server"

## MT5 Installation

1. **Copy the EA file:**
   - Copy `TIME_Bridge_EA.mq5` from `tools/mt5/` to:
   - `C:\Users\[YourName]\AppData\Roaming\MetaQuotes\Terminal\[ID]\MQL5\Experts\`

2. **Compile and attach same as MT4**

## TIME Backend Configuration

Make sure your `.env` has:
```
MT_BRIDGE_PORT=15555
MT_BRIDGE_ENABLED=true
```

And restart the TIME backend to start the MT Bridge server.

## Troubleshooting

- **"Failed to connect"**: Ensure TIME backend is running with MT Bridge enabled
- **"Trade context busy"**: Another EA is trading, wait or disable it
- **"Not enough money"**: Check account balance/margin
- **"Invalid stops"**: SL/TP too close to current price (broker minimum)

## Features

- Real-time account info streaming
- Position tracking
- Pending order management
- Trade execution (market, limit, stop orders)
- Tick data streaming
- Trade history retrieval
- Auto-reconnection on disconnect
