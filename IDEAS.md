# Ominaisuusideat: Claude + ChatGPT + Grok -yhteissovellus

> **Ohje Claudelle (lue ensin):**
> Tämä tiedosto on ideapankki sovellukseen, jossa Claude (Anthropic), ChatGPT (OpenAI) ja Grok (xAI) toimivat samassa sovelluksessa ja tekevät yhteistyötä.
> 1. Tutustu ensin olemassa olevaan koodiin: rakenne, käytetyt kirjastot, miten mallien API-kutsut on tehty ja mitä alla olevista ominaisuuksista on jo toteutettu.
> 2. Kerro käyttäjälle lyhyesti, mitkä ideat ovat jo valmiina, mitkä osittain ja mitkä puuttuvat.
> 3. Ehdota toteutusjärjestys (aloita ⭐-merkityistä) ja toteuta ominaisuudet **yksi kerrallaan**. Varmista jokaisen jälkeen, että sovellus toimii, ennen kuin siirryt seuraavaan.
> 4. Noudata projektin olemassa olevia käytäntöjä (kieli, kehys, tiedostorakenne, tyyli). Älä vaihda teknologioita kysymättä.
> 5. API-avaimet pidetään aina ympäristömuuttujissa (`.env`), ei koskaan koodissa eikä gitissä.

⭐ = suositeltu toteutettavaksi ensimmäisenä

---

## 1. Yhteistyötilat: miten mallit toimivat yhdessä

Tavoite: jokaisen tilan voi valita käyttöliittymästä (esim. pudotusvalikko tai välilehdet).

### ⭐ 1.1 Ristiintarkistus
- Yksi malli (valittavissa) vastaa kysymykseen.
- Kaksi muuta mallia saavat vastauksen ja etsivät siitä virheitä, puutteita ja epätarkkuuksia.
- Lopuksi näytetään yhteenveto:
  - ✅ asiat, joista kaikki ovat samaa mieltä
  - ⚠️ asiat, joista ollaan eri mieltä (ja kuka sanoi mitä)
  - ❌ löydetyt virheet
- **Valmis kun:** käyttäjä näkee alkuperäisen vastauksen, molempien tarkistajien kommentit ja selkeän yhteenvedon.

### ⭐ 1.2 Väittely
- Kaksi mallia argumentoi aiheen eri puolia (puolesta / vastaan) N kierroksen ajan (oletus 2–3, säädettävissä).
- Kolmas malli toimii tuomarina: tiivistää argumentit ja antaa perustellun ratkaisun.
- Käyttäjä voi valita, mikä malli on missäkin roolissa.
- **Valmis kun:** väittely näkyy keskusteluna, jossa jokainen puheenvuoro on merkitty mallin nimellä, ja tuomarin päätös näkyy lopussa korostettuna.

### 1.3 Roolipohjainen työnjako
- Jokaisella mallilla on oletusrooli, esimerkiksi:
  - **Claude:** kirjoittaminen, analyysi, koodi, pitkät dokumentit
  - **ChatGPT:** ideointi, kuvien luonti, yleistehtävät
  - **Grok:** tuoreet uutiset, ajankohtaiset X/Twitter-keskustelut
- Sovellus pilkkoo monivaiheisen pyynnön osatehtäviksi ja jakaa ne roolien mukaan, ja lopuksi tulokset yhdistetään.
- Roolit muokattavissa asetuksista.

### 1.4 Äänestys
- Kaikki kolme vastaavat samaan kysymykseen.
- Jokainen malli äänestää parasta vastausta muiden vastauksista (ei omaansa) ja perustelee lyhyesti.
- Voittaja näytetään ensimmäisenä, muut alla.

### 1.5 Ketju / liukuhihna
- Malli A tekee luonnoksen → malli B parantaa → malli C viimeistelee.
- Järjestys valittavissa.
- Jokainen välivaihe näkyy (avattavina osioina), jotta muutokset voi seurata.

### 1.6 Konsensusmittari
- Kun kaikki mallit ovat vastanneet, lasketaan yksimielisyysaste (esim. pyytämällä yhtä mallia arvioimaan vastausten yhtäpitävyys asteikolla 0–100 %).
- Näytetään visuaalisena palkkina vastausten yläpuolella. Korkea yksimielisyys = luotettavampi vastaus.

### 1.7 Synteesi
- Kaikki vastaavat, minkä jälkeen yksi malli yhdistää parhaat palat yhdeksi lopulliseksi vastaukseksi ja merkitsee, mistä mallista mikin osa on peräisin.

---

## 2. Älykkyys ja muisti

### ⭐ 2.1 Automaattinen reititin
- Sovellus analysoi kysymyksen ja valitsee siihen sopivimman mallin, jolloin kaikkia kolmea ei tarvitse kutsua joka kerta. Tämä säästää kustannuksia.
- Aluksi yksinkertainen sääntöpohjainen tai halvalla mallilla tehty luokittelu (esim. "koodi" → Claude, "uutiset" → Grok, "kuva" → ChatGPT).
- Myöhemmin reititin voi oppia käyttäjän palautteesta (ks. 3.3).
- Käyttäjä näkee, miksi kyseinen malli valittiin, ja voi ohittaa valinnan.

### 2.2 Yhteinen muisti
- Kaikki mallit näkevät saman keskusteluhistorian ja projektin taustatiedot.
- Pitkissä keskusteluissa vanha historia tiivistetään automaattisesti, jotta kontekstiraja ei ylity.

### 2.3 Projektit / työtilat
- Käyttäjä voi luoda projekteja, joilla on omat:
  - ohjeet (esim. "vastaa aina suomeksi", "olet markkinointiasiantuntija")
  - tiedostot
  - keskusteluhistoria

### 2.4 Tiedostojen lataus
- Tuki ainakin PDF:lle, kuville ja Excel/CSV-tiedostoille.
- Ladattu tiedosto välitetään kaikille valituille malleille (huomioi, että mallien API:t tukevat eri tiedostotyyppejä eri tavoin; muunna tarvittaessa tekstiksi).

---

## 3. Kustannukset ja seuranta

### ⭐ 3.1 Kustannuslaskuri
- Jokaisen vastauksen alla: käytetyt tokenit (syöte / tuloste) ja arvioitu hinta.
- Kojelauta: kulut per päivä / kuukausi / malli.
- Kuukausibudjetti, josta varoitus esim. 80 %:n kohdalla, ja mahdollisuus pysäyttää kutsut budjetin täyttyessä.
- Hinnat yhdessä konfiguraatiotiedostossa, jotta niitä on helppo päivittää.

### 3.2 Nopeus- ja laatutilastot
- Seuraa: vastausaika, voittoprosentti (äänestyksistä ja käyttäjän palautteesta) ja mitkä aiheet sujuvat millekin mallille parhaiten.
- Näytä tilastosivulla kaavioina.

### 3.3 Palaute (peukku ylös/alas)
- Jokaiseen vastaukseen 👍 / 👎.
- Palaute tallennetaan ja sitä käytetään reitittimen (2.1) ja tilastojen (3.2) parantamiseen.

---

## 4. Käyttöliittymä

### ⭐ 4.1 Vierekkäinen näkymä
- Vastaukset rinnakkain sarakkeissa (mobiilissa välilehtinä tai pinottuna).
- Vastaukset näkyvät striimattuina, eli teksti ilmestyy sitä mukaa kuin se valmistuu.
- Kohdat, joissa mallit ovat eri mieltä, korostetaan.
- Jokaisella mallilla oma tunnusväri ja -kuvake.

### 4.2 Haarauta keskustelu
- "Jatka tästä" -painike minkä tahansa mallin vastauksen kohdalla → uusi keskusteluhaara, joka jatkuu siitä vastauksesta.

### 4.3 Äänitila
- Puheentunnistus kysymyksille.
- Mallien vastaukset luetaan ääneen, jokainen malli omalla äänellään.

### 4.4 Mobiili / PWA
- Sovellus asennettavissa puhelimen kotinäytölle (Progressive Web App).
- Responsiivinen ulkoasu.

---

## 5. Bisneskäyttö

### 5.1 Valmiit työnkulut (templatet)
Valmiita "yhden napin" työnkulkuja, joissa malleilla on valmiiksi mietityt roolit. Esimerkkejä:
- **Analysoi liiketoimintaidea:** yksi malli tekee SWOT-analyysin, toinen etsii kilpailijat ja markkinatilanteen (Grok: ajankohtainen tieto), kolmas toimii kriittisenä sijoittajana.
- **Kirjoita markkinointiteksti:** luonnos → parannus → lopullinen versio + vaihtoehtoiset otsikot.
- **Tarkista sopimus:** riskit, epäselvät kohdat ja yhteenveto selkokielellä.
- **Kirjoita sähköposti / LinkedIn-julkaisu**
- Käyttäjä voi tallentaa omia työnkulkujaan.

### 5.2 Tiimitilit
- Useampi käyttäjä samassa organisaatiossa.
- Jaetut projektit ja työnkulut.
- Käyttöoikeustasot (omistaja / jäsen / katselija).

### 5.3 Ansaintamalli (vaihtoehtoja)
- **Freemium:** ilmaisversiossa yksi malli ja rajattu määrä viestejä; maksullisessa kaikki kolme mallia ja yhteistyötilat.
- **Tuo omat avaimesi (BYOK):** käyttäjä syöttää omat API-avaimensa, ja sovellus on halvempi tai ilmainen.
- **Tiimihinnoittelu:** hinta per käyttäjä per kuukausi.

### 5.4 Raporttien vienti
- Keskustelun tai työnkulun tulos ladattavissa PDF-, Word- tai Markdown-tiedostona.
- Automaattinen tiivistelmä raportin alkuun.

---

## Ehdotettu toteutusjärjestys

1. **4.1 Vierekkäinen näkymä** (pohja kaikelle muulle, jos ei vielä ole)
2. **3.1 Kustannuslaskuri** (näkyvyys kuluihin heti alusta)
3. **1.1 Ristiintarkistus**
4. **2.1 Automaattinen reititin**
5. **1.2 Väittely**
6. **3.3 Palaute** → **3.2 Tilastot**
7. Loput yhteistyötilat (1.3–1.7)
8. Muisti ja projektit (2.2–2.4)
9. Bisnesominaisuudet (5.x) ja loput käyttöliittymäparannukset (4.2–4.4)

## Tekniset huomiot

- Tee jokaiselle mallille yhteinen rajapinta (esim. `sendMessage(model, messages, options)` → `{ text, inputTokens, outputTokens, latency }`), jolloin yhteistyötilat on helppo rakentaa sen päälle eikä niiden tarvitse tietää, mitä API:a kulloinkin käytetään.
- Kutsu malleja rinnakkain aina kun mahdollista (esim. `Promise.all` / `asyncio.gather`).
- Käsittele virheet malleittain: jos yksi malli ei vastaa (aikakatkaisu, rajoitukset, virhe), muut tulokset näytetään silti ja virhe kerrotaan käyttäjälle selkeästi.
- Käytä kunkin palveluntarjoajan uusimpia ja parhaita malleja; pidä mallien nimet yhdessä konfiguraatiotiedostossa, jotta ne on helppo vaihtaa.
- API-avaimet: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `XAI_API_KEY` ympäristömuuttujissa. Lisää `.env` tiedostoon `.gitignore`.
