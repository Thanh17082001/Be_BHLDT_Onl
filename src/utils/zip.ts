import * as unzipper from 'unzipper';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);

export async function ensureDir(dirPath: string) {
    await mkdir(dirPath, { recursive: true });
}

export async function saveTempFile(entry: unzipper.Entry, extractDir: string) {
    const fileName = Date.now() + '-' + path.basename(entry.path);
    const outputPath = path.join(extractDir, fileName);
    await ensureDir(extractDir);
    const stream = entry.stream();

    return new Promise<string>((resolve, reject) => {
        const fileStream = fs.createWriteStream(outputPath);
        stream.pipe(fileStream);
        fileStream.on('finish', () => resolve(outputPath));
        fileStream.on('error', reject);
    });
}