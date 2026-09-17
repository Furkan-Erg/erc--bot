// CS2 harita havuzu. Görseller ilk kullanımda indirilip data/cs2-maps altında
// küçültülmüş olarak saklanıyor, sonraki çağrılar internete çıkmıyor.
const GORSEL_KOKU = 'https://raw.githubusercontent.com/realc0mpl3x/csgo_images/master';

const HARITALAR = [
  { key: 'de_ancient', ad: 'Ancient', havuz: 'aktif' },
  { key: 'de_anubis', ad: 'Anubis', havuz: 'aktif' },
  { key: 'de_dust2', ad: 'Dust II', havuz: 'aktif' },
  { key: 'de_inferno', ad: 'Inferno', havuz: 'aktif' },
  { key: 'de_mirage', ad: 'Mirage', havuz: 'aktif' },
  { key: 'de_nuke', ad: 'Nuke', havuz: 'aktif' },
  { key: 'de_overpass', ad: 'Overpass', havuz: 'aktif' },
  { key: 'de_train', ad: 'Train', havuz: 'aktif' },
  { key: 'de_vertigo', ad: 'Vertigo', havuz: 'rezerv' },
  { key: 'de_cache', ad: 'Cache', havuz: 'rezerv' },
  { key: 'de_cbble', ad: 'Cobblestone', havuz: 'rezerv' },
  { key: 'de_canals', ad: 'Canals', havuz: 'rezerv' },
  { key: 'cs_italy', ad: 'Italy', havuz: 'rezerv' },
  { key: 'cs_office', ad: 'Office', havuz: 'rezerv' },
  { key: 'cs_agency', ad: 'Agency', havuz: 'rezerv' },
];

const CS2_HARITALARI = HARITALAR.map((harita) => ({ ...harita, gorsel: `${GORSEL_KOKU}/${harita.key}.jpg` }));

const AKTIF_HAVUZ = CS2_HARITALARI.filter((h) => h.havuz === 'aktif').map((h) => h.key);

function haritaBul(key) {
  return CS2_HARITALARI.find((h) => h.key === key) || null;
}

module.exports = { CS2_HARITALARI, AKTIF_HAVUZ, haritaBul };
