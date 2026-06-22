import { writeFileSync, mkdirSync, copyFileSync, existsSync } from 'fs';

const { GOOGLE_CLIENT_ID, GOOGLE_API_KEY, BETA_ACCESS_URL } = process.env;

mkdirSync('public', { recursive: true });

const configContent = GOOGLE_CLIENT_ID && GOOGLE_API_KEY
    ? `window.GOOGLE_CONFIG = {
    CLIENT_ID: '${GOOGLE_CLIENT_ID}',
    API_KEY: '${GOOGLE_API_KEY}',
    BETA_ACCESS_URL: '${(BETA_ACCESS_URL || '').replace(/'/g, "\\'")}',
};
`
    : null;

if (configContent) {
    writeFileSync('public/config.js', configContent);
    console.log('public/config.js generado desde variables de entorno.');
} else if (existsSync('config.js')) {
    copyFileSync('config.js', 'public/config.js');
    console.log('config.js local copiado a public/.');
} else {
    copyFileSync('config.example.js', 'public/config.js');
    console.log('config.example.js usado como fallback.');
}

for (const file of ['index.html', 'app.js', 'styles.js', 'manifest.json', 'privacy.html']) {
    copyFileSync(file, `public/${file}`);
}

console.log('Build listo en public/');
