---
name: no-auto-commit
description: Bu projede commit ve push'u kullanıcı kendi eliyle yapar, commit mesajlarını kendisi yazar. Kod değişikliği bitirdiğinde, "kaydet/bitir/tamamla" dendiğinde, git durumuna baktığında ya da aklından `git add`, `git commit`, `git push` geçtiğinde mutlaka bu skill'i kullan. Kullanıcı o an açıkça "commit at" demediği sürece hiçbir şeyi commit'leme.
---

# Commit'i kullanıcı atar

Bu projede git geçmişi kullanıcının kendi ürünü. Commit mesajlarını kendi diliyle,
kendi grupladığı değişikliklerle yazmak istiyor. Ben araya girip commit atarsam
geçmişi benim böldüğüm gibi bölmüş oluyorum ve kullanıcı bunu geri almak için
`git reset` ile uğraşmak zorunda kalıyor. Bu yüzden varsayılan davranış nettir:
**kod yaz, commit'e dokunma.**

## Yapılmayacaklar

Kullanıcı o an açıkça istemediği sürece şu komutlar çalıştırılmaz:

- `git add`, `git stage`
- `git commit` (`--amend` dahil)
- `git push`
- `git reset`, `git checkout -- <dosya>`, `git stash` gibi çalışma alanını
  değiştiren komutlar — bunlar kullanıcının kaydetmediği emeğini silebilir.

"İş bitti, düzgün bir yere koyayım" hissi bir yetki değildir. Görev tanımında
commit geçmiyorsa commit yok.

## Bunun yerine

Değişiklikleri çalışma alanında bırak ve kullanıcıya şunları ver:

1. **Hangi dosyaları değiştirdiğim**, kısa bir liste ve her birinin ne işe yaradığı.
2. **Önerilen commit mesajı**, kopyalayıp kullanabileceği şekilde. Öneri, dayatma
   değil; kullanıcı kendi cümlesiyle yazmayı tercih edebilir.
3. Değişiklik birden fazla mantıksal parçaya ayrılıyorsa, **nerelerden bölünebileceği**.
   Kullanıcı ayrı commit'ler atmak isteyebilir.

`git status` ve `git diff` gibi okuma amaçlı komutlar serbest; sorun yazan komutlarda.

## İstisna

Kullanıcı "commit at", "push et" derse elbette yapılır. Ama bu izin **o seferliktir**.
Aynı oturumda sonradan yapılan değişiklikler için varsayılan yine commit atmamaktır;
her yeni değişiklik için izin tekrar gelmelidir.

## Yanlışlıkla commit atıldıysa

Hemen söyle, sakla değil. Push edilmediyse geri almak kolay ve değişiklikler kaybolmaz:

```bash
git reset --soft HEAD~1    # son commit'i çöz, değişiklikler staged kalır
git reset                  # istersen staged durumdan da çıkar
```

Kaç commit atıldıysa `HEAD~1` yerine o sayıyı yaz. Kullanıcıya hangi commit'lerin
geri alınacağını (hash ve mesajlarıyla) söyleyip onayını al, sonra çalıştır.
