# ercü-bot: gözden geçirme kuralları

- **Komut biçimi:** `src/commands/<kategori>/<ad>.js` → `module.exports = { data: new SlashCommandBuilder()…, execute }`;
  `loadCommands.js` biçimi tutmayanı sessizce atlar. Olaylar `src/events/` (`loadEvents.js`).
- **Etkileşim yanıtı:** her yolda tam bir kez `reply` / `deferReply` + `editReply`; 3 sn'yi aşacak iş (müzik, görsel,
  dış istek) önce `deferReply`. Hata yolunda da yanıt verilir (yoksa "Uygulama yanıt vermedi").
- **Veritabanı:** SQL yalnız `src/database/repositories/` üzerinden ve parametreli (`?` / `@ad`); şablon dizesiyle SQL
  kurulmaz. Şema değişikliği `src/database/migrations/` altında yeni dosya; eski migration değişmez.
- **Ekonomi:** bakiye düşen her işlem eksiye düşmeyi ve eşzamanlı çift kullanımı (transaction) engeller; bekleme süresi
  `utils/cooldowns.js` ile.
- **Yetki:** moderasyon komutları `utils/permissions.js` (`MOD_ROLE_ID`) ile denetlenir; botun kendinden yüksek role
  dokunmaya çalışması yakalanır.
- **Sırlar:** `DISCORD_TOKEN` ve öbürleri yalnız `.env` / ortamdan (`config.js`); repoya, log'a, mesaja girmez.
- **Dış istekler** (YouTube, Steam, yt-dlp): zaman aşımı ve hata yakalama; kullanıcı girdisi kabuğa (yt-dlp) ham verilmez.
- İçerik Türkçe, esnaf / argo tonunda; hakaret hedefi kişi değil durum.
- **Commit ve push'u kullanıcı atar** (`.claude/skills/no-auto-commit`): değişiklik çalışma alanında kalır, commit
  mesajı önerilir.
