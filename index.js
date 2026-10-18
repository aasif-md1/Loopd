// @ts-ignore
if (typeof process !== 'undefined' && process.versions && process.versions.electron) {
  require('./electron-main.js');
} else {
  require('expo-router/entry');
}
