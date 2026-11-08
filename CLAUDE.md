# ercü-bot

Türkçe Discord botu (discord.js v14, SQLite / better-sqlite3, canvas, YouTube müzik). Kurulum ve komutlar: `README.md`.
Sunucuda Docker'la çalışır; `main`'e push Jenkins ile otomatik deploy eder (`~/CLAUDE.md`, markahost).

## Görev akışı (agentkit, 2026-11-01)

- Ortak akış kullanıcı düzeyinde (`~/.claude/CLAUDE.md`, "Görev akışı"): skill `task-flow`, ajanlar `task-builder`,
  `diff-reviewer`, `doc-scout`. Çıktılar `tasks/NNN/` (gitignore'da). Görev Furkan onaylamadan tamamlanmış sayılmaz.
- Bu repoya özgü: `.claude/agentkit.config.mjs` (değişen .js'e `node --check`, komut dosyasına biçim denetimi; docker
  build yalnız sorulup `ak check N --window` ile) ve `.claude/review-rules.md`.
- **Commit ve push'u Furkan atar** (`.claude/skills/no-auto-commit`, kullanıcının genel "commitle" kuralından önce gelir):
  görev onaylansa da commit atılmaz; değişen dosyalar ve önerilen commit mesajı verilir.
- Yerelde `better-sqlite3` / `canvas` native modülü yok: komutları `require` ederek denemek yanıltır; bot yerelde
  `docker compose up` ile çalışır.
