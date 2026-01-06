import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import { execSync } from 'node:child_process';

const appVersion = execSync('git describe --tags --always --dirty').toString().trim();

function loadHttpsOptions() {
    const isEnabled = process.env.DEV_HTTPS && process.env.DEV_HTTPS !== '0';
    if (!isEnabled) {
        return undefined;
    }

    const keyPath = path.resolve(
        process.env.DEV_HTTPS_KEY ?? 'certs/dev.key.pem',
    );
    const certPath = path.resolve(
        process.env.DEV_HTTPS_CERT ?? 'certs/dev.cert.pem',
    );

    try {
        return {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath),
        };
    } catch (error) {
        console.warn(
            'DEV_HTTPS is set but TLS assets could not be loaded:',
            error,
        );
        return undefined;
    }
}

export default defineConfig(({ command }) => {
    const shouldServe = command === 'serve';
    const https = shouldServe ? loadHttpsOptions() : undefined;

    return {
        define: {
            __APP_VERSION__: JSON.stringify(appVersion),
        },
        // Use relative base path so the app works on https://<user>.github.io/<repo>/
        base: './',
        server: https ? { https } : undefined,
        test: {
            environment: 'jsdom',
            exclude: ['**/node_modules/**', '**/tests/**'],
        },
    };
});
