const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // For simplicity, disable context isolation
    },
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

// Handle data saving
ipcMain.on('save-data', (event, data) => {
  const date = new Date().toISOString().split('T')[0];
  const filename = `data_${date}.json`;
  fs.writeFileSync(filename, JSON.stringify(data, null, 2));
});
