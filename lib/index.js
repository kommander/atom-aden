'use babel';

import { BufferedProcess, CompositeDisposable } from 'atom';

export default {
  subscriptions: null,

  activate(state) {
    if (this.subscriptions) {
      this.subscriptions.dispose();
      this.subscriptions = null;
    }
    this.subscriptions = new CompositeDisposable();
    console.log('activate called');

    const startCommandDisposable = atom.commands.add(
      '.tree-view .directory',
      'atom-aden:startFromPath',
      (event) => {
        // WTF!? Why is this called twice? FUCK THIS SHIT! I HATE SOFTWARE!!!
        console.log('Eventzz', event.target);
        this.startServer();
      });

    this.subscriptions.add(startCommandDisposable);

    atom.menu.add(
      [{
        label: 'Aden',
        submenu: [{
          label: 'Stop server',
          command: `atom-aden:stopServer`
        }]
      }]
    );
  },

  deactivate() {
    this.stopServer();
    this.subscriptions.dispose();
  },

  startServer() {
    atom.notifications.addSuccess('Aden is started.');
  },

  stopServer() {
    
  }
};
