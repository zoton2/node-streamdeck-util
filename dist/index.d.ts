/// <reference types="node" />
import { EventEmitter } from 'events';
import ws from 'ws';
interface ButtonLocations {
    [device: string]: {
        [row: string]: {
            [column: string]: ButtonObject | null;
        };
    };
}
interface ButtonObject {
    context: string;
    action: string;
    title: string;
    isInMultiAction: boolean;
    state: number;
    titleParameters: TitleParameters;
}
interface TitleParameters {
    fontFamily: string;
    fontSize: number;
    fontStyle: string;
    fontUnderline: boolean;
    showTitle: boolean;
    titleAlignment: string;
    titleColor: string;
}
interface StreamDeck {
    on(event: 'open', listener: () => void): this;
    on(event: 'init', listener: () => void): this;
    on(event: 'error', listener: (err: Error) => void): this;
    on(event: 'close', listener: (code: number, reason: string) => void): this;
    on(event: 'message', listener: (data: object) => void): this;
    on(event: 'didReceiveSettings', listener: (data: object) => void): this;
    on(event: 'didReceiveGlobalSettings', listener: (data: object) => void): this;
    on(event: 'keyDown', listener: (data: object) => void): this;
    on(event: 'keyUp', listener: (data: object) => void): this;
    on(event: 'willAppear', listener: (data: object) => void): this;
    on(event: 'willDisappear', listener: (data: object) => void): this;
    on(event: 'titleParametersDidChange', listener: (data: object) => void): this;
    on(event: 'deviceDidConnect', listener: (data: object) => void): this;
    on(event: 'applicationDidLaunch', listener: (data: object) => void): this;
    on(event: 'applicationDidTerminate', listener: (data: object) => void): this;
    on(event: 'propertyInspectorDidAppear', listener: (data: object) => void): this;
    on(event: 'propertyInspectorDidDisappear', listener: (data: object) => void): this;
    on(event: 'sendToPlugin', listener: (data: object) => void): this;
    on(event: string, listener: Function): this;
}
declare class StreamDeck extends EventEmitter {
    wss: ws.Server | undefined;
    wsConnection: ws | undefined;
    pluginUUID: string | undefined;
    buttonLocations: ButtonLocations;
    init: number;
    /**
     * Start listening for connections from the Stream Deck plugin.
     * @param opts Options object (see below).
     * @param opts.key Secret key that will be used to connect to this server.
     * @param opts.port Port that this server will listen on for connections.
     * @param opts.debug Turn on debug logging to help development.
     */
    listen(opts?: {
        key?: string;
        port?: number;
        debug?: boolean;
    }): void;
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
    /**
     * Get an array of all the buttons that are the specified action.
     * @param action Name of the action you're looking for.
     */
    findButtonsWithAction(action: string): ButtonObject[];
    /**
     * Update a button's text by it's context.
     * @param context Context of the button.
     * @param text What you want to change the text to.
     */
    updateButtonText(context: string, text: string): void;
}
export = StreamDeck;
