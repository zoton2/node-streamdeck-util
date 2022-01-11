function updateConnectionStatus(connected) {
  if (connected) {
    document.getElementById('connectionStatus').innerHTML = 'CONNECTED';
    document.getElementById('connectionStatus').style.color = 'lightgreen';
  }
  else {
    document.getElementById('connectionStatus').innerHTML = 'DISCONNECTED';
    document.getElementById('connectionStatus').style.color = 'red';
  }
}

// Wait for the document to fully load before doing this stuff.
document.addEventListener('DOMContentLoaded', e => {
  const globalSettings = window.opener.globalSettings;

  document.getElementById('url').value = globalSettings.url;
  document.getElementById('key').value = globalSettings.key;
  updateConnectionStatus(globalSettings.connected);

  // Pass back the updated settings when saving and close the window.
  document.getElementById('save').addEventListener('click', () => {
    var url = document.getElementById('url').value;
    var key = document.getElementById('key').value;

    // If we need to update the stored values, do that now.
    if (url !== globalSettings.url || key !== globalSettings.key) {
      window.opener.gotCallbackFromWindow({
        url: url,
        key: key
      });
    }

    window.close();
  });
});
