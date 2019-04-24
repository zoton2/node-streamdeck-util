import { EventEmitter } from 'events';
import ws from 'ws';
import * as url from 'url';

class StreamDeck extends EventEmitter {
  wss: ws.Server;
  pluginUUID: string | undefined;
  buttonLocations: object = {};

  constructor(opts: {key?: string; port?: number, debug?: boolean} =
    { key: 'DEFAULT_KEY', port: 9091, debug: false }) {
    super();

    this.wss = new ws.Server({ port: opts.port });
    if (opts.debug) {
      console.log(`[streamdeck-util] WebSocket server created on port ${opts.port}.`);
    }

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

      this.emit('open');

      ws.on('message', (message) => {
        this.pluginUUID = '';
        // got message
      });

      ws.on('error', (err) => {
        if (opts.debug) {
          console.log(`[streamdeck-util] WebSocket client error (${err}).`);
        }
        this.emit('error', err);
      });

      ws.on('close', (code, reason) => {
        if (opts.debug) {
          // tslint:disable-next-line: max-line-length
          console.log(`[streamdeck-util] WebSocket client closed (${code}${(reason) ? `, ${reason}` : ''}).`);
        }
        this.buttonLocations = {};
        this.pluginUUID = undefined;
        this.emit('close', code, reason);
      });
    });
  }
}

export = StreamDeck;