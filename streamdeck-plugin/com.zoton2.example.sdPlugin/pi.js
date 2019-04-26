var sdWS;
var globalSettings = {};

// Store data supplied by the "connectElgatoStreamDeckSocket" function.
var connectSocketData = {
	port: undefined,
	pluginUUID: undefined,
	registerEvent: undefined,
	info: undefined,
	actionInfo: undefined
};

// Triggered by the Stream Deck software.
function connectElgatoStreamDeckSocket(port, pluginUUID, registerEvent, info, actionInfo) {
	connectSocketData.port = port;
	connectSocketData.pluginUUID = pluginUUID;
	connectSocketData.registerEvent = registerEvent;
	connectSocketData.info = info;
	connectSocketData.actionInfo = actionInfo;

	connectToSDWS();
}

// Initalise connection to Stream Deck's WebSocket.
function connectToSDWS() {
	if (sdWS) sdWS.close(); // Close current connection if one is active.
	
	sdWS = new WebSocket(`ws://127.0.0.1:${connectSocketData.port}`);
	console.info('Connecting to Stream Deck software.');

	sdWS.addEventListener('error', e => {
		console.warn('Error occured on the Stream Deck software connection: ', e);
	});

	// Initalise Stream Deck WebSocket connection.
	sdWS.addEventListener('open', () => {
		console.info('Connection to Stream Deck software successful.');
		sdWS.send(JSON.stringify({event: connectSocketData.registerEvent, uuid: connectSocketData.pluginUUID}));
		sdWS.send(JSON.stringify({event: 'getGlobalSettings', context: connectSocketData.pluginUUID}));
	}, {once: true});

	sdWS.addEventListener('close', e => {
		console.warn('Connection to Stream Deck software closed (%s).', e.code);
	}, {once: true});

	sdWS.addEventListener('message', e => {
		var data = JSON.parse(e.data);

		if (data.event === 'didReceiveGlobalSettings') {
			globalSettings = data.payload.settings;
		}
	});
}

// Wait for the document to fully load before doing this stuff.
document.addEventListener('DOMContentLoaded', e => {
	document.getElementById('settingsButton').addEventListener('click', e => {
		// The PI *should* receive the updated global settings when the backend updates them
		// but when I tested it, it didn't work that way. Getting them manually while opening settings for now.
		sdWS.send(JSON.stringify({event: 'getGlobalSettings', context: connectSocketData.pluginUUID}));
		setTimeout(() => window.open('settings.html'), 100);
	});
});

// Function triggered by the popup settings window when the settings are saved.
function gotCallbackFromWindow(data) {
	console.info('URL/key settings have changed, saving settings.');
	globalSettings.url = data.url || 'ws://localhost:9091'; // Default if setting is empty
	globalSettings.key = data.key || 'DEFAULT_KEY'; // Default if setting is empty
	globalSettings.connected = false;
	sdWS.send(JSON.stringify({event: 'setGlobalSettings', context: connectSocketData.pluginUUID, payload: globalSettings}));
}