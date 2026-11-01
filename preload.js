const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  setIgnore: (ignore) => ipcRenderer.send('ignore', ignore),
  dragStart: () => ipcRenderer.send('drag-start'),
  dragMove: () => ipcRenderer.send('drag-move'),
  dragEnd: () => ipcRenderer.send('drag-end'),
  setNext: (t) => ipcRenderer.send('next', t),
  on: (channel, fn) => ipcRenderer.on(channel, () => fn()),
});
