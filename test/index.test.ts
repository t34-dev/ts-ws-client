import { WebSocketClient, WebSocketOptions, WebSocketStatus } from '@/index';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock for WebSocket
class MockWebSocket {
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((error: ErrorEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  readyState: number = WebSocket.CONNECTING;

  constructor(public url: string) {}

  close(): void {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) this.onclose();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  send(_data: string): void {}
}

// Mock for global WebSocket
vi.stubGlobal('WebSocket', MockWebSocket);

describe('WebSocketClient', () => {
  let client: WebSocketClient;
  let mockOptions: WebSocketOptions;

  beforeEach(() => {
    mockOptions = {
      connectionName: 'TestConnection',
      url: 'ws://test.com',
      debugging: true,
      onOpened: vi.fn(),
      onClosed: vi.fn(),
      onError: vi.fn(),
      onUpdate: vi.fn(),
      onConnection: vi.fn(),
      onRestore: vi.fn(),
    };
    client = new WebSocketClient(mockOptions);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create an instance of WebSocketClient', () => {
    expect(client).toBeInstanceOf(WebSocketClient);
  });

  it('should open a connection', () => {
    client.open();
    expect(client['status']).toBe(WebSocketStatus.CONNECTING);
    expect(mockOptions.onConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        conn: expect.objectContaining({
          status: WebSocketStatus.CONNECTING,
        }),
      }),
    );
  });

  it('should call onOpened on successful connection', () => {
    client.open();
    const mockWs = client['ws'] as MockWebSocket;
    mockWs.readyState = WebSocket.OPEN;
    mockWs.onopen!();
    expect(mockOptions.onOpened).toHaveBeenCalledWith(
      expect.objectContaining({
        conn: expect.objectContaining({
          status: WebSocketStatus.CONNECTED,
        }),
      }),
    );
    expect(client['status']).toBe(WebSocketStatus.CONNECTED);
  });

  it('should call onClosed when connection is closed', () => {
    client.open();
    const mockWs = client['ws'] as MockWebSocket;

    // Simulate successful connection
    mockWs.readyState = WebSocket.OPEN;
    mockWs.onopen!();

    // Close the connection
    mockWs.close();

    expect(mockOptions.onClosed).toHaveBeenCalledWith(
      expect.objectContaining({
        conn: expect.objectContaining({
          status: WebSocketStatus.DISCONNECTED,
        }),
      }),
    );

    // Check if status changed to CONNECTING (Auto reconnection)
    expect(client['status']).toBe(WebSocketStatus.CONNECTING);
  });

  it('should send messages', () => {
    client.open();
    const mockWs = client['ws'] as MockWebSocket;
    mockWs.readyState = WebSocket.OPEN;
    const sendSpy = vi.spyOn(mockWs, 'send');
    client.sendMessage('test message');
    expect(sendSpy).toHaveBeenCalledWith('test message');
  });

  it('should add subscriptions', () => {
    client.open();
    const mockWs = client['ws'] as MockWebSocket;
    mockWs.readyState = WebSocket.OPEN;
    client.subscribe('subscription data');
    expect(client['storedRequests'].has('subscription data')).toBe(true);
  });

  it('should remove subscriptions', () => {
    client.open();
    const mockWs = client['ws'] as MockWebSocket;
    mockWs.readyState = WebSocket.OPEN;
    client.subscribe('subscription data');
    client.unsubscribe('subscription data');
    expect(client['storedRequests'].has('subscription data')).toBe(false);
  });

  it('should call onUpdate when receiving a message', () => {
    client.open();
    const mockWs = client['ws'] as MockWebSocket;
    mockWs.readyState = WebSocket.OPEN;
    mockWs.onopen!();
    const mockMessage = new MessageEvent('message', { data: 'test data' });
    mockWs.onmessage!(mockMessage);
    expect(mockOptions.onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: 'test data',
      }),
    );
  });

  it('should clear stored requests when calling clearStoredRequests', () => {
    client.subscribe('test subscription');
    client.clearStoredRequests();
    expect(client.getStoredRequests().size).toBe(0);
  });

  it('should limit the number of stored requests', () => {
    const maxRequests = 5;
    client = new WebSocketClient({ ...mockOptions, maxStoredRequests: maxRequests });
    client.open();
    const mockWs = client['ws'] as MockWebSocket;
    mockWs.readyState = WebSocket.OPEN;
    for (let i = 0; i < maxRequests + 2; i++) {
      client.subscribe(`subscription ${i}`);
    }
    expect(client['storedRequests'].size).toBe(maxRequests);
  });

  it('should call onRestore when reconnecting', () => {
    client.open();
    const mockWs = client['ws'] as MockWebSocket;
    mockWs.readyState = WebSocket.OPEN;
    mockWs.onopen!();

    client.subscribe('test subscription');

    // Simulate disconnection and reconnection
    mockWs.close();
    client.open();

    const newMockWs = client['ws'] as MockWebSocket;
    newMockWs.readyState = WebSocket.OPEN;
    newMockWs.onopen!();

    expect(mockOptions.onRestore).toHaveBeenCalledWith(expect.any(Set));
  });

  it('should handle forced connection break', () => {
    client.open();
    const mockWs = client['ws'] as MockWebSocket;
    mockWs.readyState = WebSocket.OPEN;
    mockWs.onopen!();

    client.breakConnection();

    expect(client['ws']).toBeNull();
    expect(mockOptions.onClosed).toHaveBeenCalled();
  });

  it('should handle errors', () => {
    client.open();
    const mockWs = client['ws'] as MockWebSocket;

    // Create a generic error object instead of using ErrorEvent
    const mockError = {
      type: 'error',
      message: 'Test error',
    };

    // Trigger the error handler
    mockWs.onerror!(mockError as ErrorEvent);

    expect(mockOptions.onError).toHaveBeenCalledWith(
      expect.objectContaining({
        conn: expect.any(Object),
        data: 'Test error',
        error: expect.objectContaining({
          message: 'Test error',
        }),
      }),
    );
  });
});
