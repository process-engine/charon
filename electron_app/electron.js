const electron = require('electron');
const autoUpdater = require('electron-updater').autoUpdater;
const path = require('path');
const app = electron.app;
const notifier = require('electron-notifications');
const isDev = require('electron-is-dev');
const getPort = require('get-port');
const fs = require('fs');
const startProcessEngine = require('@process-engine/skeleton-electron');

const prereleaseRegex = /\d+\.\d+\.\d+-pre-b\d+/;

if (!isDev) {
  const userDataFolder = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Preferences' : '/var/local');
  process.env.datastore__service__data_sources__default__adapter__databasePath = path.join(userDataFolder, 'process-engine_database');

  process.env.CONFIG_PATH = path.join(__dirname, '..', '..', '..', 'config');
}

getPort({port: 8000, host: '0.0.0.0'})
.then((port) => {
  process.env.http__http_extension__server__port = port;

  let internalProcessEngineStatus = undefined;
  let internalProcessEngineStatupError = undefined;
  const internalProcessEngineStatusListeners = [];

  function sendInternalProcessEngineStatus(sender) {
    let serializedStartupError;
    if (internalProcessEngineStatupError !== undefined && internalProcessEngineStatupError !== null) {
      serializedStartupError = JSON.stringify(internalProcessEngineStatupError, Object.getOwnPropertyNames(internalProcessEngineStatupError));
    } else {
      serializedStartupError = undefined;
    }
    sender.send('internal_processengine_status', internalProcessEngineStatus, serializedStartupError);
  }

  function publishProcessEngineStatus() {
    internalProcessEngineStatusListeners.forEach(sendInternalProcessEngineStatus);
  }

  // When someone wants to subscribe to the internal processengine status, he
  // must first send a `add_internal_processengine_status_listener` message
  // over the event aggregator. We recieve this message here and add them
  // to our listeners array.
  //
  // As soon the processengine status is updated, we send the listeners a
  // notification about this change.
  //
  // If the processengine status is known at the time the listener registered,
  // we instantly send the listener a notification.
  //
  // This is quite a unusual pattern, the problem this solves this the
  // following: Its impossible to do interactions between threads in
  // electron like this:
  //
  //  'renderer process'              'main process'
  //          |                             |
  //          o   <<<- Send Message  -<<<   x
  //
  // -------------------------------------------------
  //
  // Instead our interaction now locks like this:
  //
  //  'renderer process'              'main process'
  //          |                             |
  //          x   >>>--  Subscribe  -->>>   o
  //          |                             |
  //          o   <<<- Send Message  -<<<   x
  //          |           (...)             |
  //          o   <<<- Send Message  -<<<   x
  //
  electron.ipcMain.on('add_internal_processengine_status_listener', (event) => {
    if (!internalProcessEngineStatusListeners.includes(event.sender)) {
      internalProcessEngineStatusListeners.push(event.sender);
    }

    if (internalProcessEngineStatus !== undefined) {
      sendInternalProcessEngineStatus(event.sender);
    }
  });

  // TODO: Check if the ProcessEngine instance is now run on the UI thread.
  // See issue https://github.com/process-engine/bpmn-studio/issues/312
  startProcessEngine()
    .then((processengine) => {
      console.log('Internal ProcessEngine started successfully.');
      internalProcessEngineStatus = 'success';
      publishProcessEngineStatus();

    }).catch((error) => {
      console.log('Failed to start internal ProcessEngine: ', error);
      internalProcessEngineStatus = 'error';
      internalProcessEngineStatupError = error;
      publishProcessEngineStatus();
    });

  electron.ipcMain.on('get_host', (event) => {
    event.returnValue = `localhost:${port}`;
  });

  let mainWindow = null;

  const installButtonText = 'Install';
  const dismissButtonText = 'Dismiss';

  function createWindow () {
    if (mainWindow !== null) {
      return;
    }

    mainWindow = new electron.BrowserWindow({
      width: 1300,
      height: 800,
      title: "BPMN-Studio",
      minWidth: 1300,
      minHeight: 800,
      icon: path.join(__dirname, '../build/icon.png'),  // only for windows and linux
    });

    mainWindow.loadURL(`file://${__dirname}/../index.html`);
    mainWindow.on('closed', () => {
      mainWindow = null;
    });

    autoUpdater.checkForUpdates();

    const currentVersion = electron.app.getVersion();
    const currentVersionIsPrerelease = prereleaseRegex.test(currentVersion);

    autoUpdater.allowPrerelease = currentVersionIsPrerelease;

    console.log(`CurrentVersion: ${currentVersion}, CurrentVersionIsPrerelease: ${currentVersionIsPrerelease}`);

    autoUpdater.addListener('error', (error) => {
      const notification = notifier.notify('Update error', {
        message: 'Update failed',
        buttons: [dismissButtonText],
      });
      notification.on('buttonClicked', (text, buttonIndex, options) => {
        notification.close();
      });
    });

    autoUpdater.addListener('update-available', (info) => {
      notifier.notify('Update available', {
        message: 'Started downloading',
        buttons: [dismissButtonText],
      });
    });

    autoUpdater.addListener('update-downloaded', (info) => {
      const notification = notifier.notify('Update ready', {
        message: 'Update ready for installation',
        duration: '60000',
        buttons: [installButtonText, dismissButtonText],
      });

      notification.on('buttonClicked', (text, buttonIndex, options) => {
        const installButtonClicked = text === installButtonText;
        if (installButtonClicked) {
          autoUpdater.quitAndInstall();
        } else {
          notification.close();
        }
      })
    });

    var template = [{
      label: "BPMN-Studio",
      submenu: [
          {
            label: "About BPMN-Studio", selector: "orderFrontStandardAboutPanel:"
          },
          {
            type: "separator"
          },
          {
            label: "Open Dev Tools", accelerator: "Command+Alt+I", click: function() {
              mainWindow.webContents.toggleDevTools();
            }
          },
          {
            label: "Quit", accelerator: "Command+Q", click: function() {
            app.quit();
          }}
      ]}, {
      label: "Edit",
      submenu: [
          {
            label: "Undo", accelerator: "CmdOrCtrl+Z", selector: "undo:"
          },
          {
            label: "Redo", accelerator: "CmdOrCtrl+Shift+Z", selector: "redo:"
          },
          {
            type: "separator"
          },
          {
            label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:"
          },
          {
            label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:"
          },
          {
            label: "Select All", accelerator: "CmdOrCtrl+A", selector: "selectAll:"
          }
      ]}
    ];
    electron.Menu.setApplicationMenu(electron.Menu.buildFromTemplate(template));
  }

  let filePath;

  app.on('ready', createWindow);
  app.on('activate', createWindow);
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
    filePath = undefined;
  });

  app.on('will-finish-launching', () => {
    // for windows
    if (process.platform == 'win32' && process.argv.length >= 2) {
      filePath = process.argv[1];
    }

    // for non-windows
    app.on('open-file', (event, path) => {
      filePath = path;
    });
  });

  electron.ipcMain.on('get_opened_file', (event) => {
    if (filePath === undefined) {
      event.returnValue = {};
      return;
    }

    event.returnValue = {
      path: filePath,
      content: fs.readFileSync(filePath, 'utf8'),
    }
    filePath = undefined;
    app.focus();

  });
});
