// !kelime (Türkçe Wordle) için tam 5 harfli kelimeler
const BES_HARFLI = [
  'kalem', 'kitap', 'deniz', 'şeker', 'bahçe', 'çiçek', 'kağıt', 'masal', 'sabah', 'akşam',
  'tavuk', 'balık', 'çorba', 'ekmek', 'biber', 'tabak', 'çatal', 'kaşık', 'duvar', 'yatak',
  'dolap', 'lamba', 'perde', 'araba', 'yolcu', 'şoför', 'bilet', 'durak', 'sokak', 'cadde',
  'şehir', 'orman', 'nehir', 'bulut', 'güneş', 'çimen', 'tohum', 'meyve', 'sebze', 'armut',
  'kiraz', 'kavun', 'incir', 'ceviz', 'badem', 'limon', 'çilek', 'vişne', 'ekran', 'müzik',
  'şarkı', 'türkü', 'gitar', 'davul', 'keman', 'sahne', 'roman', 'yazar', 'cümle', 'dilek',
  'hayal', 'mutlu', 'hüzün', 'sevgi', 'komşu', 'çocuk', 'bebek', 'teyze', 'gelin', 'damat',
  'düğün', 'tatil', 'davet', 'sofra', 'yemek', 'tarif', 'tatlı', 'acılı', 'sıcak', 'soğuk',
  'duman', 'kömür', 'tuğla', 'beton', 'demir', 'çelik', 'altın', 'gümüş', 'bakır', 'kuruş',
  'hesap', 'banka', 'kredi', 'pazar', 'satış', 'vergi', 'memur', 'dişçi', 'kulak', 'bacak',
  'boyun', 'sakal', 'bıyık', 'gülüş', 'bahar', 'güzel', 'büyük', 'küçük', 'geniş', 'hafif',
  'hızlı', 'yavaş', 'kolay', 'doğru', 'temiz', 'kirli', 'yaşlı', 'fakir', 'aptal', 'cesur',
  'beyaz', 'siyah', 'yeşil', 'pembe', 'kahve',
];

// !adamasmaca için daha uzun kelimeler
const UZUN_KELIMELER = [
  'bilgisayar', 'kütüphane', 'öğretmen', 'telefon', 'pencere', 'arkadaş', 'karpuz', 'misafir',
  'dondurma', 'kahvaltı', 'tencere', 'bardak', 'otobüs', 'yağmur', 'çiçekçi', 'balkon',
  'merdiven', 'asansör', 'gözlük', 'portakal', 'mandalina', 'çekirdek', 'defter', 'kalemlik',
  'bakkal', 'simitçi', 'pastane', 'lokanta', 'manavlık', 'terlik', 'battaniye', 'yastık',
  'anahtar', 'kapıcı', 'apartman', 'mahalle', 'vapur', 'tramvay', 'köprü', 'sahil',
  'zeytinyağı', 'menemen', 'kumpir', 'lahmacun', 'künefe', 'baklava', 'dolmuş', 'kahveci',
];

module.exports = { BES_HARFLI, UZUN_KELIMELER };
