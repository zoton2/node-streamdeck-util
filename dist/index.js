"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const stream_1 = require("stream");
const url = __importStar(require("url"));
const util = __importStar(require("util"));
const ws_1 = __importDefault(require("ws"));
/* eslint-enable */
class StreamDeck extends stream_1.EventEmitter {
    constructor() {
        super(...arguments);
        this.debug = false;
        this.buttonLocations = {};
        this.init = 0; // Can be 0, 1 or 2 depending on what initialisation step we are at.
        this.log = {
            /* eslint-disable no-console */
            shared: (...msg) => {
                console.log(`[node-streamdeck-util] ${msg[0]}`, ...msg.slice(1));
            },
            debug: (...msg) => { if (this.debug)
                this.log.shared(...msg); },
            info: (...msg) => { this.log.shared(...msg); },
            /* eslint-enable */
        };
    }
    /**
     * Start listening for connections from the Stream Deck plugin.
     * @param opts Options object (see below).
     * @param opts.key Secret key that will be used to connect to this server.
     * @param opts.port Port that this server will listen on for connections.
     * @param opts.debug Turn on debug logging to help development.
     */
    listen(opts = { key: 'DEFAULT_KEY', port: 9091, debug: false }) {
        if (this.wss) {
            this.wss.close(); // If server is already active, close it
            this.wss.removeAllListeners();
        }
        this.wss = new ws_1.default.Server({ port: opts.port }); // Create WebSocket server
        this.debug = opts.debug || false;
        this.log.debug('WebSocket server created on port %s', opts.port);
        // Triggered when client connects.
        this.wss.on('connection', (socket, req) => {
            this.log.debug('WebSocket client connected');
            // Get key from request query.
            if (!req.url)
                return;
            const { query } = url.parse(req.url, true);
            const { key } = query;
            if (key)
                this.log.debug('WebSocket client used key %s', key);
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
                        if (this.init >= 2)
                            this.emit('init');
                    }
                }
                if (msg.type === 'buttonLocationsUpdated') {
                    this.log.debug('WebSocket received updated button locations');
                    this.buttonLocations = msg.data.buttonLocations;
                    if (this.init < 2) {
                        this.init += 1;
                        if (this.init >= 2)
                            this.emit('init');
                    }
                }
                if (msg.type === 'rawSD') {
                    this.log.debug('WebSocket received raw Stream Deck message:\n%s', util.inspect(msg.data, { depth: null }));
                    this.emit(msg.data.event, msg.data);
                    this.emit('message', msg.data);
                }
            });
            socket.on('error', (err) => {
                this.log.debug('WebSocket client connection error (%s)', err);
                this.emit('error', err);
            });
            socket.once('close', (code, reason) => {
                this.log.debug('WebSocket client connection closed (%s)', `${code}${(reason) ? `, ${reason}` : ''}`);
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
    getButtonLocations() {
        return this.buttonLocations;
    }
    /**
     * Gets the pluginUUID if set.
     */
    getPluginUUID() {
        return this.pluginUUID;
    }
    /**
     * Sends message to the Stream Deck WebSocket connection.
     * as documented on https://developer.elgato.com/documentation/stream-deck/sdk/events-sent/
     * Data will be stringified for you.
     * Will return true/false depending on if message was able to be sent.
     * @param data Object formatted to send to the Stream Deck WebSocket connection.
     */
    send(data) {
        if (this.wsConnection && this.wsConnection.readyState === 1) {
            this.wsConnection.send(JSON.stringify(data));
            return true;
        }
        return false;
    }
    /**
     * Get raw WebSocket connection to the plugin backend if available.
     */
    getWSConnection() {
        return this.wsConnection;
    }
    /**
     * Get an array of all the buttons that are the specified action.
     * @param action Name of the action you're looking for.
     */
    findButtonsWithAction(action) {
        const buttons = [];
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
    updateButtonText(context, text) {
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
    setTextOnAllButtonsWithAction(action, text) {
        const buttons = this.findButtonsWithAction(action);
        buttons.forEach((button) => {
            this.updateButtonText(button.context, text);
        });
    }
}
module.exports = StreamDeck;
//# sourceMappingURL=index.js.map