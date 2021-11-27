import * as fs from 'fs';
import path from 'path';

class FileManager {
  basePath = path.resolve('./app/data');

  createFoldersIfNeed(path) {
    const pathWithoutFile = path.replace(/\/[^\/]+$/, '');
    const endPath = this.basePath + '/' + pathWithoutFile;
    if (!fs.existsSync(endPath)) {
      fs.mkdirSync(endPath, {recursive: true});
    }
  }

  writeData(key, data, ext = 'json', flag = 'w') {
    const resData = ext === 'json' ? JSON.stringify(data) : data;
    this.createFoldersIfNeed(key);
    fs.writeFileSync(`${this.basePath}/${key}.${ext}`, resData, {flag});
  }

  appendData(key, data, ext = 'json') {
    return this.writeData(key, data, ext, 'a');
  }

  readData(key, ext = 'json') {
    const path = `${this.basePath}/${key}.${ext}`;

    if (!fs.existsSync(path)) {
      return null;
    }

    const fileContent = fs.readFileSync(path);
    return ext === 'json' ? JSON.parse(fileContent) : fileContent;
  }
}

export default new FileManager();
