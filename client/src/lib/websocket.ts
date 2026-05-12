import { useEffect, useRef, useState } from 'react';

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export function useWebSocket(eventId: string | null) {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  useEffect(() => {
    if (!eventId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      setIsConnected(true);
      // Join the event room
      ws.current?.send(JSON.stringify({ type: 'join', eventId }));
    };

    ws.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        setLastMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.current.onclose = () => {
      setIsConnected(false);
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    return () => {
      ws.current?.close();
    };
  }, [eventId]);

  return { isConnected, lastMessage };
}

/**
 * Connect to the WebSocket server and join multiple event rooms at once.
 * Useful for dashboard-style pages that need live updates across many events.
 */
export function useWebSocketMulti(eventIds: string[]) {
  const ws = useRef<WebSocket | null>(null);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  // stableKey lets us avoid reconnecting when the array reference changes but
  // the sorted contents are identical (e.g. React re-renders with a new array
  // literal that has the same IDs). Suppressing exhaustive-deps is intentional
  // here — we only want to reconnect when the actual set of IDs changes.
  const stableKey = eventIds.slice().sort().join(',');

  useEffect(() => {
    if (eventIds.length === 0) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      for (const id of eventIds) {
        ws.current?.send(JSON.stringify({ type: 'join', eventId: id }));
      }
    };

    ws.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        setLastMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      ws.current?.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stableKey]);

  return { lastMessage };
}
