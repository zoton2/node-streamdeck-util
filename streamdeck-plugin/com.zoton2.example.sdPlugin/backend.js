var sdWS;
var serverWS;
var globalSettings = {};
var serverWSReconTimeout;
var buttonLocations = {};

// Store data supplied by the "connectElgatoStreamDeckSocket" function.
var connectSocketData = {
	port: undefined,
	pluginUUID: undefined,
	registerEvent: undefined,
	info: undefined
};

// Triggered by the Stream Deck software.
function connectElgatoStreamDeckSocket(port, pluginUUID, registerEvent, info) {
	connectSocketData.port = port;
	connectSocketData.pluginUUID = pluginUUID;
	connectSocketData.registerEvent = registerEvent;
	connectSocketData.info = info;

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
		buttonLocations = {};
		sdWS.send(JSON.stringify({event: connectSocketData.registerEvent, uuid: connectSocketData.pluginUUID}));
		sdWS.send(JSON.stringify({event: 'getGlobalSettings', context: connectSocketData.pluginUUID}));
	}, {once: true});

	sdWS.addEventListener('close', e => {
		console.warn('Connection to Stream Deck software closed (%s).', e.code);
		buttonLocations = {};
	}, {once: true});

	sdWS.addEventListener('message', e => {
		const data = JSON.parse(e.data);
		const event = data.event;
		const device = data.device;
		const action = data.action;
		const context = data.context;
		const payload = data.payload || {};

		// Create button location storage for this device if empty.
		if (device && !buttonLocations[device]) {
			buttonLocations[device] = createButtonLocationStorage();
		}

		// Adjust our button locations cache when buttons are added/removed, and set defaults.
		if (event === 'willAppear') {
			buttonLocations[device][payload.coordinates.row][payload.coordinates.column] = {};
			buttonLocations[device][payload.coordinates.row][payload.coordinates.column].context = context;
			buttonLocations[device][payload.coordinates.row][payload.coordinates.column].action = action;
			buttonLocations[device][payload.coordinates.row][payload.coordinates.column].isInMultiAction = payload.isInMultiAction;
		}
		else if (event === 'willDisappear') {
			buttonLocations[device][payload.coordinates.row][payload.coordinates.column] = null;
		}

		// Update title/title parameters/state we have saved if it's changed.
		if (event === 'titleParametersDidChange') {
			buttonLocations[device][payload.coordinates.row][payload.coordinates.column].title = payload.title;
			buttonLocations[device][payload.coordinates.row][payload.coordinates.column].titleParameters = payload.titleParameters;
			buttonLocations[device][payload.coordinates.row][payload.coordinates.column].state = payload.state;
		}

		if (['willAppear', 'willDisappear', 'titleParametersDidChange'].includes(event)) {
			sendToServerWS('buttonLocationsUpdated', {buttonLocations: buttonLocations});
		}

		// Update global settings if needed, usually for first use.
		if (data.event === 'didReceiveGlobalSettings') {
			globalSettings.url = data.payload.settings.url || 'ws://localhost:9091'; // Default if setting is empty
			globalSettings.key = data.payload.settings.key || 'DEFAULT_KEY'; // Default if setting is empty
			globalSettings.connected = false;
			sdWS.send(JSON.stringify({event: 'setGlobalSettings', context: connectSocketData.pluginUUID, payload: globalSettings}));
			connectToServerWS();
		}

		sendToServerWS('rawSD', data);
	});
}

function connectToServerWS() {
	if (serverWS) serverWS.close(); // Close current connection if one is active.
	clearTimeout(serverWSReconTimeout);
	
	serverWS = new WebSocket(`${globalSettings.url}/?key=${globalSettings.key}`);
	console.info(`Connecting to Node.js server using ${globalSettings.url} and key ${globalSettings.key}`);

	serverWS.addEventListener('error', e => {
		console.warn('Error occured on the Node.js server connection: ', e);
	});

	// Initalise Node.js WebSocket connection.
	serverWS.addEventListener('open', () => {
		console.info('Connection to Node.js server successful.');
		sendToServerWS('init', {pluginUUID: connectSocketData.pluginUUID});
		sendToServerWS('buttonLocationsUpdated', {buttonLocations: buttonLocations});
		toggleBackendConnectionStatus(true);
	}, {once: true});

	serverWS.addEventListener('close', e => {
		console.warn(`Connection to Node.js server closed (${e.code}).`);
		toggleBackendConnectionStatus(false);
		clearTimeout(serverWSReconTimeout);
		serverWSReconTimeout = setTimeout(connectToServerWS, 5000);
	}, {once: true});

	serverWS.addEventListener('message', e => {
		const data = e.data;
		sendToSDWS(data);
	});
}

// Helper function to send messages to Node.js WebSocket server if connection is ready.
function sendToServerWS(type, data) {
	if (serverWS && serverWS.readyState === 1) {
		serverWS.send(JSON.stringify({type: type, data: data}));
	}
}
// Helper function to send messages to the Stream Deck WebSocket server if connection is ready.
function sendToSDWS(data) {
	if (sdWS && sdWS.readyState === 1) {
		sdWS.send(data);
	}
}

// Toggles global setting for connection status.
function toggleBackendConnectionStatus(connected) {
	globalSettings.connected = connected;
	sdWS.send(JSON.stringify({event: 'setGlobalSettings', context: connectSocketData.pluginUUID, payload: globalSettings}));
}

// Create object with structure to store button location details for a full size Stream Deck.
function createButtonLocationStorage() {
	var locations = {};
	for (var x = 0; x < 3; x++) {
		locations[x] = {};
		for (var y = 0; y < 5; y++) {
			locations[x][y] = null;
		}
	}
	return locations;
}