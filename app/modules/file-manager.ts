import * as fs from 'fs';
import path from 'path';

class FileManager {
  basePath = path.resolve('./app/data');

  createFoldersIfNeed(path: string): void {
    if (!path.includes('/')) {
      return;
    }

    const pathWithoutFile = path.replace(/\/[^\/]+$/, '');
    const endPath = this.basePath + '/' + pathWithoutFile;
    if (!fs.existsSync(endPath)) {
      fs.mkdirSync(endPath, {recursive: true});
    }
  }

  writeData(key: string, data: any, ext = 'json', flag = 'w'): void {
    const resData = ext === 'json' ? JSON.stringify(data) : data;
    this.createFoldersIfNeed(key);
    try {
      fs.writeFileSync(`${this.basePath}/${key}.${ext}`, resData, {flag});
    } catch (e) {
      console.error('Ошибка записи в файл', e);
    }
  }

  appendData(key: string, data: any, ext = 'json'): void {
    return this.writeData(key, data, ext, 'a');
  }

  readData(key: string, ext = 'json'): any | null {
    const path = `${this.basePath}/${key}.${ext}`;

    if (!fs.existsSync(path)) {
      return null;
    }

    const fileContent = fs.readFileSync(path).toString();
    return ext === 'json' ? JSON.parse(fileContent) : fileContent;
  }
}

export default new FileManager();
