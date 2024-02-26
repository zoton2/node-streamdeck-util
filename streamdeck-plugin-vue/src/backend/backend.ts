import { EventEmitter } from 'events';
import { io, Socket } from 'socket.io-client';

/* eslint-disable max-len, @typescript-eslint/no-explicit-any */
interface Backend {
  on(event: 'message', listener: (data: any) => void): this;
}
/* eslint-enable */

class Backend extends EventEmitter {
  sdWS!: WebSocket;
  serverWS!: Socket;
  connectSocketData: {
    inPort?: string,
    inPluginUUID?: string,
    inRegisterEvent?: string,
    inInfo?: string,
  } = {};
  globalSettings: { connected?: boolean, url?: string, key?: string } = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  buttonLocations: { [device: string]: { [x: string]: { [y: string]: any } } } = {}; // to type?

  /**
   * Intended to be triggered by the Stream Deck software.
   */
  connectElgatoStreamDeckSocket(
    inPort: string,
    inPluginUUID: string,
    inRegisterEvent: string,
    inInfo: string,
  ): void {
    this.connectSocketData.inPort = inPort;
    this.connectSocketData.inPluginUUID = inPluginUUID;
    this.connectSocketData.inRegisterEvent = inRegisterEvent;
    this.connectSocketData.inInfo = inInfo;
    this.connectToSDWS();
  }

  /**
   * Initalise connection to Stream Deck's WebSocket.
   */
  connectToSDWS(): void {
    if (this.sdWS) this.sdWS.close(); // Close current connection if one is active.

    this.sdWS = new WebSocket(`ws://127.0.0.1:${this.connectSocketData.inPort}`);
    console.info('Connecting to Stream Deck software');

    this.sdWS.addEventListener('error', (e) => {
      console.error('Error occured on the Stream Deck software connection:', e);
    });

    // Initalise Stream Deck WebSocket connection.
    this.sdWS.addEventListener('open', () => {
      console.info('Connection to Stream Deck software successful');
      this.buttonLocations = {};
      this.sdWS.send(JSON.stringify({
        event: this.connectSocketData.inRegisterEvent,
        uuid: this.connectSocketData.inPluginUUID,
      }));
      this.sdWS.send(JSON.stringify({
        event: 'getGlobalSettings',
        context: this.connectSocketData.inPluginUUID,
      }));
    }, { once: true });

    this.sdWS.addEventListener('close', (e) => {
      console.warn('Connection to Stream Deck software closed (%s)', e.code);
      this.buttonLocations = {};
    }, { once: true });

    this.sdWS.addEventListener('message', (e) => {
      const data = JSON.parse(e.data);
      const { event, device, deviceInfo, action, context, payload } = data;

      // Create button location storage for this device if empty;
      // usually from a deviceDidConnect message.
      if (device && !this.buttonLocations[device]) {
        this.buttonLocations[device] = this
          .createButtonLocationStorage(deviceInfo.size.rows, deviceInfo.size.columns);
      }

      // Adjust our button locations cache when buttons are added/removed, and set defaults.
      // TODO: Is all this needed? Maybe even more.
      if (event === 'willAppear') {
        this.buttonLocations[device][payload.coordinates.row][
          payload.coordinates.column] = {};
        this.buttonLocations[device][payload.coordinates.row][
          payload.coordinates.column].context = context;
        this.buttonLocations[device][payload.coordinates.row][
          payload.coordinates.column].action = action;
        this.buttonLocations[device][payload.coordinates.row][
          payload.coordinates.column].isInMultiAction = payload.isInMultiAction;
      } else if (event === 'willDisappear') {
        this.buttonLocations[device][payload.coordinates.row][
          payload.coordinates.column] = null;
      }

      // Update title/title parameters/state we have saved if it's changed.
      // TODO: Is all this needed? Maybe even more.
      if (event === 'titleParametersDidChange') {
        this.buttonLocations[device][payload.coordinates.row][
          payload.coordinates.column].title = payload.title;
        this.buttonLocations[device][payload.coordinates.row][
          payload.coordinates.column].titleParameters = payload.titleParameters;
        this.buttonLocations[device][payload.coordinates.row][
          payload.coordinates.column].state = payload.state;
      }

      // If buttonLocations were updated for any reason, relay this to node-streamdeck-util server.
      if (['willAppear', 'willDisappear', 'titleParametersDidChange'].includes(event)) {
        this.sendToServerWS('buttonLocationsUpdated', { buttonLocations: this.buttonLocations });
      }

      // Update global settings if needed, usually for first use.
      // This updates local stored settings and sets any defaults if needed,
      // then connects to the node-streamdeck-util server.
      if (data.event === 'didReceiveGlobalSettings') {
        this.globalSettings.url = data.payload.settings.url || 'ws://localhost:9091'; // Default
        this.globalSettings.key = data.payload.settings.key || 'DEFAULT_KEY'; // Default
        this.globalSettings.connected = false;
        this.sdWS.send(JSON.stringify({
          event: 'setGlobalSettings',
          context: this.connectSocketData.inPluginUUID,
          payload: this.globalSettings,
        }));
        this.connectToServerWS();
      }

      // Sends the full raw message to the node-streamdeck-util server.
      this.sendToServerWS('rawSD', data);

      this.emit('message', data);
    });
  }

  /**
   * Helper function to send messages to the Stream Deck WebSocket server if connection is ready.
   */
  sendToSDWS(data: unknown): void {
    if (this.sdWS && this.sdWS.readyState === 1) {
      const str = typeof data !== 'string' ? JSON.stringify(data) : data;
      this.sdWS.send(str);
    }
  }

  /**
   * node-streamdeck-util connection.
   */
  connectToServerWS(): void {
    if (this.serverWS) this.serverWS.close(); // Close current connection if one is active.

    this.serverWS = io(this.globalSettings.url!, {
      auth: {
        key: this.globalSettings.key,
      },
    });
    console.info(
      'Connecting to node-streamdeck-util server using %s and key %s',
      this.globalSettings.url,
      this.globalSettings.key,
    );

    this.serverWS.on('connect_error', (e) => {
      console.warn('Error occured on the node-streamdeck-util server connection:', e);
    });

    // Initalise node-streamdeck-util server connection.
    this.serverWS.on('connect', () => {
      console.info('Connection to node-streamdeck-util server successful');
      this.sendToServerWS('init', { pluginUUID: this.connectSocketData.inPluginUUID });
      this.sendToServerWS('buttonLocationsUpdated', { buttonLocations: this.buttonLocations });
      this.toggleBackendConnectionStatus(true);
    });

    this.serverWS.on('disconnect', (e) => {
      console.warn('Connection to node-streamdeck-util server closed (%s)', e);
      this.toggleBackendConnectionStatus(false);
    });

    // Relays any messages sent from the node-streamdeck-util server to the main socket.
    this.serverWS.on('message', (data) => {
      this.sendToSDWS(data);
    });
  }

  /**
   * Helper function to send messages to the node-streamdeck-util server if connection is ready.
   */
  sendToServerWS(type: string, data: unknown): void {
    if (this.serverWS && this.serverWS.connected) {
      this.serverWS.send(JSON.stringify({ type, data }));
    }
  }

  /**
   * Toggles global setting for connection status.
   */
  toggleBackendConnectionStatus(connected: boolean): void {
    this.globalSettings.connected = connected;
    this.sdWS.send(JSON.stringify({
      event: 'setGlobalSettings',
      context: this.connectSocketData.inPluginUUID,
      payload: this.globalSettings,
    }));
  }

  // Create object with structure to store button location details.
  /**
   * Create object with structure to store button location details.
   * @param rows Number of rows device has.
   * @param columns Number of columns device has.
   */
  createButtonLocationStorage(
    rows: number,
    columns: number,
  ): { [x: string]: { [y: string]: unknown } } {
    const locations: { [x: string]: { [y: string]: unknown } } = {};
    for (let x = 0; x < rows; x += 1) {
      locations[x] = {};
      for (let y = 0; y < columns; y += 1) {
        locations[x][y] = null;
      }
    }
    return locations;
  }
}

export default Backend;
