/* eslint-disable */

var sdWS;
var serverWS;
var serverWSReconnTimeout;
var connectSocketData = {};
var globalSettings = {};
var buttonLocations = {};

// Create object with structure to store button location details.
function createButtonLocationStorage(rows, columns) {
  var locations = {};
  for (var x = 0; x < rows; x++) {
    locations[x] = {};
    for (var y = 0; y < columns; y++) {
      locations[x][y] = null;
    }
  }
  return locations;
}

// Toggles global setting for connection status.
function toggleBackendConnectionStatus(connected) {
  globalSettings.connected = connected;
  sdWS.send(JSON.stringify({ event: 'setGlobalSettings', context: connectSocketData.pluginUUID, payload: globalSettings }));
}

// Helper function to send messages to the node-streamdeck-util server if connection is ready.
function sendToServerWS(type, data) {
  if (serverWS && serverWS.readyState === 1) {
    serverWS.send(JSON.stringify({ type: type, data: data }));
  }
}

// node-streamdeck-util connection.
function connectToServerWS() {
  if (serverWS) serverWS.close(); // Close current connection if one is active.
  clearTimeout(serverWSReconnTimeout);

  serverWS = new WebSocket(`${globalSettings.url}/?key=${globalSettings.key}`);
  console.info(
    'Connecting to node-streamdeck-util server using %s and key %s',
    globalSettings.url,
    globalSettings.key,
  );

  serverWS.addEventListener('error', e => {
    console.warn('Error occured on the node-streamdeck-util server connection:', e);
  });

  // Initalise node-streamdeck-util server connection.
  serverWS.addEventListener('open', () => {
    console.info('Connection to node-streamdeck-util server successful');
    sendToServerWS('init', { pluginUUID: connectSocketData.pluginUUID });
    sendToServerWS('buttonLocationsUpdated', { buttonLocations: buttonLocations });
    toggleBackendConnectionStatus(true);
  }, { once: true });

  serverWS.addEventListener('close', e => {
    console.warn('Connection to node-streamdeck-util server closed (%s)', e.code);
    toggleBackendConnectionStatus(false);
    clearTimeout(serverWSReconnTimeout);
    serverWSReconnTimeout = setTimeout(connectToServerWS, 5000);
  }, { once: true });

  // Relays any messages sent from the node-streamdeck-util server to the main socket.
  serverWS.addEventListener('message', e => {
    const data = e.data;
    if (sdWS && sdWS.readyState === 1) {
      sdWS.send(data);
    }
  });
}

// Initalise connection to Stream Deck's WebSocket.
function connectToSDWS() {
  if (sdWS) sdWS.close(); // Close current connection if one is active.

  sdWS = new WebSocket(`ws://127.0.0.1:${connectSocketData.port}`);
  console.info('Connecting to Stream Deck software');

  sdWS.addEventListener('error', e => {
    console.error('Error occured on the Stream Deck software connection:', e);
  });

  // Initalise Stream Deck WebSocket connection.
  sdWS.addEventListener('open', () => {
    console.info('Connection to Stream Deck software successful');
    buttonLocations = {};
    sdWS.send(JSON.stringify({ event: connectSocketData.registerEvent, uuid: connectSocketData.pluginUUID }));
    sdWS.send(JSON.stringify({ event: 'getGlobalSettings', context: connectSocketData.pluginUUID }));
  }, { once: true });

  sdWS.addEventListener('close', e => {
    console.warn('Connection to Stream Deck software closed (%s)', e.code);
    buttonLocations = {};
  }, { once: true });

  sdWS.addEventListener('message', e => {
    const data = JSON.parse(e.data);
    const { event, device, deviceInfo, action, context, payload } = data;

    // Create button location storage for this device if empty; usually from a deviceDidConnect message.
    if (device && !buttonLocations[device]) {
      buttonLocations[device] = createButtonLocationStorage(deviceInfo.size.rows, deviceInfo.size.columns);
    }

    // Adjust our button locations cache when buttons are added/removed, and set defaults.
    // TODO: Is all this needed? Maybe even more.
    if (event === 'willAppear') {
      buttonLocations[device][payload.coordinates.row][payload.coordinates.column] = {};
      buttonLocations[device][payload.coordinates.row][payload.coordinates.column].context = context;
      buttonLocations[device][payload.coordinates.row][payload.coordinates.column].action = action;
      buttonLocations[device][payload.coordinates.row][payload.coordinates.column].isInMultiAction = payload.isInMultiAction;
    } else if (event === 'willDisappear') {
      buttonLocations[device][payload.coordinates.row][payload.coordinates.column] = null;
    }

    // Update title/title parameters/state we have saved if it's changed.
    // TODO: Is all this needed? Maybe even more.
    if (event === 'titleParametersDidChange') {
      buttonLocations[device][payload.coordinates.row][payload.coordinates.column].title = payload.title;
      buttonLocations[device][payload.coordinates.row][payload.coordinates.column].titleParameters = payload.titleParameters;
      buttonLocations[device][payload.coordinates.row][payload.coordinates.column].state = payload.state;
    }

    // If buttonLocations were updated for any reason, relay this to the node-streamdeck-util server.
    if (['willAppear', 'willDisappear', 'titleParametersDidChange'].includes(event)) {
      sendToServerWS('buttonLocationsUpdated', { buttonLocations: buttonLocations });
    }

    // Update global settings if needed, usually for first use.
    // This updates local stored settings and sets any defaults if needed,
    // then connects to the node-streamdeck-util server.
    if (data.event === 'didReceiveGlobalSettings') {
      globalSettings.url = data.payload.settings.url || 'ws://localhost:9091'; // Default if setting is empty
      globalSettings.key = data.payload.settings.key || 'DEFAULT_KEY'; // Default if setting is empty
      globalSettings.connected = false;
      sdWS.send(JSON.stringify({ event: 'setGlobalSettings', context: connectSocketData.pluginUUID, payload: globalSettings }));
      connectToServerWS();
    }

    // Sends the full raw message to the node-streamdeck-util server.
    sendToServerWS('rawSD', data);
  });
}

// Triggered by the Stream Deck software.
function connectElgatoStreamDeckSocket(port, pluginUUID, registerEvent, info) {
  connectSocketData.port = port;
  connectSocketData.pluginUUID = pluginUUID;
  connectSocketData.registerEvent = registerEvent;
  connectSocketData.info = info;
  connectToSDWS();
}
