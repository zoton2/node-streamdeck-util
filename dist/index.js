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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var events_1 = require("events");
var url = __importStar(require("url"));
var util = __importStar(require("util"));
var ws_1 = __importDefault(require("ws"));
var StreamDeck = /** @class */ (function (_super) {
    __extends(StreamDeck, _super);
    function StreamDeck() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.buttonLocations = {};
        _this.init = 0;
        return _this;
    }
    /**
     * Start listening for connections from the Stream Deck plugin.
     * @param opts Options object (see below).
     * @param opts.key Secret key that will be used to connect to this server.
     * @param opts.port Port that this server will listen on for connections.
     * @param opts.debug Turn on debug logging to help development.
     */
    StreamDeck.prototype.listen = function (opts) {
        var _this = this;
        if (opts === void 0) { opts = { key: 'DEFAULT_KEY', port: 9091, debug: false }; }
        // Create WebSocket server.
        this.wss = new ws_1.default.Server({ port: opts.port });
        if (opts.debug) {
            console.log("[streamdeck-util] WebSocket server created on port " + opts.port);
        }
        // Triggered when client connects.
        this.wss.on('connection', function (socket, req) {
            if (opts.debug) {
                console.log('[streamdeck-util] WebSocket client connected');
            }
            // Get key from request query.
            if (!req.url)
                return;
            var query = url.parse(req.url, true).query;
            var key = query.key;
            if (opts.debug && key) {
                console.log("[streamdeck-util] WebSocket client used key " + opts.key);
            }
            // Disconnect client if key invalid.
            if (!key || key !== opts.key) {
                if (opts.debug) {
                    console.log('[streamdeck-util] WebSocket client connection refused due to incorrect key');
                }
                socket.close();
                return;
            }
            // Disconnect client if one is already connected.
            if (_this.wsConnection && _this.wsConnection.readyState !== 3) {
                if (opts.debug) {
                    console.log('[streamdeck-util] WebSocket client connection '
                        + 'refused due to more than 1 connection');
                }
                socket.close();
                return;
            }
            _this.wsConnection = socket;
            _this.emit('open');
            socket.on('message', function (message) {
                var msg = JSON.parse(message);
                if (msg.type === 'init') {
                    if (opts.debug) {
                        console.log("[streamdeck-util] WebSocket received plugin UUID: " + msg.data.pluginUUID);
                    }
                    _this.pluginUUID = msg.data.pluginUUID;
                    if (_this.init < 2) {
                        _this.init += 1;
                        if (_this.init >= 2) {
                            _this.emit('init');
                        }
                    }
                }
                if (msg.type === 'buttonLocationsUpdated') {
                    if (opts.debug) {
                        console.log('[streamdeck-util] WebSocket received updated button locations');
                    }
                    _this.buttonLocations = msg.data.buttonLocations;
                    if (_this.init < 2) {
                        _this.init += 1;
                        if (_this.init >= 2) {
                            _this.emit('init');
                        }
                    }
                }
                if (msg.type === 'rawSD') {
                    if (opts.debug) {
                        console.log('[streamdeck-util] WebSocket received raw Stream Deck message:\n%s', util.inspect(msg.data, { depth: null }));
                    }
                    _this.emit(msg.data.event, msg.data);
                    _this.emit('message', msg.data);
                }
            });
            socket.on('error', function (err) {
                if (opts.debug) {
                    console.log("[streamdeck-util] WebSocket client connection error (" + err + ")");
                }
                _this.emit('error', err);
            });
            socket.on('close', function (code, reason) {
                if (opts.debug) {
                    console.log('[streamdeck-util] WebSocket client connection closed '
                        + ("(" + code + ((reason) ? ", " + reason : '') + ")"));
                }
                _this.buttonLocations = {};
                _this.pluginUUID = undefined;
                _this.wsConnection = undefined;
                _this.init = 0;
                _this.emit('close', code, reason);
            });
        });
    };
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
            Object.keys(_this.buttonLocations[device]).forEach(function (row) {
                Object.keys(_this.buttonLocations[device][row]).forEach(function (column) {
                    var button = _this.buttonLocations[device][row][column];
                    if (button && button.action === action) {
                        buttons.push(button);
                    }
                });
            });
        });
        return buttons;
    };
    /**
     * Update a button's text by it's context.
     * @param context Context of the button.
     * @param text What you want to change the text to.
     */
    StreamDeck.prototype.updateButtonText = function (context, text) {
        this.send({
            context: context,
            event: 'setTitle',
            payload: {
                title: text,
            },
        });
    };
    /**
     * Update the text on all buttons of a cetain action.
     * @param action Name of the action you're looking for.
     * @param text What you want to change the text to.
     */
    StreamDeck.prototype.setTextOnAllButtonsWithAction = function (action, text) {
        var _this = this;
        var buttons = this.findButtonsWithAction(action);
        buttons.forEach(function (button) {
            _this.updateButtonText(button.context, text);
        });
    };
    return StreamDeck;
}(events_1.EventEmitter));
module.exports = StreamDeck;
//# sourceMappingURL=index.js.map