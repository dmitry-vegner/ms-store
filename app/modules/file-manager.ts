import * as fs from 'fs';
import path from 'path';

class FileManager {
  basePath = path.resolve('./app/data');

  createFoldersIfNeed(path: string): void {
    const pathWithoutFile = path.replace(/\/[^\/]+$/, '');
    const endPath = this.basePath + '/' + pathWithoutFile;
    if (!fs.existsSync(endPath)) {
      fs.mkdirSync(endPath, {recursive: true});
    }
  }

  writeData(key: string, data: any, ext = 'json', flag = 'w'): void {
    const resData = ext === 'json' ? JSON.stringify(data) : data;
    this.createFoldersIfNeed(key);
    fs.writeFileSync(`${this.basePath}/${key}.${ext}`, resData, {flag});
  }

  appendData(key: string, data: any, ext = 'json'): void {
    return this.writeData(key, data, ext, 'a');
  }

  readData(key: string, ext = 'json'): any {
    const path = `${this.basePath}/${key}.${ext}`;

    if (!fs.existsSync(path)) {
      return null;
    }

    const fileContent = fs.readFileSync(path).toString();
    return ext === 'json' ? JSON.parse(fileContent) : fileContent;
  }
}

export default new FileManager();
