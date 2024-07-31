import {
  WebSocketStatus,
  WebSocketConn,
  WebsocketError,
  WebSocketInfo,
  WebSocketStore,
  WebSocketOptions,
} from './types';
import { INITIAL_RECONNECT_DELAY, MAX_RECONNECT_DELAY, MAX_STORED_REQUESTS } from './constants';
import { getErrorMessageFromE } from '@/utils/errors';

export class WebSocketClient {
  readonly connectionName: string;
  readonly url: string;
  readonly debug: boolean;
  readonly debugMessage: boolean;
  private ws: WebSocket | null = null;
  private status: WebSocketStatus;
  private prevStatus: WebSocketStatus = WebSocketStatus.INIT;
  private isChangePrevStatus = false;
  private reconnectDelay: number = INITIAL_RECONNECT_DELAY;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isStopped: boolean = false;
  protected options: WebSocketOptions;
  private storedRequests: WebSocketStore = new Set();
  private maxStoredRequests: number;

  // Event handlers
  private onRestore?: (data: WebSocketStore) => WebSocketStore | undefined;
  private onOpened?: (data: WebSocketInfo) => void;
  private onError?: (data: WebSocketInfo) => void;
  private onClosed?: (data: WebSocketInfo) => void;
  private onConnection?: (data: WebSocketInfo) => void;
  private onUpdate?: (data: WebSocketInfo) => void;

  constructor(options: WebSocketOptions) {
    this.connectionName = options.connectionName;
    this.url = options.url || 'url';
    this.debug = options.debugging || false;
    this.debugMessage = options.debuggingMessages || false;
    this.maxStoredRequests = options.maxStoredRequests || MAX_STORED_REQUESTS;
    this.storedRequests = new Set();

    this.status = WebSocketStatus.INIT;

    this.onRestore = options.onRestore;
    this.onOpened = options.onOpened;
    this.onError = options.onError;
    this.onClosed = options.onClosed;
    this.onConnection = options.onConnection;
    this.onUpdate = options.onUpdate;

    this.options = options;
  }

  protected log(msg: string, type: 'log' | 'error' | 'warn' = 'log'): void {
    const data = `[WS:${this.connectionName}] ${msg}`;
    switch (type) {
      case 'error': {
        console.error(data);
        return;
      }
      case 'warn': {
        console.warn(data);
        return;
      }
      default: {
        console.log(data);
      }
    }
  }

  open(): void {
    if (this.debug) {
      this.log(`========================================== ${this.status}`);
    }
    if ([WebSocketStatus.CONNECTED].includes(this.status)) {
      if (this.debug) {
        this.log('Connection already established');
      }
      return;
    }
    if (this.isChangePrevStatus) {
      this.prevStatus = this.status;
    }

    if ([WebSocketStatus.INIT, WebSocketStatus.STOPPED, WebSocketStatus.CONNECTING].includes(this.status)) {
      this.status = WebSocketStatus.CONNECTING;
      if (this.debug) {
        this.log('Initializing connection');
      }
      this.onConnection?.({
        conn: this.getConnectionInfo(),
      });
    }
    try {
      this.createNewConnection();
    } catch (e) {
      if (this.debug) {
        this.log('Error creating connection', 'error');
        console.error(e);
      }
      this.onError?.({
        conn: this.getConnectionInfo(),
        data: getErrorMessageFromE(e),
      });
    }
  }

  private createNewConnection(): void {
    this.isStopped = false;
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.isChangePrevStatus = true;
      this.handleOpen();

      if (this.prevStatus !== WebSocketStatus.INIT) {
        if (this.onRestore) {
          const newStore = this.onRestore(this.storedRequests);
          if (newStore !== undefined) {
            this.storedRequests = new Set(newStore);
          }
        }
        this.storedRequests.forEach((elem) => {
          this.ws!.send(elem);
        });
      }
    };
    this.ws.onclose = () => this.handleClose();
    this.ws.onerror = (error) => this.handleError(error as ErrorEvent);
    this.ws.onmessage = (event) => this.handleUpdateMessage(event);
  }

  close(): void {
    if (![WebSocketStatus.CONNECTED, WebSocketStatus.CONNECTING].includes(this.status)) {
      return;
    }
    this.isStopped = true;
    this.clearReconnectTimer();

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
      this.ws = null;
    }

    this.status = WebSocketStatus.STOPPED;

    if (this.debug) {
      this.log('Connection closed');
    }
    this.onClosed?.({
      conn: this.getConnectionInfo(),
    });
  }

  breakConnection(): void {
    if (![WebSocketStatus.CONNECTED, WebSocketStatus.CONNECTING].includes(this.status)) return;

    if (this.debug) {
      this.log('Connection forcibly broken');
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  getInfo(): WebSocketInfo {
    return {
      conn: this.getConnectionInfo(),
    };
  }

  private _send(data: string): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      if (this.debugMessage) {
        this.log('Sent message: ' + this.parseMessageForDebug(data));
      }
      this.ws.send(data);
      return true;
    } else {
      if (this.debug) {
        this.log('Failed to send data: socket is not connected');
      }
      this.onError?.({
        conn: this.getConnectionInfo(),
        data: 'Bad Request: The endpoint that you are trying to connect to is invalid',
      });
    }
    return false;
  }

  sendMessage(data: string): boolean {
    return this._send(data);
  }

  subscribe(data: string): void {
    if (this._send(data)) {
      if (this.storedRequests.size >= this.maxStoredRequests) {
        const oldestRequest = this.storedRequests.values().next().value;
        this.storedRequests.delete(oldestRequest);
      }
      this.storedRequests.add(data);
    }
  }

  unsubscribe(data: string): void {
    if (this._send(data)) this.storedRequests.delete(data);
  }

  removeStoreKey(key: string): void {
    this.storedRequests.delete(key);
  }

  clearStoredRequests(): void {
    this.storedRequests.clear();
  }

  getStoredRequests(): WebSocketStore {
    return new Set(this.storedRequests);
  }

  private handleOpen(): void {
    if ([WebSocketStatus.CONNECTED].includes(this.status)) return;
    this.status = WebSocketStatus.CONNECTED;
    this.clearReconnectTimer();
    this.reconnectDelay = INITIAL_RECONNECT_DELAY;
    if (this.debug) {
      this.log('Connection established');
    }
    this.onOpened?.({
      conn: this.getConnectionInfo(),
    });
  }

  private handleClose(): void {
    if (![WebSocketStatus.CONNECTED, WebSocketStatus.CONNECTING, WebSocketStatus.DISCONNECTED].includes(this.status))
      return;
    this.status = WebSocketStatus.DISCONNECTED;
    this.ws = null;

    if (this.debug) {
      this.log('Connection closed');
    }

    this.onClosed?.({
      conn: this.getConnectionInfo(),
    });

    if (!this.isStopped) {
      this.startReconnectTimer();
    }
  }

  private startReconnectTimer(): void {
    this.status = WebSocketStatus.CONNECTING;

    this.reconnectTimer = setTimeout(() => {
      if (this.debug) {
        this.log('Trying to reconnect...');
      }
      this.open();
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, MAX_RECONNECT_DELAY);
    }, this.reconnectDelay);
  }

  private handleError(error: ErrorEvent): void {
    const websocketError: WebsocketError = {
      code: 'WebSocketError',
      error: error.type,
      message: error.message || 'WebSocket error',
      name: 'WebSocketError',
      success: false,
    };

    if (this.debug) {
      this.log('WebSocket error: ' + error.message, 'error');
    }
    this.onError?.({
      conn: this.getConnectionInfo(),
      data: websocketError.message,
      error: websocketError,
    });
  }

  private handleUpdateMessage(event: MessageEvent): void {
    if (this.status === WebSocketStatus.CONNECTED) {
      const data: WebSocketInfo = {
        conn: this.getConnectionInfo(),
        data: event.data,
      };
      this.onUpdate?.(data);
    } else {
      this.onError?.({
        conn: this.getConnectionInfo(),
        data: event.data,
        event,
      });
    }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private getConnectionInfo(): WebSocketConn {
    return {
      connectionName: this.connectionName,
      url: this.url,
      status: this.status,
    };
  }

  private parseMessageForDebug(data: string): string {
    try {
      return JSON.stringify(JSON.parse(data), null, 2);
    } catch (e) {
      return data;
    }
  }

  dispose(): void {
    this.close();
    this.clearReconnectTimer();
    this.clearStoredRequests();
  }
}
