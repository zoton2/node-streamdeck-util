import { EventEmitter } from 'stream';
import * as url from 'url';
import * as util from 'util';
import ws from 'ws';
import { ButtonLocations, ButtonObject, EventReceive } from '../types';

/* eslint-disable max-len */
interface StreamDeck {
  on(event: 'open', listener: () => void): this;
  on(event: 'init', listener: () => void): this;
  on(event: 'error', listener: (err: Error) => void): this;
  on(event: 'close', listener: (code: number, reason: string) => void): this;

  on(event: 'message', listener: (data: { [k: string]: unknown }) => void): this;
  // Currently a blanket definition for all events, can be expanded in the future.
  on(event: 'didReceiveSettings', listener: (data: { [k: string]: unknown }) => void): this;
  on(event: 'didReceiveGlobalSettings', listener: (data: { [k: string]: unknown }) => void): this;
  on(event: 'keyDown', listener: (data: EventReceive.KeyDown) => void): this;
  on(event: 'keyUp', listener: (data: EventReceive.KeyUp) => void): this;
  on(event: 'willAppear', listener: (data: { [k: string]: unknown }) => void): this;
  on(event: 'willDisappear', listener: (data: { [k: string]: unknown }) => void): this;
  on(event: 'titleParametersDidChange', listener: (data: { [k: string]: unknown }) => void): this;
  on(event: 'deviceDidConnect', listener: (data: { [k: string]: unknown }) => void): this;
  on(event: 'deviceDidDisconnect', listener: (data: { [k: string]: unknown }) => void): this;
  on(event: 'applicationDidLaunch', listener: (data: { [k: string]: unknown }) => void): this;
  on(event: 'applicationDidTerminate', listener: (data: { [k: string]: unknown }) => void): this;
  on(event: 'systemDidWakeUp', listener: (data: { [k: string]: unknown }) => void): this;
  on(event: 'propertyInspectorDidAppear', listener: (data: { [k: string]: unknown }) => void): this;
  on(event: 'propertyInspectorDidDisappear', listener: (data: { [k: string]: unknown }) => void): this;
  on(event: 'sendToPlugin', listener: (data: { [k: string]: unknown }) => void): this;
}
/* eslint-enable */

class StreamDeck extends EventEmitter {
  wss: ws.Server | undefined;
  wsConnection: ws | undefined;
  pluginUUID: string | undefined;
  debug = false;
  buttonLocations: ButtonLocations = {};
  init = 0; // Can be 0, 1 or 2 depending on what initialisation step we are at.

  private log = {
    /* eslint-disable no-console */
    shared: (...msg: unknown[]) => {
      console.log(`[node-streamdeck-util] ${msg[0]}`, ...msg.slice(1));
    },
    debug: (...msg: unknown[]) => { if (this.debug) this.log.shared(...msg); },
    info: (...msg: unknown[]) => { this.log.shared(...msg); },
    /* eslint-enable */
  };

  /**
   * Start listening for connections from the Stream Deck plugin.
   * @param opts Options object (see below).
   * @param opts.key Secret key that will be used to connect to this server.
   * @param opts.port Port that this server will listen on for connections.
   * @param opts.debug Turn on debug logging to help development.
   */
  listen(opts: {
    key?: string;
    port?: number;
    debug?: boolean;
  } = { key: 'DEFAULT_KEY', port: 9091, debug: false }): void {
    if (this.wss) {
      this.wss.close(); // If server is already active, close it
      this.wss.removeAllListeners();
    }
    this.wss = new ws.Server({ port: opts.port }); // Create WebSocket server
    this.debug = opts.debug || false;
    this.log.debug('WebSocket server created on port %s', opts.port);

    // Triggered when client connects.
    this.wss.on('connection', (socket, req) => {
      this.log.debug('WebSocket client connected');

      // Get key from request query.
      if (!req.url) return;
      const { query } = url.parse(req.url, true);
      const { key } = query;
      if (key) this.log.debug('WebSocket client used key %s', key);

      // Disconnect client if key invalid.
      if (!key || key !== opts.key) {
        this.log.debug('WebSocket client connection refused due to incorrect key');
        socket.close();
        return;
      }

      // Disconnect client if one is already connected.
      if (this.wsConnection && this.wsConnection.readyState !== 3) {
        this.log.debug('WebSocket client connection refused due to more than 1 connection');
        socket.close();
        return;
      }

      this.wsConnection = socket;
      this.emit('open');

      socket.on('message', (message) => {
        const msg = JSON.parse(message.toString());
        if (msg.type === 'init') {
          this.log.debug('WebSocket received plugin UUID: %s', msg.data.pluginUUID);
          this.pluginUUID = msg.data.pluginUUID;
          if (this.init < 2) {
            this.init += 1;
            if (this.init >= 2) this.emit('init');
          }
        }
        if (msg.type === 'buttonLocationsUpdated') {
          this.log.debug('WebSocket received updated button locations');
          this.buttonLocations = msg.data.buttonLocations;
          if (this.init < 2) {
            this.init += 1;
            if (this.init >= 2) this.emit('init');
          }
        }
        if (msg.type === 'rawSD') {
          this.log.debug(
            'WebSocket received raw Stream Deck message:\n%s',
            util.inspect(msg.data, { depth: null }),
          );
          this.emit(msg.data.event, msg.data);
          this.emit('message', msg.data);
        }
      });

      socket.on('error', (err) => {
        this.log.debug('WebSocket client connection error (%s)', err);
        this.emit('error', err);
      });

      socket.once('close', (code, reason) => {
        this.log.debug(
          'WebSocket client connection closed (%s)',
          `${code}${(reason) ? `, ${reason}` : ''}`,
        );
        this.buttonLocations = {};
        this.pluginUUID = undefined;
        this.wsConnection = undefined;
        this.init = 0;
        socket.removeAllListeners();
        this.emit('close', code, reason);
      });
    });
  }

  /**
   * Gets the buttonLocations object as received from the Stream Deck plugin.
   */
  getButtonLocations(): ButtonLocations {
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
   * Will return true/false depending on if message was able to be sent.
   * @param data Object formatted to send to the Stream Deck WebSocket connection.
   */
  send(data: { [k: string]: unknown }): boolean {
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
      Object.keys(this.buttonLocations[device]).forEach((row) => {
        Object.keys(this.buttonLocations[device][row]).forEach((column) => {
          const button = this.buttonLocations[device][row][column];
          if (button && button.action === action) {
            buttons.push(button);
          }
        });
      });
    });
    return buttons;
  }

  /**
   * Update a button's text by it's context.
   * @param context Context of the button.
   * @param text What you want to change the text to.
   */
  updateButtonText(context: string, text: string): void {
    this.send({
      context,
      event: 'setTitle',
      payload: {
        title: text,
      },
    });
  }

  /**
   * Update the text on all buttons of a cetain action.
   * @param action Name of the action you're looking for.
   * @param text What you want to change the text to.
   */
  setTextOnAllButtonsWithAction(action: string, text: string): void {
    const buttons = this.findButtonsWithAction(action);
    buttons.forEach((button) => {
      this.updateButtonText(button.context, text);
    });
  }
}

export = StreamDeck;
