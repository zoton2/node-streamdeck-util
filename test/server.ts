import StreamDeck from '../src';

// Create new instance of the utility.
var sd = new StreamDeck();

// Start listening for connections from the Stream Deck plugin.
// key - the secret key to authenticate the connection, defaults to DEFAULT_KEY
// port - the port the connection will use, defaults to 9091
// debug - if you want to print debug messages, useful for development
sd.listen({
  key: 'DEFAULT_KEY',
  port: 9091,
  debug: true
});

// When the connection between the plugin and this instance is open.
sd.on('open', (socketId) => {
  console.log('open (socket %s)', socketId);
});

// If the connection between the plugin and this instance is closed.
sd.on('close', (socketId, code, reason) => {
  console.log('close: %s, %s (socket %s)', code, reason, socketId);
});

// If there are any errors on the connection between the plugin and this instance.
sd.on('error', (socketId, err) => {
  console.log('error (socket %s):', socketId);
  console.log(err);
});

// Listens for the Stream Deck's events.
sd.on('message', (socketId, msg) => {
  console.log('message (socket %s):', socketId);
  console.log(msg);

  var buttonLocations = sd.getButtonLocations(); // object, see below

  console.log(buttonLocations);

  // Send a message back to the Stream Deck application; the send function stringifies it for you.
  /* sd.send({
    event: 'openUrl',
    payload: {
      url: 'https://www.elgato.com'
    }
  }); */
});

// You can directly listen for Stream Deck's events by their name if you want to.
sd.on('keyDown', (socketId, msg) => {
  console.log('keyDown (socket %s):', socketId);
  console.log(msg);
});
