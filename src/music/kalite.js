// Otomatik oynatmada "iyi şarkı" seçimi. YouTube'da ses bit hızı hemen her video için aynı (itag 251,
// ~130 kbps), bu yüzden bit hızı bir kalite ölçütü değil; onun yerine başlık ve kanal bilgisine bakılır.
// Ek yt-dlp çalıştırmaya gerek yok: Mix listesi bu bilgileri zaten veriyor. Listeleri aşağıdan düzenleyebilirsin.

// Başlığında bunlar geçen parçalar otomatik oynatmada atlanır (hız/ses efekti, uzun döngü, karaoke vb.).
const ELENECEK_BASLIK =
  /\b(slowed|reverb|sped[ -]?up|speed[ -]?up|nightcore|8d|bass[ -]?boost(ed)?|karaoke|cover|\d+\s*hours?|loop)\b/i;

// Çok kısa klipler şarkı sayılmaz.
const EN_KISA_SN = 60;

// Resmî kaynak işaretleri: "- Topic" (YouTube'un otomatik sanatçı kanalları), VEVO, "Official" kanallar ya da başlıklar.
const RESMI_KANAL = /(-\s*topic|vevo|official)$/i;
const RESMI_BASLIK = /\bofficial\b/i;

// Mix sırası YouTube'un benzerlik sıralaması; en uygun ilk birkaç adaya bakılır ki sıra çok bozulmasın.
const ONCELIK_PENCERESI = 8;

function elenmeli(parca) {
  if (Number.isFinite(parca.duration) && parca.duration < EN_KISA_SN) return true;
  return ELENECEK_BASLIK.test(parca.title ?? '');
}

function resmiMi(parca) {
  return RESMI_KANAL.test(parca.channel ?? '') || RESMI_BASLIK.test(parca.title ?? '');
}

// Elenmeyen adaylar arasından seçer: ilk birkaç adayda resmî kaynak varsa o, yoksa listedeki ilki.
function enIyiniSec(adaylar) {
  const uygunlar = adaylar.filter((parca) => !elenmeli(parca));
  const pencere = uygunlar.slice(0, ONCELIK_PENCERESI);
  return pencere.find(resmiMi) ?? uygunlar[0] ?? null;
}

module.exports = { elenmeli, resmiMi, enIyiniSec };
