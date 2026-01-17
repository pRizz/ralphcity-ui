import { useRef, useCallback, useEffect, useState } from "react";
import type {
  WsClientMessage,
  WsServerMessage,
  OutputStream,
  SessionStatus,
} from "@/api/types";

const WS_URL = "ws://localhost:3000/api/ws";
const RECONNECT_INTERVAL = 3000;
const PING_INTERVAL = 30000;

export interface OutputLine {
  stream: OutputStream;
  content: string;
  timestamp: Date;
}

export interface UseWebSocketOptions {
  onOutput?: (sessionId: string, line: OutputLine) => void;
  onStatus?: (sessionId: string, status: SessionStatus) => void;
  onError?: (message: string) => void;
}

export interface UseWebSocketReturn {
  isConnected: boolean;
  subscribe: (sessionId: string) => void;
  unsubscribe: (sessionId: string) => void;
  cancel: (sessionId: string) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const subscribedSessionsRef = useRef<Set<string>>(new Set());
  const [isConnected, setIsConnected] = useState(false);

  // Store callbacks in refs to avoid reconnection on callback changes
  const onOutputRef = useRef(options.onOutput);
  const onStatusRef = useRef(options.onStatus);
  const onErrorRef = useRef(options.onError);

  useEffect(() => {
    onOutputRef.current = options.onOutput;
    onStatusRef.current = options.onStatus;
    onErrorRef.current = options.onError;
  }, [options.onOutput, options.onStatus, options.onError]);

  const send = useCallback((message: WsClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message = JSON.parse(event.data) as WsServerMessage;

      switch (message.type) {
        case "output":
          onOutputRef.current?.(message.session_id, {
            stream: message.stream,
            content: message.content,
            timestamp: new Date(),
          });
          break;

        case "status":
          onStatusRef.current?.(message.session_id, message.status);
          break;

        case "error":
          onErrorRef.current?.(message.message);
          break;

        case "subscribed":
          subscribedSessionsRef.current.add(message.session_id);
          break;

        case "unsubscribed":
          subscribedSessionsRef.current.delete(message.session_id);
          break;

        case "pong":
          // Connection is alive
          break;
      }
    } catch (e) {
      console.error("Failed to parse WebSocket message:", e);
    }
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      setIsConnected(true);

      // Re-subscribe to any sessions we were tracking
      subscribedSessionsRef.current.forEach((sessionId) => {
        send({ type: "subscribe", session_id: sessionId });
      });

      // Start ping interval
      pingIntervalRef.current = setInterval(() => {
        send({ type: "ping" });
      }, PING_INTERVAL);
    };

    ws.onclose = () => {
      setIsConnected(false);

      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }

      // Schedule reconnect
      reconnectTimeoutRef.current = setTimeout(connect, RECONNECT_INTERVAL);
    };

    ws.onerror = () => {
      // onclose will be called after this
    };

    ws.onmessage = handleMessage;

    wsRef.current = ws;
  }, [send, handleMessage]);

  // Connect on mount
  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const subscribe = useCallback(
    (sessionId: string) => {
      subscribedSessionsRef.current.add(sessionId);
      send({ type: "subscribe", session_id: sessionId });
    },
    [send]
  );

  const unsubscribe = useCallback(
    (sessionId: string) => {
      subscribedSessionsRef.current.delete(sessionId);
      send({ type: "unsubscribe", session_id: sessionId });
    },
    [send]
  );

  const cancel = useCallback(
    (sessionId: string) => {
      send({ type: "cancel", session_id: sessionId });
    },
    [send]
  );

  return {
    isConnected,
    subscribe,
    unsubscribe,
    cancel,
  };
}
