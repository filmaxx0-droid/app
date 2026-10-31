# SahaCep — Saha Servis Ekipleri İçin Cep Uygulaması

Kombi, klima, beyaz eşya servisi, tesisatçı, elektrikçi ve temizlik firmaları gibi küçük saha işletmelerinin işlerini telefondan yönetmesini sağlayan, aylık abonelikle para kazandıran bir web uygulaması (telefonda uygulama gibi çalışır).
İşletme sahibi iş atar, usta sahada fotoğraf çekip işi kapatır, müşteriye dijital servis formu linki gider; para tahsilatı da takip edilir.

## Kimler için
- **İşletme sahibi / yönetici:** 1–15 kişilik servis firması işleten, işleri bugün WhatsApp, defter ve Excel ile takip eden kişi. Uygulamaya para ödeyen müşteri budur.
- **Saha personeli (usta/teknisyen):** Telefondan kendisine atanan işleri görür, işi yapar, fotoğraf ve not ekleyip kapatır.
- **Son müşteri:** Uygulamaya giriş yapmaz; sadece kendisine gönderilen servis formu linkini açar.

## Para kazanma modeli
- **Ücretsiz plan:** 1 kullanıcı, ayda 15 iş.
- **Pro plan:** Aylık ₺399 — sınırsız iş, 10 personele kadar, firma logolu servis formu.
- Ödeme kartla, aylık abonelik olarak alınır. Limit dolunca uygulama Pro'ya geçişi önerir.

## Temel özellikler ve deneyim
- **Firma kaydı:** İşletme sahibi kayıt olur, firma adı, telefon ve logo girer.
- **Personel davet:** Sahip, ustaları e-posta ile ekler; ustalar sadece kendilerine atanan işleri görür.
- **Müşteri rehberi:** Ad, telefon, adres; müşterinin geçmiş işleri tek ekranda.
- **İş kaydı:** Müşteri, adres, iş türü, tarih/saat, atanan usta, ücret. Durumlar: Bekliyor → Yolda → Yapılıyor → Tamamlandı / İptal.
- **Sahada işi kapatma:** Usta telefondan önce/sonra fotoğrafı çeker, yapılan işi ve kullanılan malzemeyi yazar, işi tamamlar.
- **Dijital servis formu:** Tamamlanan iş için firma logolu, fotoğraflı bir sayfa linki oluşur; tek dokunuşla WhatsApp'tan müşteriye gönderilir.
- **Tahsilat takibi:** Her işte "Ödendi / Ödenmedi" ve ödeme şekli (nakit, kart, havale). Bekleyen alacaklar listesi.
- **Günlük panel:** Bugünün işleri, bu ayın cirosu, bekleyen tahsilat, tamamlanan iş sayısı.
- **Abonelik sayfası:** Mevcut plan, kalan iş hakkı, Pro'ya yükseltme.

## Kullanıcı akışı
1. İşletme sahibi açılış sayfasını görür → ücretsiz kayıt olur (e-posta/şifre veya Google).
2. Firma bilgilerini girer → ilk müşterisini ve ilk işini ekler, bir ustaya atar.
3. Usta kendi hesabıyla girer → "Bugünkü İşlerim" listesini görür → adrese gider, durumu günceller.
4. İş bitince fotoğraf + not ekler, ödeme durumunu işaretler, işi tamamlar.
5. Servis formu linki WhatsApp ile müşteriye gönderilir.
6. Sahip panelde ciroyu ve alacakları görür; ücretsiz limit dolunca Pro'ya geçer.

## Arayüz hissi
- Telefonda tek elle kullanıma göre tasarlanmış: büyük butonlar, alt menü, az yazı.
- Sahada güneş altında okunabilir, yüksek kontrastlı, sade ve güven veren profesyonel görünüm.
- Masaüstünde yönetici için daha geniş, tablo görünümlü panel.
- Tamamen Türkçe arayüz, ₺ para birimi, Türkiye tarih/saat biçimi.

## Uygulama aşamaları
**Aşama 1 — MVP (şimdi yapılacak)**
- Açılış/tanıtım sayfası, kayıt ve giriş
- Firma profili, personel ekleme, sahip/usta rolleri
- Müşteri rehberi, iş oluşturma/atama, durum takibi
- Fotoğraf yükleme, not, tamamlama
- Paylaşılabilir servis formu linki + WhatsApp ile gönder
- Tahsilat takibi ve günlük panel
- Ücretsiz/Pro plan, kartla aylık abonelik (test modunda)

**Aşama 2**
- Takvim görünümü ve tekrarlayan bakım işleri (ör. yıllık kombi bakımı hatırlatması)
- Müşteriye otomatik SMS/WhatsApp hatırlatma
- Müşteri imzası, PDF servis formu / teklif çıktısı
- Ustanın konumunu işe kaydetme

**Aşama 3**
- Stok/malzeme takibi, fiyat listesi ve teklif hazırlama
- Raporlar (usta performansı, aylık ciro grafikleri)
- Müşterilerin kendi kendine servis talebi açabileceği firma sayfası
- Telefon mağazalarına yüklenebilir uygulama sürümü

## Varsayımlar
- Kullanıcı "her şeyi sen seç" dediği için GitHub'daki "Saha Cep" projesi bulunamadı ve incelenmedi; fikir bağımsız olarak saha servis işletmeleri için yeniden tasarlandı.
- Ürün adı "SahaCep" olarak kullanıldı; sonra değiştirilebilir.
- Giriş: e-posta/şifre ve Google ile giriş birlikte sunulur.
- Ödeme Stripe ile alınır ve ilk aşamada **test modunda** çalışır (gerçek para çekilmez). Stripe şu an Türkiye'de doğrudan hesap açmayı desteklemiyor; gerçek tahsilata geçmek için ya Stripe'ın desteklediği bir ülkede şirket/hesap gerekir ya da sonraki aşamada iyzico/PayTR gibi Türk ödeme sağlayıcısına geçilir.
- Fiyatlar (Ücretsiz: 15 iş/ay, Pro: ₺399/ay) tahmini başlangıç değerleridir, sonradan değiştirilebilir.
- Fotoğraflar güvenli bulut depolamada tutulur; sadece firmanın kendi kullanıcıları ve servis formu linkine sahip müşteri görebilir.
- Her firmanın verisi birbirinden tamamen ayrıdır.
- WhatsApp gönderimi, telefonun kendi WhatsApp'ını hazır mesajla açarak yapılır (otomatik mesaj servisi yoktur).
- Uygulama web tabanlıdır; telefonda tarayıcıdan açılır ve ana ekrana eklenebilir.
