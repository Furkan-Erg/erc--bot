// ercü-bot: agentkit hedefli denetimleri (çekirdek ~/.claude/agentkit; ön ayarlar presets'ten).
// Jenkins'in yaptığının yerel karşılığı: değişen .js'lere `node --check`. Komutları require ederek denemek yerelde
// güvenilmez (better-sqlite3 / canvas native modülü Windows'ta yok, 2026-11-01'de 50 komuttan 23'ü yüklenemedi):
// biçim durağan denetlenir, tam doğrulama docker build'le (yalnız sorulup). main'e push otomatik deploy eder.

// loadCommands.js her komuttan `{ data, execute }` bekler; eksikse komut sessizce yüklenmez.
const SHAPE = `
const fs = require('node:fs'); let bad = 0;
for (const f of process.argv.slice(1)) {
  const s = fs.readFileSync(f, 'utf8');
  const miss = [[/module\\.exports\\s*=/, 'module.exports'], [/\\bdata\\s*:/, 'data'], [/\\bexecute\\b/, 'execute']].filter(([re]) => !re.test(s)).map(([, n]) => n);
  if (miss.length) { bad++; console.log('FAIL ' + f + ': eksik ' + miss.join(', ')); } else console.log('OK ' + f);
}
process.exitCode = bad ? 1 : 0;`;

export default ({ presets: P }) => ({
  maxHeavy: 1,
  checks: {
    syntax: P.node.syntax,
    shape: { label: 'komut biçimi ({ data, execute })', light: true, takesFiles: true, limit: 30,
      argv: files => [process.execPath, '-e', SHAPE, ...files] },
    docker: P.docker('.', 'bot imajı: npm ci + native modüller', 'ercu-bot'),
  },
  rules: [
    P.node.rule,
    [/^src\/commands\/[^/]+\/[^/]+\.js$/, ['shape']],
    [/^(package(-lock)?\.json|Dockerfile|docker-compose\.yml)$/, ['docker']],
  ],
  reviewRules: ['.claude/review-rules.md'],
});
