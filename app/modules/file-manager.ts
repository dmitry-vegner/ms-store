import * as fs from 'fs';
import path from 'path';

class FileManager {
  basePath = path.resolve('./');
  dataPath = path.resolve('./app/data');

  isFileExist(fullPath: string): boolean {
    return fs.existsSync(fullPath);
  }

  getFileFullPath(path: string, inData = false): string {
    const basePath = inData ? this.dataPath : this.basePath;
    return basePath + '/' + path;
  }

  clearFile(fullPath: string): void {
    if (this.isFileExist(fullPath)) {
      fs.writeFileSync(fullPath, '');
    }
  }

  createFoldersIfNeed(path: string): void {
    if (!path.includes('/')) {
      return;
    }

    const pathWithoutFile = path.replace(/\/[^\/]+$/, '');
    const endPath = this.dataPath + '/' + pathWithoutFile;
    if (!fs.existsSync(endPath)) {
      fs.mkdirSync(endPath, {recursive: true});
    }
  }

  writeData(key: string, data: any, ext = 'json', flag = 'w'): void {
    const resData = ext === 'json' ? JSON.stringify(data) : data;
    this.createFoldersIfNeed(key);
    try {
      fs.writeFileSync(`${this.dataPath}/${key}.${ext}`, resData, {flag});
    } catch (e) {
      console.error('Ошибка записи в файл', e);
    }
  }

  appendData(key: string, data: any, ext = 'json'): void {
    return this.writeData(key, data, ext, 'a');
  }

  readData(key: string, ext = 'json'): any | null {
    const path = `${this.dataPath}/${key}.${ext}`;

    if (!fs.existsSync(path)) {
      return null;
    }

    const fileContent = fs.readFileSync(path).toString();
    return ext === 'json' ? JSON.parse(fileContent) : fileContent;
  }
}

export default new FileManager();
