'use babel';

import { BufferedProcess, CompositeDisposable } from 'atom';
import path from 'path';

let serverRunning = false;
let serverProcess = null;

const packagePath = atom.packages.resolvePackagePath('atom-aden');
const adenEntry = path.join(packagePath, '/node_modules/aden/index.js');
const adenPath = path.join(packagePath, '/node_modules/aden');

// TODO: The package should add .server/.aden files to be treated as js/json

export default {
  subscriptions: null,
  lastRootPaths: [],
  disposableMenus: null,
  startMenu: null,

  activate() {
    this.subscriptions = new CompositeDisposable();
    this.disposableMenus = new CompositeDisposable();
    this.startMenu = new CompositeDisposable();

    const startCommandDisposable = atom.commands.add(
      '.tree-view .directory',
      'atom-aden:startFromPath',
      (event) => {
        // Why is this called twice?
        const rootPath = this.rootPathFromEvent(event);
        this.startServer({
          rootPath,
        });
      });

    const buildCommandDisposable = atom.commands.add(
      '.tree-view .directory',
      'atom-aden:buildFromPath',
      (event) => {
        // Why is this called twice?
        const rootPath = this.rootPathFromEvent(event);
        this.startServer({
          rootPath,
          build: true,
        });
      });

    const cleanCommandDisposable = atom.commands.add(
      '.tree-view .directory',
      'atom-aden:cleanFromPath',
      (event) => {
        // Why is this called twice?
        const rootPath = this.rootPathFromEvent(event);
        this.startServer({
          rootPath,
          clean: true,
        });
      });

    const stopCommandDisposable = atom.commands.add(
      'atom-workspace',
      'atom-aden:stopServer',
      () => {
        this.stopServer();
      });

    const restartCommandDisposable = atom.commands.add(
      'atom-workspace',
      'atom-aden:restartServer',
      () => {
        this.restartServer();
      });

    this.subscriptions.add(startCommandDisposable);
    this.subscriptions.add(stopCommandDisposable);
    this.subscriptions.add(restartCommandDisposable);
    this.subscriptions.add(buildCommandDisposable);
    this.subscriptions.add(cleanCommandDisposable);

    this.addPermanentContextMenu();
  },

  addPermanentContextMenu() {
    atom.contextMenu.add({
      '.tree-view .directory': [{
        label: 'Aden',
        submenu: [{
          label: 'Start Aden here',
          command: 'atom-aden:startFromPath',
        }, {
          label: 'Build here',
          command: 'atom-aden:buildFromPath',
        }, {
          label: 'Clean this tree',
          command: 'atom-aden:cleanFromPath',
        }],
      }],
    });
  },

  deactivate() {
    this.stopServer();
    this.subscriptions.dispose();
    this.disposableMenus.dispose();
  },

  rootPathFromEvent(event) {
    let target = event.target || event.currentTarget;
    if (target.className.match(/header/)) {
      target = target.firstChild;
    }
    const rootPath = target.dataset.path;
    if (typeof rootPath === 'undefined') {
      throw new Error('Rootpath not defined');
    }
    this.lastRootPaths.unshift(rootPath);
    return rootPath;
  },

  startServer({ rootPath, isRestart, build, clean }) {
    // The f'n workaround to the f'n callback being called twice, f' this!
    if (serverRunning) {
      return;
    }
    serverRunning = true;

    let message;
    const args = [adenEntry];
    if (build) {
      args.push('-b');
      message = `Production build started for ${rootPath}.`;
    } else if (clean) {
      args.push('-c');
      message = `Cleanup started for ${rootPath}.`;
    } else {
      args.push('-d');
      message = `Starting up Aden for ${rootPath}.`;
    }
    args.push(rootPath);
    args.push('--log-no-date');
    // args.push('--debug');

    console.log('Attempting to start Aden with args', args);

    const cpyEnv = Object.assign({}, process.env);
    delete cpyEnv.NODE_ENV;

    // Not using BufferedNodeProcess bc. node-sass does not support the runtime
    serverProcess = new BufferedProcess({
      command: 'node',
      args,
      stdout: console.log,
      stderr: (errStr) => {
        console.error(errStr);
        atom.notifications.addError(`Aden says: ${errStr}`);
      },
      exit: (code) => {
        console.log(`Aden exited with code ${code}`);
        this.stopServer();
      },
      options: {
        cwd: adenPath,
        env: cpyEnv,
      },
    });

    this.disposableMenus.dispose();
    this.disposableMenus = new CompositeDisposable();

    const topBarMenu = atom.menu.add(
      [{
        label: 'Aden',
        submenu: [{
          label: 'Stop Server',
          command: 'atom-aden:stopServer',
        }, {
          label: 'Turn it off and on again',
          command: 'atom-aden:restartServer',
        }],
      }]
    );

    const contextMenu = atom.contextMenu.add({
      '.tree-view .directory': [{
        label: 'Stop Aden',
        command: 'atom-aden:stopServer',
      }],
    });

    this.disposableMenus.add(topBarMenu);
    this.disposableMenus.add(contextMenu);

    if (!isRestart) {
      atom.notifications.addSuccess(message);
    }
  },

  stopServer(isRestart) {
    try {
      if (serverProcess) {
        serverProcess.kill();
      }
    } catch (e) {
      console.error(e);
    }

    serverProcess = null;
    serverRunning = false;

    if (!isRestart) {
      atom.notifications.addSuccess('Aden stopped.');
    }

    this.disposableMenus.dispose();
    this.disposableMenus = new CompositeDisposable();
  },

  restartServer() {
    const rootPath = this.lastRootPaths[0];
    atom.notifications.addInfo(`Restarting Aden for ${rootPath}.`);
    this.stopServer(true);
    this.startServer({ rootPath, isRestart: true });
    atom.notifications.addSuccess(`Aden restarted for ${rootPath}.`);
  },
};
