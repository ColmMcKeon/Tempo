const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  listProjects:     ()                => ipcRenderer.invoke('list-projects'),
  loadProject:      (file, archived)  => ipcRenderer.invoke('load-project', file, archived),
  saveProject:      (file, data)      => ipcRenderer.invoke('save-project', file, data),
  archiveProject:   (file)            => ipcRenderer.invoke('archive-project', file),
  unarchiveProject: (file)            => ipcRenderer.invoke('unarchive-project', file),
  openFileDialog:   ()                => ipcRenderer.invoke('open-file-dialog'),
  getDataDir:       ()                => ipcRenderer.invoke('get-data-dir'),
  exportHtml:       (html, filename)  => ipcRenderer.invoke('export-html', html, filename),
  resizeToFit:      (w, h)            => ipcRenderer.invoke('resize-to-fit', w, h),
  setDirty:         (dirty)           => ipcRenderer.send('set-dirty', dirty),
  saveComplete:     ()                => ipcRenderer.send('save-complete'),
  onSaveAndQuit:    (cb)              => ipcRenderer.on('save-and-quit', cb),
});
