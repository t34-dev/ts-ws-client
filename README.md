[![ISC License](http://img.shields.io/badge/license-ISC-blue.svg)](http://copyfree.org)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-blue?logo=typescript&ver=1722867874)
![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-green?logo=node.js&ver=1722867874)
![GitHub release (latest by date)](https://img.shields.io/github/v/release/t34-dev/ts-ws-client?ver=1722867874)
![GitHub tag (latest by date)](https://img.shields.io/github/v/tag/t34-dev/ts-ws-client?sort=semver&style=flat&logo=git&logoColor=white&label=Latest%20Version&color=blue&ver=1722867874)

# TypeScript WebSocket Client

A robust and flexible WebSocket client implementation in TypeScript, designed for use in React, Node.js, and web projects.
Based on https://github.com/t34-dev/ts-universal-package

![TypeScript WebSocket Client Logo](./assets/example.png)

- [Demo](https://t34-dev.github.io/ts-ws-client/)

## Features

- Easy-to-use WebSocket client implementation
- Automatic reconnection with exponential backoff
- Event-based architecture for easy integration
- TypeScript support for better developer experience
- Compatible with React, Node.js, and web projects
- Customizable logging and debugging options

## Installation

```bash
npm install @t34-dev/ts-ws-client
```

or

```bash
yarn add @t34-dev/ts-ws-client
```

## Usage

### Basic Example

Here's a basic example of how to use the WebSocket client:

```typescript
import { WebSocketClient } from '@t34-dev/ts-ws-client';

const client = new WebSocketClient({
  connectionName: 'MyConnection',
  url: 'wss://echo.websocket.org',
  debugging: true,
  onOpened: (info) => console.log('Connected:', info),
  onClosed: (info) => console.log('Disconnected:', info),
  onError: (info) => console.error('Error:', info),
  onUpdate: (info) => console.log('Received:', info.data),
});

client.open();

// Send a message
client.sendMessage('Hello, WebSocket!');

// Close the connection
client.close();
```

### Node.js Example

Here's an example of how to use the WebSocket client in a Node.js environment:

```typescript
import { WebSocketClient } from '@t34-dev/ts-ws-client';

const client = new WebSocketClient({
  connectionName: 'NodeConnection',
  url: 'wss://echo.websocket.org',
  debugging: true,
  onOpened: (info) => {
    console.log('Connected:', info);
    // Send a message every 5 seconds
    setInterval(() => {
      client.sendMessage('Ping from Node.js');
    }, 5000);
  },
  onClosed: (info) => console.log('Disconnected:', info),
  onError: (info) => console.error('Error:', info),
  onUpdate: (info) => console.log('Received:', info.data),
});

client.open();

// Handle process termination
process.on('SIGINT', () => {
  console.log('Closing connection...');
  client.close();
  process.exit();
});
```

### React Example

Here's an example of how to use the WebSocket client in a React component:

```tsx
import React, { useEffect, useState } from 'react';
import { WebSocketClient } from '@t34-dev/ts-ws-client';

const WebSocketComponent: React.FC = () => {
  const [client, setClient] = useState<WebSocketClient | null>(null);
  const [messages, setMessages] = useState<string[]>([]);

  useEffect(() => {
    const wsClient = new WebSocketClient({
      connectionName: 'ReactConnection',
      url: 'wss://echo.websocket.org',
      debugging: true,
      onOpened: (info) => console.log('Connected:', info),
      onClosed: (info) => console.log('Disconnected:', info),
      onError: (info) => console.error('Error:', info),
      onUpdate: (info) => {
        setMessages((prevMessages) => [...prevMessages, info.data as string]);
      },
    });

    setClient(wsClient);
    wsClient.open();

    return () => {
      wsClient.close();
    };
  }, []);

  const sendMessage = () => {
    if (client) {
      client.sendMessage('Hello from React!');
    }
  };

  return (
    <div>
      <button onClick={sendMessage}>Send Message</button>
      <ul>
        {messages.map((message, index) => (
          <li key={index}>{message}</li>
        ))}
      </ul>
    </div>
  );
};

export default WebSocketComponent;
```

## API

### `WebSocketClient`

The main class for creating and managing WebSocket connections.

#### Constructor

```typescript
new WebSocketClient(options: WebSocketOptions)
```

- `options`: Configuration options for the WebSocket client

#### Methods

- `open()`: Opens the WebSocket connection
- `close()`: Closes the WebSocket connection
- `breakConnection()`: Forcibly breaks the connection
- `sendMessage(data: string)`: Sends a message through the WebSocket
- `subscribe(data: string)`: Subscribes to a topic (stores the request)
- `unsubscribe(data: string)`: Unsubscribes from a topic
- `getInfo()`: Returns current connection information
- `getStoredRequests()`: Returns the set of stored requests
- `clearStoredRequests()`: Clears all stored requests

## Development

To set up the development environment:

1. Clone the repository
2. Install dependencies: `npm install` or `yarn install`
3. Run tests: `npm test` or `yarn test`
4. Build the package: `npm run build` or `yarn build`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the ISC License.

## Links

- [GitHub Repository](https://github.com/t34-dev/ts-ws-client)
- [npm Package](https://www.npmjs.com/package/@t34-dev/ts-ws-client)
- [Demo](https://t34-dev.github.io/ts-ws-client/)

---

Developed with ❤️ by [T34](https://github.com/t34-dev)
