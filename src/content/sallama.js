const TEMPLATES = [
  'Kesinlikle {yil} yılında, {kisi} tarafından bulunmuştur.',
  'Araştırmalara göre bunun yüzde {sayi}\'i doğrudur, {kaynak}.',
  'Aslında bu iş {kisi} zamanında başlamış, sonra unutulmuş gitmiş.',
  '{kaynak}, yani tartışmaya bile gerek yok.',
  'Bal gibi de biliyorum: cevap kesinlikle "{rastgele}".',
  'Bunu bir belgeselde izlemiştim, {yil} gibiydi galiba.',
  'Büyük ihtimalle {kisi} yüzünden, ama kesin konuşmayayım.',
  'Yüzde {sayi} eminim, {kaynak}.',
  'Aslında herkes bilir: sebebi {rastgele}.',
  '{yil}\'de bir gazetede okumuştum, {kisi} açıklamıştı.',
];

const FILLERS = {
  yil: ['1453', '1923', '1999', '2003', '2011', '1071', '1876'],
  kisi: [
    'bir doçent',
    'amcamın arkadaşı',
    'Kanuni\'nin veziri',
    'köşedeki bakkal',
    'bir profesör',
    'komşunun oğlu',
    'eski bir muhtar',
    'bir YouTuber',
  ],
  sayi: ['73', '82', '91', '64', '99', '57'],
  kaynak: [
    'Wikipedia\'da öyle yazıyor',
    'bilim insanları kanıtladı',
    'duyduğuma göre öyle',
    'bir podcast\'te geçti',
    'ekşi sözlükte entry\'si var',
    'dayım öyle söyledi',
  ],
  rastgele: ['nem oranı', 'merkürün gerilemesi', 'Kanuni', 'enflasyon', 'elektrik faturası', '42', 'burçlar'],
};

module.exports = { TEMPLATES, FILLERS };
