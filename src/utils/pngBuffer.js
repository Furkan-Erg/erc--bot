// canvas.toBuffer('image/png') senkron çalışır ve ana thread'i bloke eder. Ses paketleri de aynı
// thread'de 20 ms'de bir üretildiği için büyük bir görselin kodlanması tüm sunuculardaki müziği
// cızırdatabilir. Callback'li sürüm kodlamayı libuv thread havuzuna taşır; çıktı birebir aynıdır.
function pngBuffer(canvas) {
  return new Promise((coz, reddet) => {
    canvas.toBuffer((err, buffer) => (err ? reddet(err) : coz(buffer)), 'image/png');
  });
}

module.exports = { pngBuffer };
