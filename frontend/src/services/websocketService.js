function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try { return crypto.randomUUID(); } catch (_) {}
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0;
    var v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

class WebSocketService {
  constructor() {
    this.ws = null;
    this.listeners = {};
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000;
    this.sessionId = null;
    this.playerId = null;
    this.intentionalClose = false;
    this.currentUrl = null;
    this.pendingMessages = [];
  }

  connect(sessionId, playerId) {
    this.sessionId = sessionId;
    this.playerId = playerId;
    this.intentionalClose = false;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = window.location.port;
    this.currentUrl = port
      ? `${protocol}//${host}:${port}/ws/sessions/${sessionId}/`
      : `${protocol}//${host}/ws/sessions/${sessionId}/`;

    this._createConnection(this.currentUrl);
  }

  _createConnection(url) {
    if (this.ws) {
      this.intentionalClose = true;
      this.ws.close();
    }
    this.ws = new WebSocket(url);
    this.intentionalClose = false;

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.emit('connected');
      while (this.pendingMessages.length > 0) {
        const msg = this.pendingMessages.shift();
        this.ws.send(msg);
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.emit(data.type, data);
      } catch (e) {
        console.error('WebSocket message parse error:', e);
      }
    };

    this.ws.onclose = () => {
      if (!this.intentionalClose && this.reconnectAttempts < this.maxReconnectAttempts) {
        const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts);
        this.reconnectAttempts++;
        this.emit('reconnecting', { attempt: this.reconnectAttempts, delay });
        setTimeout(() => {
          if (!this.intentionalClose) {
            this._createConnection(url);
          }
        }, delay);
      }
      this.emit('disconnected');
    };

    this.ws.onerror = (err) => {
      this.emit('error', err);
    };
  }

  send(type, payload = {}) {
    const msg = JSON.stringify({ type, ...payload });
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(msg);
    } else if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
      this.pendingMessages.push(msg);
    }
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return () => {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    };
  }

  emit(event, data) {
    const eventListeners = this.listeners[event] || [];
    eventListeners.forEach(callback => {
      try { callback(data); } catch (e) { console.error('WS listener error:', e); }
    });
  }

  disconnect() {
    this.intentionalClose = true;
    this.pendingMessages = [];
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.currentUrl = null;
  }
}

export { generateUUID };

const wsService = new WebSocketService();
export default wsService;
