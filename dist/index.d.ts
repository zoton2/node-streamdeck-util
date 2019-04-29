/// <reference types="node" />
import { EventEmitter } from 'events';
import ws from 'ws';
declare class StreamDeck extends EventEmitter {
    wss: ws.Server;
    wsConnection: ws | undefined;
    pluginUUID: string | undefined;
    buttonLocations: object;
    /**
     * New instance of the streamdeck-util helper.
     * @param opts Options object (see below).
     * @param opts.key Secret key that will be used to connect to this server.
     * @param opts.port Port that this server will listen on for connections.
     * @param opts.debug Turn on debug logging to help development.
     */
    constructor(opts?: {
        key?: string;
        port?: number;
        debug?: boolean;
    });
    /**
     * Gets the buttonLocations object as received from the Stream Deck plugin.
     */
    getButtonLocations(): object;
    /**
     * Gets the pluginUUID if set.
     */
    getPluginUUID(): string | undefined;
    /**
     * Sends message to the Stream Deck WebSocket connection.
     * as documented on https://developer.elgato.com/documentation/stream-deck/sdk/events-sent/
     * Data will be stringified for you.
     * @param data Object formatted to send to the Stream Deck WebSocket connection.
     */
    send(data: object): boolean;
    /**
     * Get raw WebSocket connection to the plugin backend if available.
     */
    getWSConnection(): ws | undefined;
}
export = StreamDeck;
