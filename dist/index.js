"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var events_1 = require("events");
var ws_1 = __importDefault(require("ws"));
var url = __importStar(require("url"));
var util = __importStar(require("util"));
var StreamDeck = /** @class */ (function (_super) {
    __extends(StreamDeck, _super);
    /**
     * New instance of the streamdeck-util helper.
     * @param opts Options object (see below).
     * @param opts.key Secret key that will be used to connect to this server.
     * @param opts.port Port that this server will listen on for connections.
     * @param opts.debug Turn on debug logging to help development.
     */
    function StreamDeck(opts) {
        if (opts === void 0) { opts = { key: 'DEFAULT_KEY', port: 9091, debug: false }; }
        var _this = _super.call(this) || this;
        _this.buttonLocations = {};
        // Create WebSocket server.
        _this.wss = new ws_1.default.Server({ port: opts.port });
        if (opts.debug) {
            console.log("[streamdeck-util] WebSocket server created on port " + opts.port + ".");
        }
        // Triggered when client connects.
        _this.wss.on('connection', function (ws, req) {
            if (opts.debug) {
                console.log('[streamdeck-util] WebSocket client connected.');
            }
            // Get key from request query.
            if (!req.url)
                return;
            var query = url.parse(req.url, true).query;
            var key = query.key;
            if (opts.debug && key) {
                console.log("[streamdeck-util] WebSocket client used key " + opts.key + ".");
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
            if (_this.wsConnection && _this.wsConnection.readyState !== 3) {
                if (opts.debug) {
                    // tslint:disable-next-line: max-line-length
                    console.log('[streamdeck-util] WebSocket client connection refused due to more than 1 connection.');
                }
                ws.close();
                return;
            }
            _this.wsConnection = ws;
            _this.emit('open');
            ws.on('message', function (message) {
                var msg = JSON.parse(message);
                if (msg.type === 'init') {
                    if (opts.debug) {
                        console.log("[streamdeck-util] WebSocket received plugin UUID: " + msg.data.pluginUUID);
                    }
                    _this.pluginUUID = msg.data.pluginUUID;
                }
                if (msg.type === 'buttonLocationsUpdated') {
                    if (opts.debug) {
                        console.log('[streamdeck-util] WebSocket received updated button locations.');
                    }
                    _this.buttonLocations = msg.data.buttonLocations;
                }
                if (msg.type === 'rawSD') {
                    if (opts.debug) {
                        // tslint:disable-next-line: max-line-length
                        console.log('[streamdeck-util] WebSocket received raw Stream Deck message:\n%s', util.inspect(msg.data, { depth: null }));
                    }
                    _this.emit(msg.data.event, msg.data);
                    _this.emit('message', msg.data);
                }
            });
            ws.on('error', function (err) {
                if (opts.debug) {
                    console.log("[streamdeck-util] WebSocket client connection error (" + err + ").");
                }
                _this.emit('error', err);
            });
            ws.on('close', function (code, reason) {
                if (opts.debug) {
                    // tslint:disable-next-line: max-line-length
                    console.log("[streamdeck-util] WebSocket client connection closed (" + code + ((reason) ? ", " + reason : '') + ").");
                }
                _this.buttonLocations = {};
                _this.pluginUUID = undefined;
                _this.wsConnection = undefined;
                _this.emit('close', code, reason);
            });
        });
        return _this;
    }
    /**
     * Gets the buttonLocations object as received from the Stream Deck plugin.
     */
    StreamDeck.prototype.getButtonLocations = function () {
        return this.buttonLocations;
    };
    /**
     * Gets the pluginUUID if set.
     */
    StreamDeck.prototype.getPluginUUID = function () {
        return this.pluginUUID;
    };
    /**
     * Sends message to the Stream Deck WebSocket connection.
     * as documented on https://developer.elgato.com/documentation/stream-deck/sdk/events-sent/
     * Data will be stringified for you.
     * @param data Object formatted to send to the Stream Deck WebSocket connection.
     */
    StreamDeck.prototype.send = function (data) {
        if (this.wsConnection && this.wsConnection.readyState === 1) {
            this.wsConnection.send(JSON.stringify(data));
            return true;
        }
        return false;
    };
    /**
     * Get raw WebSocket connection to the plugin backend if available.
     */
    StreamDeck.prototype.getWSConnection = function () {
        return this.wsConnection;
    };
    /**
     * Get an array of all the buttons that are the specified action.
     * @param action Name of the action you're looking for.
     */
    StreamDeck.prototype.findButtonsWithAction = function (action) {
        var _this = this;
        var buttons = [];
        Object.keys(this.buttonLocations).forEach(function (device) {
            Object.keys(device).forEach(function (row) {
                Object.keys(row).forEach(function (column) {
                    var button = _this.buttonLocations[device][row][column];
                    if (button.action === action) {
                        buttons.push(button);
                    }
                });
            });
        });
        return buttons;
    };
    StreamDeck.prototype.updateButtonText = function (context, text) {
        this.send({
            context: context,
            event: 'setTitle',
            payload: {
                title: text,
            },
        });
    };
    return StreamDeck;
}(events_1.EventEmitter));
module.exports = StreamDeck;
//# sourceMappingURL=index.js.map