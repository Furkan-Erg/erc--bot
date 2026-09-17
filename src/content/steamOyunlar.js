// Steam oyun önerisinin saf verisi. Canlı havuz SteamSpy'dan geliyor (bkz.
// src/utils/steamStore.js); burada duran liste yalnızca SteamSpy'a ulaşılamadığında
// devreye giren yedek. Liste elle yazılmadı, SteamSpy'ın en çok değerlendirilen
// oyunlarından üretildi ki appid/ad eşleşmesi yanlış olmasın.
const YEDEK_HAVUZ = [
  { appid: 730, ad: "Counter-Strike: Global Offensive" },
  { appid: 271590, ad: "Grand Theft Auto V Legacy" },
  { appid: 578080, ad: "PUBG: BATTLEGROUNDS" },
  { appid: 105600, ad: "Terraria" },
  { appid: 359550, ad: "Tom Clancy's Rainbow Six Siege" },
  { appid: 4000, ad: "Garry's Mod" },
  { appid: 2358720, ad: "Black Myth: Wukong" },
  { appid: 252490, ad: "Rust" },
  { appid: 440, ad: "Team Fortress 2" },
  { appid: 1245620, ad: "ELDEN RING" },
  { appid: 550, ad: "Left 4 Dead 2" },
  { appid: 413150, ad: "Stardew Valley" },
  { appid: 227300, ad: "Euro Truck Simulator 2" },
  { appid: 292030, ad: "The Witcher 3: Wild Hunt - Complete Edition" },
  { appid: 553850, ad: "HELLDIVERS 2" },
  { appid: 1086940, ad: "Baldur's Gate 3" },
  { appid: 739630, ad: "Phasmophobia" },
  { appid: 1091500, ad: "Cyberpunk 2077" },
  { appid: 1174180, ad: "Red Dead Redemption 2" },
  { appid: 1172470, ad: "Apex Legends" },
  { appid: 945360, ad: "Among Us" },
  { appid: 381210, ad: "Dead by Daylight" },
  { appid: 346110, ad: "ARK: Survival Evolved" },
  { appid: 242760, ad: "The Forest" },
  { appid: 218620, ad: "PAYDAY 2" },
  { appid: 230410, ad: "Warframe" },
  { appid: 252950, ad: "Rocket League" },
  { appid: 304930, ad: "Unturned" },
  { appid: 1085660, ad: "Destiny 2" },
  { appid: 236390, ad: "War Thunder" },
  { appid: 322330, ad: "Don't Starve Together" },
  { appid: 1966720, ad: "Lethal Company" },
  { appid: 892970, ad: "Valheim" },
  { appid: 239140, ad: "Dying Light" },
  { appid: 582010, ad: "Monster Hunter: World" },
  { appid: 620, ad: "Portal 2" },
  { appid: 1938090, ad: "Call of Duty: Modern Warfare II" },
  { appid: 367520, ad: "Hollow Knight" },
  { appid: 322170, ad: "Geometry Dash" },
  { appid: 374320, ad: "DARK SOULS III" },
  { appid: 1097150, ad: "Fall Guys: Ultimate Knockout" },
  { appid: 1623730, ad: "Palworld" },
  { appid: 108600, ad: "Project Zomboid" },
  { appid: 960090, ad: "Bloons TD 6" },
  { appid: 250900, ad: "The Binding of Isaac: Rebirth" },
  { appid: 548430, ad: "Deep Rock Galactic" },
  { appid: 221100, ad: "DayZ" },
  { appid: 251570, ad: "7 Days to Die" },
  { appid: 377160, ad: "Fallout 4" },
  { appid: 648800, ad: "Raft" },
  { appid: 1172620, ad: "Sea of Thieves: 2026 Edition" },
  { appid: 291550, ad: "Brawlhalla" },
  { appid: 284160, ad: "BeamNG.drive" },
  { appid: 489830, ad: "The Elder Scrolls V: Skyrim Special Edition" },
  { appid: 814380, ad: "Sekiro: Shadows Die Twice - GOTY Edition" },
  { appid: 394360, ad: "Hearts of Iron IV" },
  { appid: 264710, ad: "Subnautica" },
  { appid: 289070, ad: "Sid Meier’s Civilization VI" },
  { appid: 72850, ad: "The Elder Scrolls V: Skyrim" },
  { appid: 444090, ad: "Paladins" },
  { appid: 275850, ad: "No Man's Sky" },
  { appid: 632360, ad: "Risk of Rain 2" },
  { appid: 990080, ad: "Hogwarts Legacy" },
  { appid: 1118200, ad: "People Playground" },
  { appid: 1145360, ad: "Hades" },
  { appid: 49520, ad: "Borderlands 2" },
  { appid: 391540, ad: "Undertale" },
  { appid: 1293830, ad: "Forza Horizon 4" },
  { appid: 255710, ad: "Cities: Skylines" },
];

// Üçüncü parti havuzdaki alanlar (fiyat sent cinsinden metin) ile Steam'in canlı
// detayını aynı filtreden geçirebilmek için her filtrenin iki kontrolü var: havuzu
// önceden elemek için "havuzdaUyar", seçilen oyunu doğrulamak için "detaydaUyar".
// SteamSpy fiyatları bir gün geriden gelebildiği için ikinci kontrol şart.
const UCUZ_SINIRI_SENT = 1000;

const FILTRELER = {
  indirimde: {
    ad: 'indirimde',
    emoji: '🏷️',
    takmaAdlar: ['indirim', 'indirimde', 'indirimli', 'ucuzlayan', 'sale', 'discount'],
    havuzdaUyar: (o) => Number(o.discount) > 0,
    detaydaUyar: (d) => (d.price_overview?.discount_percent || 0) > 0,
  },
  ucretsiz: {
    ad: 'ücretsiz',
    emoji: '🆓',
    takmaAdlar: ['ucretsiz', 'ücretsiz', 'bedava', 'free', 'f2p', 'beleş', 'beles'],
    havuzdaUyar: (o) => Number(o.price) === 0,
    detaydaUyar: (d) => Boolean(d.is_free) || (d.price_overview?.final ?? 0) === 0,
  },
  ucuz: {
    ad: 'ucuz',
    emoji: '💸',
    takmaAdlar: ['ucuz', 'uygun', 'cheap'],
    havuzdaUyar: (o) => Number(o.price) > 0 && Number(o.price) <= UCUZ_SINIRI_SENT,
    detaydaUyar: (d) => {
      const kurus = d.price_overview?.final;
      return typeof kurus === 'number' && kurus > 0 && kurus <= UCUZ_SINIRI_SENT;
    },
  },
};

function filtreCoz(girdi) {
  const aranan = String(girdi || '')
    .toLocaleLowerCase('tr-TR')
    .trim();
  if (!aranan) return null;
  const bulunan = Object.values(FILTRELER).find((f) => f.takmaAdlar.includes(aranan));
  return bulunan || null;
}

const FILTRE_ADLARI = Object.values(FILTRELER).map((f) => f.ad);

module.exports = { YEDEK_HAVUZ, FILTRELER, FILTRE_ADLARI, filtreCoz };
