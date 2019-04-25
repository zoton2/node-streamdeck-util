import { EventEmitter } from 'events';
import ws from 'ws';
import * as url from 'url';

class StreamDeck extends EventEmitter {
  wss: ws.Server;
  wsConnection: ws | undefined;
  pluginUUID: string | undefined;
  buttonLocations: object = {};

  constructor(opts: {key?: string; port?: number, debug?: boolean} =
    { key: 'DEFAULT_KEY', port: 9091, debug: false }) {
    super();

    // Create WebSocket server.
    this.wss = new ws.Server({ port: opts.port });
    if (opts.debug) {
      console.log(`[streamdeck-util] WebSocket server created on port ${opts.port}.`);
    }

    // Triggered when client connects.
    this.wss.on('connection', (ws, req) => {
      if (opts.debug) {
        console.log('[streamdeck-util] WebSocket client connected.');
      }

      // Get key from request query.
      if (!req.url) return;
      const query = url.parse(req.url, true).query;
      const key = query.key;
      if (opts.debug && key) {
        console.log(`[streamdeck-util] WebSocket client used key ${opts.key}.`);
      }

      // Disconnect client if key invalid.
      if (!key || key !== opts.key) {
        if (opts.debug) {
          // tslint:disable-next-line: max-line-length
          console.log('[streamdeck-util] WebSocket client connection refused due to incorrect key.');
        }
        ws.close();
        return;
      }

      // Disconnect client if one is already connected.
      if (this.wsConnection && this.wsConnection.readyState !== 3) {
        if (opts.debug) {
          // tslint:disable-next-line: max-line-length
          console.log('[streamdeck-util] WebSocket client connection refused due to more than 1 connection.');
        }
        ws.close();
        return;
      }

      this.wsConnection = ws;
      this.emit('open');

      ws.on('message', (message: string) => {
        const msg = JSON.parse(message);
        if (msg.type === 'init') {
          if (opts.debug) {
            console.log(`[streamdeck-util] WebSocket received plugin UUID: ${this.pluginUUID}`);
          }
          this.pluginUUID = msg.data.pluginUUID;
        }
        if (msg.type === 'buttonLocationsUpdated') {
          if (opts.debug) {
            console.log('[streamdeck-util] WebSocket received updated button locations.');
          }
          this.buttonLocations = msg.data.buttonLocations;
        }
      });

      ws.on('error', (err) => {
        if (opts.debug) {
          console.log(`[streamdeck-util] WebSocket client connection error (${err}).`);
        }
        this.emit('error', err);
      });

      ws.on('close', (code, reason) => {
        if (opts.debug) {
          // tslint:disable-next-line: max-line-length
          console.log(`[streamdeck-util] WebSocket client connection closed (${code}${(reason) ? `, ${reason}` : ''}).`);
        }
        this.buttonLocations = {};
        this.pluginUUID = undefined;
        this.wsConnection = undefined;
        this.emit('close', code, reason);
      });
    });
  }

  getButtonLocations(): object {
    return this.buttonLocations;
  }

  getPluginUUID(): string | undefined {
    return this.pluginUUID;
  }

  send(data: object): boolean {
    if (this.wsConnection && this.wsConnection.readyState !== 3) {
      this.wsConnection.send(JSON.stringify(data));
      return true;
    }
    return false;
  }
}

export = StreamDeck;