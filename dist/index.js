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
var StreamDeck = /** @class */ (function (_super) {
    __extends(StreamDeck, _super);
    function StreamDeck(opts) {
        if (opts === void 0) { opts = { key: 'DEFAULT_KEY', port: 9091, debug: false }; }
        var _this = _super.call(this) || this;
        _this.buttonLocations = {};
        _this.wss = new ws_1.default.Server({ port: opts.port });
        if (opts.debug) {
            console.log("[streamdeck-util] WebSocket server created on port " + opts.port + ".");
        }
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
            _this.emit('open');
            ws.on('message', function (message) {
                _this.pluginUUID = '';
                // got message
            });
            ws.on('error', function (err) {
                if (opts.debug) {
                    console.log("[streamdeck-util] WebSocket client error (" + err + ").");
                }
                _this.emit('error', err);
            });
            ws.on('close', function (code, reason) {
                if (opts.debug) {
                    // tslint:disable-next-line: max-line-length
                    console.log("[streamdeck-util] WebSocket client closed (" + code + ((reason) ? ", " + reason : '') + ").");
                }
                _this.buttonLocations = {};
                _this.pluginUUID = undefined;
                _this.emit('close', code, reason);
            });
        });
        return _this;
    }
    return StreamDeck;
}(events_1.EventEmitter));
module.exports = StreamDeck;
//# sourceMappingURL=index.js.map