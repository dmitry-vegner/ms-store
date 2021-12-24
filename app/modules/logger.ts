import fileManager from './file-manager.js';

class Logger {
  clearLogs(): void {
    fileManager.writeData('logs/debug', '', 'txt');
    fileManager.writeData('logs/log', '', 'txt');
    fileManager.writeData('logs/error', '', 'txt');
  }

  _getText(...data: any[]): string {
    let text = new Date().toLocaleString('ru') + '\n';
    data.forEach(part => text += JSON.stringify(part) + '\n');
    return data.length ? text + '\n' : '';
  }

  debug(...data: any[]): void {
    fileManager.appendData('logs/debug', this._getText(data), 'txt');
  }

  log(...data: any[]): void {
    fileManager.appendData('logs/log', this._getText(data), 'txt');
  }

  error(...data: any[]): void {
    fileManager.appendData('logs/error', this._getText(data), 'txt');
  }
}

export default new Logger();
