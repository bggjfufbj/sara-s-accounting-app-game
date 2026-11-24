import type { ClientMessage, ServerMessage } from '../game/types';

type MessageListener = (msg: ServerMessage) => void;
type StatusListener = (connected: boolean) => void;

export class ArenaSocketClient {
  private ws: WebSocket | null = null;
  private listeners = new Set<MessageListener>();
  private statusListeners = new Set<StatusListener>();
  private queue: ClientMessage[] = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private closedManually = false;
  private lifecycleBound = false;

  private bindMobileLifecycle(): void {
    if (this.lifecycleBound || typeof window === 'undefined') return;
    this.lifecycleBound = true;
    const ensureConnected = () => {
      if (!this.closedManually && !document.hidden) {
        if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
          this.connect();
        }
      }
    };
    document.addEventListener('visibilitychange', ensureConnected);
    window.addEventListener('online', ensureConnected);
  }

  connect(): void {
    this.bindMobileLifecycle();
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.closedManually = false;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(url);
    this.ws = ws;

    ws.addEventListener('open', () => {
      this.emitStatus(true);
      while (this.queue.length > 0 && ws.readyState === WebSocket.OPEN) {
        const next = this.queue.shift()!;
        ws.send(JSON.stringify(next));
      }
    });

    ws.addEventListener('message', (ev) => {
      try {
        const parsed = JSON.parse(String(ev.data)) as ServerMessage;
        for (const fn of this.listeners) fn(parsed);
      } catch {
        // Ignore malformed server packets
      }
    });

    ws.addEventListener('close', () => {
      this.emitStatus(false);
      this.ws = null;
      if (!this.closedManually) {
        this.reconnectTimer = setTimeout(() => this.connect(), 1400);
      }
    });

    ws.addEventListener('error', () => {
      ws.close();
    });
  }

  send(msg: ClientMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    } else {
      this.queue.push(msg);
      this.connect();
    }
  }

  onMessage(fn: MessageListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  onStatus(fn: StatusListener): () => void {
    this.statusListeners.add(fn);
    return () => this.statusListeners.delete(fn);
  }

  private emitStatus(connected: boolean): void {
    for (const fn of this.statusListeners) fn(connected);
  }

  disconnect(): void {
    this.closedManually = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
  }
}

export const arenaSocket = new ArenaSocketClient();
