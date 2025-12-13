//+------------------------------------------------------------------+
//|                                              TIME_Bridge_EA.mq5  |
//|                        TIME Meta-Intelligence Trading Platform   |
//|                              https://github.com/tdmboyd-dev/TIME |
//+------------------------------------------------------------------+
#property copyright "TIME Meta-Intelligence"
#property link      "https://github.com/tdmboyd-dev/TIME"
#property version   "1.00"

#include <Trade\Trade.mqh>
#include <Trade\PositionInfo.mqh>
#include <Trade\OrderInfo.mqh>
#include <Trade\AccountInfo.mqh>

// Connection Settings
input string   TIME_Host = "127.0.0.1";     // TIME Server Host
input int      TIME_Port = 15555;            // TIME Server Port
input ulong    MagicNumber = 123456;         // Magic Number for trades
input int      UpdateInterval = 1000;        // Update interval (ms)
input bool     EnableTrading = true;         // Enable trade execution
input bool     EnableTickStream = true;      // Stream tick data
input int      Deviation = 10;               // Slippage (points)

// Global objects
CTrade         trade;
CPositionInfo  positionInfo;
COrderInfo     orderInfo;
CAccountInfo   accountInfo;

// Socket handle
int socket = INVALID_HANDLE;
bool isConnected = false;
bool isAuthenticated = false;
datetime lastUpdate = 0;
string receiveBuffer = "";

//+------------------------------------------------------------------+
//| Expert initialization function                                     |
//+------------------------------------------------------------------+
int OnInit()
{
   Print("[TIME] Initializing TIME Bridge EA v1.0 for MT5");
   Print("[TIME] Connecting to ", TIME_Host, ":", TIME_Port);

   // Set up trade object
   trade.SetExpertMagicNumber(MagicNumber);
   trade.SetDeviationInPoints(Deviation);
   trade.SetTypeFilling(ORDER_FILLING_IOC);
   trade.SetAsyncMode(false);

   // Connect to TIME server
   if(!ConnectToTIME())
   {
      Print("[TIME] Failed to connect. Will retry...");
   }

   // Set timer for periodic updates
   EventSetMillisecondTimer(UpdateInterval);

   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                   |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   EventKillTimer();
   DisconnectFromTIME();
   Print("[TIME] EA deinitialized. Reason: ", reason);
}

//+------------------------------------------------------------------+
//| Expert tick function                                               |
//+------------------------------------------------------------------+
void OnTick()
{
   if(!isConnected || !isAuthenticated) return;

   // Stream tick data if enabled
   if(EnableTickStream)
   {
      SendTickData();
   }
}

//+------------------------------------------------------------------+
//| Timer function                                                     |
//+------------------------------------------------------------------+
void OnTimer()
{
   // Try to reconnect if disconnected
   if(!isConnected)
   {
      ConnectToTIME();
      return;
   }

   // Receive and process messages
   ProcessIncomingMessages();

   // Send periodic updates
   if(isAuthenticated && TimeCurrent() - lastUpdate >= 5)
   {
      SendAccountInfo();
      SendPositions();
      SendPendingOrders();
      lastUpdate = TimeCurrent();
   }

   // Send ping
   SendPing();
}

//+------------------------------------------------------------------+
//| Connect to TIME server                                             |
//+------------------------------------------------------------------+
bool ConnectToTIME()
{
   if(isConnected) return true;

   socket = SocketCreate();
   if(socket == INVALID_HANDLE)
   {
      Print("[TIME] Failed to create socket: ", GetLastError());
      return false;
   }

   if(!SocketConnect(socket, TIME_Host, TIME_Port, 5000))
   {
      Print("[TIME] Failed to connect: ", GetLastError());
      SocketClose(socket);
      socket = INVALID_HANDLE;
      return false;
   }

   isConnected = true;
   Print("[TIME] Connected to TIME server");

   return true;
}

//+------------------------------------------------------------------+
//| Disconnect from TIME server                                        |
//+------------------------------------------------------------------+
void DisconnectFromTIME()
{
   if(socket != INVALID_HANDLE)
   {
      SocketClose(socket);
      socket = INVALID_HANDLE;
   }
   isConnected = false;
   isAuthenticated = false;
   Print("[TIME] Disconnected from TIME server");
}

//+------------------------------------------------------------------+
//| Send message to TIME                                               |
//+------------------------------------------------------------------+
bool SendMessage(string json)
{
   if(!isConnected || socket == INVALID_HANDLE) return false;

   string message = json + "\n";
   uchar data[];
   int len = StringToCharArray(message, data, 0, WHOLE_ARRAY, CP_UTF8) - 1;

   int sent = SocketSend(socket, data, len);
   if(sent <= 0)
   {
      Print("[TIME] Send failed: ", GetLastError());
      DisconnectFromTIME();
      return false;
   }

   return true;
}

//+------------------------------------------------------------------+
//| Process incoming messages                                          |
//+------------------------------------------------------------------+
void ProcessIncomingMessages()
{
   if(!isConnected || socket == INVALID_HANDLE) return;

   uchar buffer[];
   ArrayResize(buffer, 4096);

   uint timeout = 100;
   int received = SocketRead(socket, buffer, ArraySize(buffer), timeout);

   if(received > 0)
   {
      string data = CharArrayToString(buffer, 0, received, CP_UTF8);
      receiveBuffer += data;

      // Process complete messages (newline delimited)
      int pos;
      while((pos = StringFind(receiveBuffer, "\n")) >= 0)
      {
         string message = StringSubstr(receiveBuffer, 0, pos);
         receiveBuffer = StringSubstr(receiveBuffer, pos + 1);

         if(StringLen(message) > 0)
         {
            HandleMessage(message);
         }
      }
   }
   else if(received < 0)
   {
      int error = GetLastError();
      if(error != 0 && error != 5273) // 5273 = no data available
      {
         Print("[TIME] Receive error: ", error);
         DisconnectFromTIME();
      }
   }
}

//+------------------------------------------------------------------+
//| Handle incoming message                                            |
//+------------------------------------------------------------------+
void HandleMessage(string json)
{
   // Simple JSON parsing
   string type = GetJSONString(json, "type");

   if(type == "auth_request")
   {
      SendAuthResponse();
   }
   else if(type == "pong")
   {
      // Connection alive
   }
   else if(type == "get_account_info")
   {
      SendAccountInfo();
   }
   else if(type == "get_positions")
   {
      SendPositions();
   }
   else if(type == "get_pending_orders")
   {
      SendPendingOrders();
   }
   else if(type == "trade")
   {
      if(EnableTrading)
      {
         HandleTradeRequest(json);
      }
      else
      {
         string requestId = GetJSONString(json, "requestId");
         SendTradeResult(requestId, false, 0, "Trading disabled in EA settings");
      }
   }
   else if(type == "get_history")
   {
      datetime fromTime = (datetime)GetJSONDouble(json, "from");
      datetime toTime = (datetime)GetJSONDouble(json, "to");
      SendTradeHistory(fromTime, toTime);
   }
   else if(type == "subscribe_ticks")
   {
      // Tick streaming handled in OnTick
   }
}

//+------------------------------------------------------------------+
//| Send authentication response                                       |
//+------------------------------------------------------------------+
void SendAuthResponse()
{
   string json = StringFormat(
      "{\"type\":\"auth_response\",\"success\":true,\"version\":\"mt5\",\"broker\":\"%s\",\"account\":\"%d\",\"server\":\"%s\"}",
      accountInfo.Company(),
      accountInfo.Login(),
      AccountInfoString(ACCOUNT_SERVER)
   );

   if(SendMessage(json))
   {
      isAuthenticated = true;
      Print("[TIME] Authenticated with TIME server");

      // Send initial data
      SendAccountInfo();
      SendPositions();
      SendPendingOrders();
   }
}

//+------------------------------------------------------------------+
//| Send account information                                           |
//+------------------------------------------------------------------+
void SendAccountInfo()
{
   double marginLevel = accountInfo.Margin() > 0 ? (accountInfo.Equity() / accountInfo.Margin() * 100) : 0;

   string json = StringFormat(
      "{\"type\":\"account_info\",\"account\":\"%d\",\"broker\":\"%s\",\"name\":\"%s\",\"currency\":\"%s\",\"balance\":%.2f,\"equity\":%.2f,\"margin\":%.2f,\"freeMargin\":%.2f,\"marginLevel\":%.2f,\"leverage\":%d,\"profit\":%.2f,\"server\":\"%s\",\"tradeAllowed\":%s,\"hedgingAllowed\":%s}",
      accountInfo.Login(),
      accountInfo.Company(),
      accountInfo.Name(),
      accountInfo.Currency(),
      accountInfo.Balance(),
      accountInfo.Equity(),
      accountInfo.Margin(),
      accountInfo.FreeMargin(),
      marginLevel,
      accountInfo.Leverage(),
      accountInfo.Profit(),
      AccountInfoString(ACCOUNT_SERVER),
      AccountInfoInteger(ACCOUNT_TRADE_ALLOWED) ? "true" : "false",
      AccountInfoInteger(ACCOUNT_MARGIN_MODE) == ACCOUNT_MARGIN_MODE_RETAIL_HEDGING ? "true" : "false"
   );

   SendMessage(json);
}

//+------------------------------------------------------------------+
//| Send positions                                                     |
//+------------------------------------------------------------------+
void SendPositions()
{
   string positions = "[";
   bool first = true;

   for(int i = 0; i < PositionsTotal(); i++)
   {
      if(positionInfo.SelectByIndex(i))
      {
         if(!first) positions += ",";
         first = false;

         positions += StringFormat(
            "{\"ticket\":%d,\"symbol\":\"%s\",\"type\":%d,\"volume\":%.2f,\"openPrice\":%.5f,\"currentPrice\":%.5f,\"stopLoss\":%.5f,\"takeProfit\":%.5f,\"swap\":%.2f,\"profit\":%.2f,\"comment\":\"%s\",\"magicNumber\":%d,\"openTime\":%d}",
            positionInfo.Ticket(),
            positionInfo.Symbol(),
            positionInfo.PositionType(),
            positionInfo.Volume(),
            positionInfo.PriceOpen(),
            positionInfo.PriceCurrent(),
            positionInfo.StopLoss(),
            positionInfo.TakeProfit(),
            positionInfo.Swap(),
            positionInfo.Profit(),
            positionInfo.Comment(),
            positionInfo.Magic(),
            (int)positionInfo.Time()
         );
      }
   }

   positions += "]";

   string json = "{\"type\":\"positions\",\"positions\":" + positions + "}";
   SendMessage(json);
}

//+------------------------------------------------------------------+
//| Send pending orders                                                |
//+------------------------------------------------------------------+
void SendPendingOrders()
{
   string orders = "[";
   bool first = true;

   for(int i = 0; i < OrdersTotal(); i++)
   {
      if(orderInfo.SelectByIndex(i))
      {
         if(!first) orders += ",";
         first = false;

         orders += StringFormat(
            "{\"ticket\":%d,\"symbol\":\"%s\",\"type\":%d,\"volume\":%.2f,\"price\":%.5f,\"stopLoss\":%.5f,\"takeProfit\":%.5f,\"expiration\":%d,\"comment\":\"%s\",\"magicNumber\":%d}",
            orderInfo.Ticket(),
            orderInfo.Symbol(),
            orderInfo.OrderType(),
            orderInfo.VolumeCurrent(),
            orderInfo.PriceOpen(),
            orderInfo.StopLoss(),
            orderInfo.TakeProfit(),
            (int)orderInfo.TimeExpiration(),
            orderInfo.Comment(),
            orderInfo.Magic()
         );
      }
   }

   orders += "]";

   string json = "{\"type\":\"pending_orders\",\"orders\":" + orders + "}";
   SendMessage(json);
}

//+------------------------------------------------------------------+
//| Send tick data                                                     |
//+------------------------------------------------------------------+
void SendTickData()
{
   MqlTick tick;
   if(!SymbolInfoTick(_Symbol, tick)) return;

   string json = StringFormat(
      "{\"type\":\"tick\",\"symbol\":\"%s\",\"bid\":%.5f,\"ask\":%.5f,\"time\":%d,\"volume\":%d}",
      _Symbol,
      tick.bid,
      tick.ask,
      (int)tick.time,
      (int)tick.volume
   );

   SendMessage(json);
}

//+------------------------------------------------------------------+
//| Send ping                                                          |
//+------------------------------------------------------------------+
void SendPing()
{
   SendMessage("{\"type\":\"ping\",\"timestamp\":" + IntegerToString((int)TimeLocal()) + "}");
}

//+------------------------------------------------------------------+
//| Handle trade request from TIME                                     |
//+------------------------------------------------------------------+
void HandleTradeRequest(string json)
{
   string requestId = GetJSONString(json, "requestId");
   string action = GetJSONString(json, "action");
   string symbol = GetJSONString(json, "symbol");
   double volume = GetJSONDouble(json, "volume");
   double price = GetJSONDouble(json, "price");
   double stopLoss = GetJSONDouble(json, "stopLoss");
   double takeProfit = GetJSONDouble(json, "takeProfit");
   ulong ticket = (ulong)GetJSONDouble(json, "ticket");
   string comment = GetJSONString(json, "comment");

   if(StringLen(comment) == 0) comment = "TIME";

   bool success = false;
   ulong resultTicket = 0;
   string error = "";

   // Execute trade based on action
   if(action == "buy")
   {
      success = trade.Buy(volume, symbol, 0, stopLoss, takeProfit, comment);
      if(success) resultTicket = trade.ResultOrder();
   }
   else if(action == "sell")
   {
      success = trade.Sell(volume, symbol, 0, stopLoss, takeProfit, comment);
      if(success) resultTicket = trade.ResultOrder();
   }
   else if(action == "buy_limit")
   {
      success = trade.BuyLimit(volume, price, symbol, stopLoss, takeProfit, ORDER_TIME_GTC, 0, comment);
      if(success) resultTicket = trade.ResultOrder();
   }
   else if(action == "sell_limit")
   {
      success = trade.SellLimit(volume, price, symbol, stopLoss, takeProfit, ORDER_TIME_GTC, 0, comment);
      if(success) resultTicket = trade.ResultOrder();
   }
   else if(action == "buy_stop")
   {
      success = trade.BuyStop(volume, price, symbol, stopLoss, takeProfit, ORDER_TIME_GTC, 0, comment);
      if(success) resultTicket = trade.ResultOrder();
   }
   else if(action == "sell_stop")
   {
      success = trade.SellStop(volume, price, symbol, stopLoss, takeProfit, ORDER_TIME_GTC, 0, comment);
      if(success) resultTicket = trade.ResultOrder();
   }
   else if(action == "close")
   {
      // Close position by ticket
      if(PositionSelectByTicket(ticket))
      {
         double closeVolume = volume > 0 ? volume : PositionGetDouble(POSITION_VOLUME);
         success = trade.PositionClose(ticket);
         if(success) resultTicket = ticket;
      }
      else
      {
         error = "Position not found";
      }
   }
   else if(action == "modify")
   {
      // Modify position SL/TP
      if(PositionSelectByTicket(ticket))
      {
         success = trade.PositionModify(ticket, stopLoss, takeProfit);
         if(success) resultTicket = ticket;
      }
      else
      {
         // Try to modify pending order
         if(OrderSelect(ticket))
         {
            success = trade.OrderModify(ticket, price, stopLoss, takeProfit, ORDER_TIME_GTC, 0);
            if(success) resultTicket = ticket;
         }
         else
         {
            error = "Position/Order not found";
         }
      }
   }
   else if(action == "cancel")
   {
      // Cancel pending order
      success = trade.OrderDelete(ticket);
      if(success) resultTicket = ticket;
   }

   // Get error if failed
   if(!success && StringLen(error) == 0)
   {
      error = trade.ResultRetcodeDescription();
   }

   // Send result
   SendTradeResult(requestId, success, (int)resultTicket, error);
}

//+------------------------------------------------------------------+
//| Send trade result                                                  |
//+------------------------------------------------------------------+
void SendTradeResult(string requestId, bool success, int ticket, string error)
{
   double execPrice = success ? trade.ResultPrice() : 0;

   string json = StringFormat(
      "{\"type\":\"trade_result\",\"requestId\":\"%s\",\"success\":%s,\"ticket\":%d,\"error\":\"%s\",\"errorCode\":%d,\"price\":%.5f,\"time\":%d}",
      requestId,
      success ? "true" : "false",
      ticket,
      error,
      success ? 0 : trade.ResultRetcode(),
      execPrice,
      (int)TimeCurrent()
   );

   SendMessage(json);
}

//+------------------------------------------------------------------+
//| Send trade history                                                 |
//+------------------------------------------------------------------+
void SendTradeHistory(datetime fromTime, datetime toTime)
{
   string trades = "[";
   bool first = true;

   // Select history
   if(!HistorySelect(fromTime, toTime))
   {
      Print("[TIME] Failed to select history");
      SendMessage("{\"type\":\"history\",\"trades\":[]}");
      return;
   }

   for(int i = 0; i < HistoryDealsTotal(); i++)
   {
      ulong dealTicket = HistoryDealGetTicket(i);
      if(dealTicket > 0)
      {
         ENUM_DEAL_ENTRY entry = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(dealTicket, DEAL_ENTRY);
         // Only include entry and exit deals (not balance operations)
         if(entry == DEAL_ENTRY_IN || entry == DEAL_ENTRY_OUT)
         {
            if(!first) trades += ",";
            first = false;

            trades += StringFormat(
               "{\"ticket\":%d,\"symbol\":\"%s\",\"type\":%d,\"volume\":%.2f,\"price\":%.5f,\"swap\":%.2f,\"commission\":%.2f,\"profit\":%.2f,\"comment\":\"%s\",\"magicNumber\":%d,\"time\":%d,\"entry\":%d}",
               dealTicket,
               HistoryDealGetString(dealTicket, DEAL_SYMBOL),
               HistoryDealGetInteger(dealTicket, DEAL_TYPE),
               HistoryDealGetDouble(dealTicket, DEAL_VOLUME),
               HistoryDealGetDouble(dealTicket, DEAL_PRICE),
               HistoryDealGetDouble(dealTicket, DEAL_SWAP),
               HistoryDealGetDouble(dealTicket, DEAL_COMMISSION),
               HistoryDealGetDouble(dealTicket, DEAL_PROFIT),
               HistoryDealGetString(dealTicket, DEAL_COMMENT),
               HistoryDealGetInteger(dealTicket, DEAL_MAGIC),
               (int)HistoryDealGetInteger(dealTicket, DEAL_TIME),
               entry
            );
         }
      }
   }

   trades += "]";

   string json = "{\"type\":\"history\",\"trades\":" + trades + "}";
   SendMessage(json);
}

//+------------------------------------------------------------------+
//| Simple JSON string extractor                                       |
//+------------------------------------------------------------------+
string GetJSONString(string json, string key)
{
   string search = "\"" + key + "\":\"";
   int pos = StringFind(json, search);
   if(pos < 0) return "";

   pos += StringLen(search);
   int endPos = StringFind(json, "\"", pos);
   if(endPos < 0) return "";

   return StringSubstr(json, pos, endPos - pos);
}

//+------------------------------------------------------------------+
//| Simple JSON number extractor                                       |
//+------------------------------------------------------------------+
double GetJSONDouble(string json, string key)
{
   string search = "\"" + key + "\":";
   int pos = StringFind(json, search);
   if(pos < 0) return 0;

   pos += StringLen(search);

   // Skip whitespace and quotes
   while(pos < StringLen(json))
   {
      ushort ch = StringGetCharacter(json, pos);
      if(ch != ' ' && ch != '"') break;
      pos++;
   }

   int endPos = pos;
   while(endPos < StringLen(json))
   {
      ushort ch = StringGetCharacter(json, endPos);
      if(ch == ',' || ch == '}' || ch == '"' || ch == ' ') break;
      endPos++;
   }

   string value = StringSubstr(json, pos, endPos - pos);
   return StringToDouble(value);
}
//+------------------------------------------------------------------+
