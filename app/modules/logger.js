import fm from './file-manager.js';

class Logger {
  clearLogs() {
    fm.writeData('logs/debug', '', 'txt');
    fm.writeData('logs/log', '', 'txt');
    fm.writeData('logs/error', '', 'txt');
  }

  _getText(...data) {
    let text = new Date().toLocaleString('ru') + '\n';
    data.forEach(part => text += JSON.stringify(part) + '\n');
    return data.length ? text + '\n' : '';
  }

  debug(...data) {
    fm.appendData('logs/debug', this._getText(data), 'txt');
  }

  log(...data) {
    fm.appendData('logs/log', this._getText(data), 'txt');
  }

  error(...data) {
    fm.appendData('logs/error', this._getText(data), 'txt');
  }
}

export default new Logger();
