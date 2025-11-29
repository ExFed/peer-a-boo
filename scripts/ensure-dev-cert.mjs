#!/usr/bin/env node
import { access, mkdir, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import selfsigned from 'selfsigned';

const CERT_DIR = path.resolve('certs');
const KEY_PATH = path.join(CERT_DIR, 'dev.key.pem');
const CERT_PATH = path.join(CERT_DIR, 'dev.cert.pem');

async function fileExists(filePath) {
    try {
        await access(filePath, constants.F_OK);
        return true;
    } catch {
        return false;
    }
}

async function ensureCert() {
    const keyExists = await fileExists(KEY_PATH);
    const certExists = await fileExists(CERT_PATH);

    if (keyExists && certExists) {
        console.log('Development TLS key and certificate already exist.');
        return;
    }

    await mkdir(CERT_DIR, { recursive: true });

    const attrs = [{ name: 'commonName', value: 'localhost' }];
    const extensions = [{
        name: 'subjectAltName',
        altNames: [
            { type: 2, value: 'localhost' },
            { type: 7, ip: '127.0.0.1' },
        ],
    }];

    const { private: key, cert } = selfsigned.generate(attrs, {
        days: 365,
        keySize: 2048,
        algorithm: 'sha256',
        extensions,
    });

    await writeFile(KEY_PATH, key, { mode: 0o600 });
    await writeFile(CERT_PATH, cert, { mode: 0o644 });

    console.log('Generated a self-signed certificate for https://localhost.');
}

ensureCert().catch((error) => {
    console.error('Failed to prepare development TLS assets:', error);
    process.exitCode = 1;
});
