import { EventEmitter } from 'events';
import ws from 'ws';
import * as url from 'url';
import * as util from 'util';

interface ButtonLocations {
  [device: string]: {
    [row: string]: {
      [column: string]: ButtonObject,
    }
  }
}

interface ButtonObject {
  context: string;
  action: string;
  title: string;
  isInMultiAction: boolean;
  state: number;
  titleParameters: object;
}

class StreamDeck extends EventEmitter {
  wss: ws.Server;
  wsConnection: ws | undefined;
  pluginUUID: string | undefined;
  buttonLocations: ButtonLocations = {};

  /**
   * New instance of the streamdeck-util helper.
   * @param opts Options object (see below).
   * @param opts.key Secret key that will be used to connect to this server.
   * @param opts.port Port that this server will listen on for connections.
   * @param opts.debug Turn on debug logging to help development.
   */
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
            console.log(`[streamdeck-util] WebSocket received plugin UUID: ${msg.data.pluginUUID}`);
          }
          this.pluginUUID = msg.data.pluginUUID;
        }
        if (msg.type === 'buttonLocationsUpdated') {
          if (opts.debug) {
            console.log('[streamdeck-util] WebSocket received updated button locations.');
          }
          this.buttonLocations = msg.data.buttonLocations;
        }
        if (msg.type === 'rawSD') {
          if (opts.debug) {
            // tslint:disable-next-line: max-line-length
            console.log('[streamdeck-util] WebSocket received raw Stream Deck message:\n%s', util.inspect(msg.data, { depth: null }));
          }
          this.emit(msg.data.event, msg.data);
          this.emit('message', msg.data);
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

  /**
   * Gets the buttonLocations object as received from the Stream Deck plugin.
   */
  getButtonLocations(): object {
    return this.buttonLocations;
  }

  /**
   * Gets the pluginUUID if set.
   */
  getPluginUUID(): string | undefined {
    return this.pluginUUID;
  }

  /**
   * Sends message to the Stream Deck WebSocket connection.
   * as documented on https://developer.elgato.com/documentation/stream-deck/sdk/events-sent/
   * Data will be stringified for you.
   * @param data Object formatted to send to the Stream Deck WebSocket connection.
   */
  send(data: object): boolean {
    if (this.wsConnection && this.wsConnection.readyState === 1) {
      this.wsConnection.send(JSON.stringify(data));
      return true;
    }
    return false;
  }

  /**
   * Get raw WebSocket connection to the plugin backend if available.
   */
  getWSConnection(): ws | undefined {
    return this.wsConnection;
  }

  /**
   * Get an array of all the buttons that are the specified action.
   * @param action Name of the action you're looking for.
   */
  findButtonsWithAction(action: string): ButtonObject[] {
    const buttons: ButtonObject[] = [];
    Object.keys(this.buttonLocations).forEach((device) => {
      Object.keys(device).forEach((row) => {
        Object.keys(row).forEach((column) => {
          const button = this.buttonLocations[device][row][column];
          if (button.action === action) {
            buttons.push(button);
          }
        });
      });
    });
    return buttons;
  }

  updateButtonText(context: string, text: string) {
    this.send({
      context,
      event: 'setTitle',
      payload: {
        title: text,
      },
    });
  }
}

export = StreamDeck;