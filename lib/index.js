'use babel';

import { BufferedProcess, CompositeDisposable } from 'atom';
import path from 'path';

let serverRunning = false;
let serverProcess = null;

const packagePath = atom.packages.resolvePackagePath('atom-aden');
const adenEntry = path.join(packagePath, '/node_modules/aden/index.js');
const adenPath = path.join(packagePath, '/node_modules/aden');

export default {
  subscriptions: null,
  lastRootPaths: [],

  activate(state) {
    this.subscriptions = new CompositeDisposable();
    console.log('activate called');

    const startCommandDisposable = atom.commands.add(
      '.tree-view .directory',
      'atom-aden:startFromPath',
      (event) => {
        // Why is this called twice?
        const rootPath = event.target.dataset.path;
        this.lastRootPaths.unshift(rootPath);
        this.startServer({
          rootPath,
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

    atom.menu.add(
      [{
        label: 'Aden',
        submenu: [{
          label: 'Stop Server',
          command: 'atom-aden:stopServer',
        }, {
          label: 'Restart Server',
          command: 'atom-aden:restartServer',
        }],
      }]
    );
  },

  deactivate() {
    this.stopServer();
    this.subscriptions.dispose();
  },

  startServer({ rootPath, isRestart }) {
    // The f'n workaround to the f'n callback being called twice, f' this!
    if (serverRunning) {
      return;
    }
    serverRunning = true;

    const args = [adenEntry];
    args.push('-d');
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

    if (!isRestart) {
      atom.notifications.addSuccess(`Aden is started for ${rootPath}.`);
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
  },

  restartServer() {
    const rootPath = this.lastRootPaths[0];
    atom.notifications.addInfo(`Restarting Aden for ${rootPath}.`);
    this.stopServer(true);
    this.startServer({ rootPath, isRestart: true });
    atom.notifications.addSuccess(`Aden restarted for ${rootPath}.`);
  },
};
