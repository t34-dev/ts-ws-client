export enum WebSocketStatus {
  INIT = 'INIT',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  STOPPED = 'STOPPED',
}

export type WebSocketConn = {
  connectionName: string;
  url: string;
  status: WebSocketStatus;
};

export type WebsocketError = {
  code: string;
  error: string;
  message: string;
  name: string;
  success: boolean;
};

export type WebSocketInfo = {
  error?: WebsocketError;
  conn?: WebSocketConn;
  data?: string;
  event?: MessageEvent;
};

export type WebSocketStore = Set<string>;

export type WebSocketOptions = {
  connectionName: string;
  url: string;
  debugging?: boolean;
  debuggingMessages?: boolean;
  reconnectTimeout?: number;
  maxStoredRequests?: number;
  onRestore?: (data: WebSocketStore) => WebSocketStore;
  onOpened?: (conn: WebSocketInfo) => void;
  onError?: (conn: WebSocketInfo) => void;
  onClosed?: (conn: WebSocketInfo) => void;
  onConnection?: (conn: WebSocketInfo) => void;
  onUpdate?: (data: WebSocketInfo) => void;
};
