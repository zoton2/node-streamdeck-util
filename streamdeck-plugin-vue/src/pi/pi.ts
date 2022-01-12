import { EventEmitter } from 'events';

/* eslint-disable max-len, @typescript-eslint/no-explicit-any */
interface PropertyInspector {
  on(event: 'open', listener: () => void): this;
  on(event: 'message', listener: (data: any) => void): this;
}
/* eslint-enable */

class PropertyInspector extends EventEmitter {
  sdWS!: WebSocket;
  connectSocketData: {
    inPort?: string,
    inPropertyInspectorUUID?: string,
    inRegisterEvent?: string,
    inInfo?: string,
    inActionInfo?: string,
  } = {};
  globalSettings: { connected?: boolean, url?: string, key?: string } = {};

  /**
   * Intended to be triggered by the Stream Deck software.
   */
  connectElgatoStreamDeckSocket(
    inPort: string,
    inPropertyInspectorUUID: string,
    inRegisterEvent: string,
    inInfo: string,
    inActionInfo: string,
  ): void {
    this.connectSocketData.inPort = inPort;
    this.connectSocketData.inPropertyInspectorUUID = inPropertyInspectorUUID;
    this.connectSocketData.inRegisterEvent = inRegisterEvent;
    this.connectSocketData.inInfo = inInfo;
    this.connectSocketData.inActionInfo = inActionInfo;
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
      this.sdWS.send(JSON.stringify({
        event: this.connectSocketData.inRegisterEvent,
        uuid: this.connectSocketData.inPropertyInspectorUUID,
      }));
      this.sdWS.send(JSON.stringify({
        event: 'getGlobalSettings',
        context: this.connectSocketData.inPropertyInspectorUUID,
      }));
      this.emit('open');
    }, { once: true });

    this.sdWS.addEventListener('close', (e) => {
      console.warn('Connection to Stream Deck software closed (%s)', e.code);
    }, { once: true });

    this.sdWS.addEventListener('message', (e) => {
      const data = JSON.parse(e.data);
      if (data.event === 'didReceiveGlobalSettings') {
        this.globalSettings = data.payload.settings;
      }
      this.emit('message', data);
    });
  }

  /**
   * Opens the settings dialog.
   */
  openSettings(): void {
    window.globalSettings = this.globalSettings;
    window.open('settings.html');
  }

  /**
   * Function triggered by the popup settings window when the settings are saved.
   * @param data Data passed back by popup window.
   */
  gotCallbackFromWindow(data: { url: string, key: string }): void {
    console.info('URL/key settings have changed, saving settings');
    this.globalSettings.url = data.url || 'ws://localhost:9091'; // Default if setting is empty
    this.globalSettings.key = data.key || 'DEFAULT_KEY'; // Default if setting is empty
    this.globalSettings.connected = false;
    this.sdWS.send(JSON.stringify({
      event: 'setGlobalSettings',
      context: this.connectSocketData.inPropertyInspectorUUID,
      payload: this.globalSettings,
    }));
  }
}

export default PropertyInspector;
