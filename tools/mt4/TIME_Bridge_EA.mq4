//+------------------------------------------------------------------+
//|                                              TIME_Bridge_EA.mq4  |
//|                        TIME Meta-Intelligence Trading Platform   |
//|                              https://github.com/tdmboyd-dev/TIME |
//+------------------------------------------------------------------+
#property copyright "TIME Meta-Intelligence"
#property link      "https://github.com/tdmboyd-dev/TIME"
#property version   "1.00"
#property strict

// Connection Settings
input string   TIME_Host = "127.0.0.1";     // TIME Server Host
input int      TIME_Port = 15555;            // TIME Server Port
input int      MagicNumber = 123456;         // Magic Number for trades
input int      UpdateInterval = 1000;        // Update interval (ms)
input bool     EnableTrading = true;         // Enable trade execution
input bool     EnableTickStream = true;      // Stream tick data

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
   Print("[TIME] Initializing TIME Bridge EA v1.0");
   Print("[TIME] Connecting to ", TIME_Host, ":", TIME_Port);

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
   StringToCharArray(message, data, 0, StringLen(message));

   int sent = SocketSend(socket, data, ArraySize(data) - 1);
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
      string data = CharArrayToString(buffer, 0, received);
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
      if(error != 0 && error != 4014) // 4014 = no data available
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
   // Simple JSON parsing (MT4 doesn't have native JSON support)
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
      string requestId = GetJSONString(json, "requestId");
      int fromTime = (int)GetJSONDouble(json, "from");
      int toTime = (int)GetJSONDouble(json, "to");
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
      "{\"type\":\"auth_response\",\"success\":true,\"version\":\"mt4\",\"broker\":\"%s\",\"account\":\"%d\",\"server\":\"%s\"}",
      AccountCompany(),
      AccountNumber(),
      AccountServer()
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
   string json = StringFormat(
      "{\"type\":\"account_info\",\"account\":\"%d\",\"broker\":\"%s\",\"name\":\"%s\",\"currency\":\"%s\",\"balance\":%.2f,\"equity\":%.2f,\"margin\":%.2f,\"freeMargin\":%.2f,\"marginLevel\":%.2f,\"leverage\":%d,\"profit\":%.2f,\"server\":\"%s\",\"tradeAllowed\":%s,\"hedgingAllowed\":%s}",
      AccountNumber(),
      AccountCompany(),
      AccountName(),
      AccountCurrency(),
      AccountBalance(),
      AccountEquity(),
      AccountMargin(),
      AccountFreeMargin(),
      AccountMargin() > 0 ? (AccountEquity() / AccountMargin() * 100) : 0,
      AccountLeverage(),
      AccountProfit(),
      AccountServer(),
      IsTradeAllowed() ? "true" : "false",
      "true" // MT4 supports hedging by default
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

   for(int i = 0; i < OrdersTotal(); i++)
   {
      if(OrderSelect(i, SELECT_BY_POS, MODE_TRADES))
      {
         if(OrderType() == OP_BUY || OrderType() == OP_SELL)
         {
            if(!first) positions += ",";
            first = false;

            positions += StringFormat(
               "{\"ticket\":%d,\"symbol\":\"%s\",\"type\":%d,\"volume\":%.2f,\"openPrice\":%.5f,\"currentPrice\":%.5f,\"stopLoss\":%.5f,\"takeProfit\":%.5f,\"swap\":%.2f,\"profit\":%.2f,\"comment\":\"%s\",\"magicNumber\":%d,\"openTime\":%d}",
               OrderTicket(),
               OrderSymbol(),
               OrderType(),
               OrderLots(),
               OrderOpenPrice(),
               OrderType() == OP_BUY ? MarketInfo(OrderSymbol(), MODE_BID) : MarketInfo(OrderSymbol(), MODE_ASK),
               OrderStopLoss(),
               OrderTakeProfit(),
               OrderSwap(),
               OrderProfit(),
               OrderComment(),
               OrderMagicNumber(),
               (int)OrderOpenTime()
            );
         }
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
      if(OrderSelect(i, SELECT_BY_POS, MODE_TRADES))
      {
         if(OrderType() >= OP_BUYLIMIT && OrderType() <= OP_SELLSTOP)
         {
            if(!first) orders += ",";
            first = false;

            orders += StringFormat(
               "{\"ticket\":%d,\"symbol\":\"%s\",\"type\":%d,\"volume\":%.2f,\"price\":%.5f,\"stopLoss\":%.5f,\"takeProfit\":%.5f,\"expiration\":%d,\"comment\":\"%s\",\"magicNumber\":%d}",
               OrderTicket(),
               OrderSymbol(),
               OrderType(),
               OrderLots(),
               OrderOpenPrice(),
               OrderStopLoss(),
               OrderTakeProfit(),
               (int)OrderExpiration(),
               OrderComment(),
               OrderMagicNumber()
            );
         }
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
   string json = StringFormat(
      "{\"type\":\"tick\",\"symbol\":\"%s\",\"bid\":%.5f,\"ask\":%.5f,\"time\":%d,\"volume\":%d}",
      Symbol(),
      Bid,
      Ask,
      (int)TimeCurrent(),
      (int)Volume[0]
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
   int ticket = (int)GetJSONDouble(json, "ticket");
   string comment = GetJSONString(json, "comment");
   int deviation = (int)GetJSONDouble(json, "deviation");

   if(StringLen(comment) == 0) comment = "TIME";
   if(deviation == 0) deviation = 10;

   int result = -1;
   string error = "";

   // Execute trade based on action
   if(action == "buy")
   {
      double askPrice = MarketInfo(symbol, MODE_ASK);
      result = OrderSend(symbol, OP_BUY, volume, askPrice, deviation, stopLoss, takeProfit, comment, MagicNumber, 0, clrGreen);
   }
   else if(action == "sell")
   {
      double bidPrice = MarketInfo(symbol, MODE_BID);
      result = OrderSend(symbol, OP_SELL, volume, bidPrice, deviation, stopLoss, takeProfit, comment, MagicNumber, 0, clrRed);
   }
   else if(action == "buy_limit")
   {
      result = OrderSend(symbol, OP_BUYLIMIT, volume, price, deviation, stopLoss, takeProfit, comment, MagicNumber, 0, clrGreen);
   }
   else if(action == "sell_limit")
   {
      result = OrderSend(symbol, OP_SELLLIMIT, volume, price, deviation, stopLoss, takeProfit, comment, MagicNumber, 0, clrRed);
   }
   else if(action == "buy_stop")
   {
      result = OrderSend(symbol, OP_BUYSTOP, volume, price, deviation, stopLoss, takeProfit, comment, MagicNumber, 0, clrGreen);
   }
   else if(action == "sell_stop")
   {
      result = OrderSend(symbol, OP_SELLSTOP, volume, price, deviation, stopLoss, takeProfit, comment, MagicNumber, 0, clrRed);
   }
   else if(action == "close")
   {
      if(OrderSelect(ticket, SELECT_BY_TICKET))
      {
         double closePrice = OrderType() == OP_BUY ? MarketInfo(OrderSymbol(), MODE_BID) : MarketInfo(OrderSymbol(), MODE_ASK);
         double closeVolume = volume > 0 ? volume : OrderLots();

         if(OrderClose(ticket, closeVolume, closePrice, deviation, clrYellow))
         {
            result = ticket;
         }
      }
      else
      {
         error = "Order not found";
      }
   }
   else if(action == "modify")
   {
      if(OrderSelect(ticket, SELECT_BY_TICKET))
      {
         if(OrderModify(ticket, OrderOpenPrice(), stopLoss, takeProfit, 0, clrBlue))
         {
            result = ticket;
         }
      }
      else
      {
         error = "Order not found";
      }
   }

   // Get error if failed
   if(result <= 0 && StringLen(error) == 0)
   {
      int errCode = GetLastError();
      error = ErrorDescription(errCode);
   }

   // Send result
   SendTradeResult(requestId, result > 0, result, error);
}

//+------------------------------------------------------------------+
//| Send trade result                                                  |
//+------------------------------------------------------------------+
void SendTradeResult(string requestId, bool success, int ticket, string error)
{
   double execPrice = 0;
   if(success && ticket > 0 && OrderSelect(ticket, SELECT_BY_TICKET))
   {
      execPrice = OrderOpenPrice();
   }

   string json = StringFormat(
      "{\"type\":\"trade_result\",\"requestId\":\"%s\",\"success\":%s,\"ticket\":%d,\"error\":\"%s\",\"errorCode\":%d,\"price\":%.5f,\"time\":%d}",
      requestId,
      success ? "true" : "false",
      ticket,
      error,
      success ? 0 : GetLastError(),
      execPrice,
      (int)TimeCurrent()
   );

   SendMessage(json);
}

//+------------------------------------------------------------------+
//| Send trade history                                                 |
//+------------------------------------------------------------------+
void SendTradeHistory(int fromTime, int toTime)
{
   string trades = "[";
   bool first = true;

   for(int i = 0; i < OrdersHistoryTotal(); i++)
   {
      if(OrderSelect(i, SELECT_BY_POS, MODE_HISTORY))
      {
         if(OrderCloseTime() >= fromTime && OrderCloseTime() <= toTime)
         {
            if(OrderType() == OP_BUY || OrderType() == OP_SELL)
            {
               if(!first) trades += ",";
               first = false;

               trades += StringFormat(
                  "{\"ticket\":%d,\"symbol\":\"%s\",\"type\":%d,\"volume\":%.2f,\"openPrice\":%.5f,\"closePrice\":%.5f,\"stopLoss\":%.5f,\"takeProfit\":%.5f,\"swap\":%.2f,\"commission\":%.2f,\"profit\":%.2f,\"comment\":\"%s\",\"magicNumber\":%d,\"openTime\":%d,\"closeTime\":%d}",
                  OrderTicket(),
                  OrderSymbol(),
                  OrderType(),
                  OrderLots(),
                  OrderOpenPrice(),
                  OrderClosePrice(),
                  OrderStopLoss(),
                  OrderTakeProfit(),
                  OrderSwap(),
                  OrderCommission(),
                  OrderProfit(),
                  OrderComment(),
                  OrderMagicNumber(),
                  (int)OrderOpenTime(),
                  (int)OrderCloseTime()
               );
            }
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

   // Skip whitespace
   while(pos < StringLen(json) && (StringGetCharacter(json, pos) == ' ' || StringGetCharacter(json, pos) == '"'))
      pos++;

   int endPos = pos;
   while(endPos < StringLen(json))
   {
      int ch = StringGetCharacter(json, endPos);
      if(ch == ',' || ch == '}' || ch == '"' || ch == ' ') break;
      endPos++;
   }

   string value = StringSubstr(json, pos, endPos - pos);
   return StringToDouble(value);
}

//+------------------------------------------------------------------+
//| Error description                                                  |
//+------------------------------------------------------------------+
string ErrorDescription(int error)
{
   switch(error)
   {
      case 0:   return "No error";
      case 1:   return "No error, trade conditions not changed";
      case 2:   return "Common error";
      case 3:   return "Invalid trade parameters";
      case 4:   return "Trade server is busy";
      case 5:   return "Old version of the client terminal";
      case 6:   return "No connection with trade server";
      case 7:   return "Not enough rights";
      case 8:   return "Too frequent requests";
      case 9:   return "Malfunctional trade operation";
      case 64:  return "Account disabled";
      case 65:  return "Invalid account";
      case 128: return "Trade timeout";
      case 129: return "Invalid price";
      case 130: return "Invalid stops";
      case 131: return "Invalid trade volume";
      case 132: return "Market is closed";
      case 133: return "Trade is disabled";
      case 134: return "Not enough money";
      case 135: return "Price changed";
      case 136: return "Off quotes";
      case 137: return "Broker is busy";
      case 138: return "Requote";
      case 139: return "Order is locked";
      case 140: return "Long positions only allowed";
      case 141: return "Too many requests";
      case 145: return "Modification denied";
      case 146: return "Trade context is busy";
      case 147: return "Expirations are denied by broker";
      case 148: return "Amount of orders has reached the limit";
      default:  return "Unknown error " + IntegerToString(error);
   }
}
//+------------------------------------------------------------------+
