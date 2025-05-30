const { app, BrowserWindow } = require('electron');
const path = require('path');
const url = require('url'); // For production loading

function createWindow () {
  const mainWindow = new BrowserWindow({
    width: 1280, // Increased width for better layout
    height: 800,
    webPreferences: {
      // preload: path.join(__dirname, 'preload.js'), // Optional preload script
      nodeIntegration: false, // Recommended for security
      contextIsolation: true, // Recommended for security
      // enableRemoteModule: false, // Recommended for security, true if you need it (not typical for new apps)
    }
  });

  // Load the React app
  // For development, load from Vite dev server
  // For production, load the index.html from the build output
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173'); // Assuming Vite runs on 5173
    mainWindow.webContents.openDevTools(); // Open DevTools automatically in dev
  } else {
    // Production mode: load the built index.html file.
    // path.join(__dirname, 'dist/index.html') assumes electron.js is in the root
    // and 'dist' is also in the root.
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
    // Alternatively, using url.format for more robust path handling:
    // mainWindow.loadURL(url.format({
    //   pathname: path.join(__dirname, 'dist/index.html'),
    //   protocol: 'file:',
    //   slashes: true
    // }));
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  // Quit when all windows are closed, except on macOS. There, it's common
  // for applications and their menu bar to stay active until the user quits
  // explicitly with Cmd + Q.
  if (process.platform !== 'darwin') app.quit();
});

// Optional: Handle certificate errors for local dev servers if needed
// app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
//   // Logic to check if the error is for localhost and approve
//   if (url.startsWith('https://localhost')) {
//     event.preventDefault();
//     callback(true); // Proceed without error
//   } else {
//     callback(false); // Default behavior for other URLs
//   }
// });
