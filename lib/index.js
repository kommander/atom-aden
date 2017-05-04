'use babel';

import { BufferedProcess, CompositeDisposable } from 'atom';
import path from 'path';

let serverRunning = false;
let serverProcess = null;

const packagePath = atom.packages.resolvePackagePath('atom-aden');
const adenPath = path.join(packagePath, '/node_modules/aden/index.js');

export default {
  subscriptions: null,

  activate(state) {
    this.subscriptions = new CompositeDisposable();
    console.log('activate called');

    const startCommandDisposable = atom.commands.add(
      '.tree-view .directory',
      'atom-aden:startFromPath',
      (event) => {
        // Why is this called twice?
        this.startServer({
          rootPath: event.target.dataset.path,
        });
      });

    const stopCommandDisposable = atom.commands.add(
      'atom-workspace',
      'atom-aden:stopServer',
      () => {
        this.stopServer();
      });

    this.subscriptions.add(startCommandDisposable);
    this.subscriptions.add(stopCommandDisposable);

    atom.menu.add(
      [{
        label: 'Aden',
        submenu: [{
          label: 'Stop server',
          command: 'atom-aden:stopServer',
        }],
      }]
    );
  },

  deactivate() {
    this.stopServer();
    this.subscriptions.dispose();
  },

  startServer({ rootPath }) {
    // The f'n workaround to the f'n callback being called twice, f' this!
    if (serverRunning) {
      return;
    }
    serverRunning = true;

    const args = [adenPath];
    args.push('-d');
    args.push(rootPath);
    args.push('--log-no-date');

    console.log('Attempting to start Aden with args', args);

    const cpyEnv = Object.assign({}, process.env);
    delete cpyEnv.NODE_ENV;

    // Not using BufferedNodeProcess bc. node-sass does not support the runtime
    serverProcess = new BufferedProcess({
      command: 'node',
      args,
      stdout: console.log,
      exit: (code) => {
        console.log(`Aden exited with code ${code}`);
        this.stopServer();
      },
      options: {
        cwd: rootPath,
        env: cpyEnv,
      },
    });

    atom.notifications.addSuccess(`Aden is started for ${rootPath}.`);
  },

  stopServer() {
    try {
      if (serverProcess) {
        serverProcess.kill();
      }
    } catch (e) {
      console.error(e);
    }

    serverProcess = null;
    serverRunning = false;
    atom.notifications.addSuccess('Aden stopped.');
  },
};
