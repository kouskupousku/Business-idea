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

## Valmiita avoimen lähdekoodin projekteja: esikuvat ja lainattavat osat

> **Ohje Claudelle:** käytä näitä ensisijaisesti **mallina ja inspiraationa**. Ennen kuin kopioit koodia suoraan, tarkista projektin lisenssi:
> - **MIT / Apache-2.0:** kopiointi sallittu, kunhan alkuperäinen lisenssi- ja tekijänoikeusmerkintä säilytetään.
> - **GPL:** koko sovelluksen pitäisi silloin olla GPL. Älä kopioi koodia, ota vain ideoita.
> - **Oma lisenssi / ei lisenssiä:** älä kopioi koodia, ota vain ideoita.
>
> Tarkista myös, onko projekti yhä ylläpidetty. Älä ota mallia projekteista, jotka käyttävät selaimen kirjautumisia API-avainten sijaan, koska se voi rikkoa palveluntarjoajien käyttöehtoja.

### Yhteistyötilat (osio 1)
| Projekti | Mitä siitä kannattaa ottaa | Liittyy ideaan |
|---|---|---|
| [karpathy/llm-council](https://github.com/karpathy/llm-council) | Kolmivaiheinen "neuvosto": 1) kaikki mallit vastaavat, 2) mallit arvioivat ja järjestävät toistensa **anonymisoidut** vastaukset, 3) puheenjohtajamalli kokoaa lopullisen vastauksen. Pieni ja helppolukuinen. Esimerkkineuvostossa on mukana myös Claude, GPT ja Grok (OpenRouterin kautta). Tekijä ei ylläpidä projektia. | 1.4 Äänestys, 1.7 Synteesi, 1.1 Ristiintarkistus |
| [togethercomputer/MoA](https://github.com/togethercomputer/MoA) (Mixture-of-Agents) | Kerroksellinen malli: "ehdottajat" vastaavat, ja "kokoaja" yhdistää vastaukset. Kerroksia voi olla useita. Repossa on noin 50 rivin `moa.py`-esimerkki ja `advanced-moa.py`. Taustalla on tieteellinen artikkeli ([arXiv 2406.04692](https://arxiv.org/abs/2406.04692)). Alkuperäinen käyttää Togetherin API:a, joten kutsut pitää vaihtaa omiin malleihin. | 1.7 Synteesi, 1.5 Ketju |
| [abirharrasse/D3-Judge](https://github.com/abirharrasse/D3-Judge) | Rakenteellinen väittely: puolestapuhujat, tuomari ja valinnainen "valamiehistö". Hyvä malli väittelykierrosten ja tuomarin kehotteiden rakentamiseen. | 1.2 Väittely |
| [jonas-becker/problem-drift](https://github.com/jonas-becker/problem-drift) | Tutkimus siitä, miten pitkät väittelyt ajautuvat pois alkuperäisestä aiheesta. Opetus: rajoita kierrosten määrää ja muistuta malleja alkuperäisestä kysymyksestä joka kierroksella. | 1.2 Väittely |
| [ramtinz/multi-agent-debate-protocols](https://github.com/ramtinz/multi-agent-debate-protocols) | Vertailee eri väittely- ja äänestysprotokollia, myös tuomarimallin käyttöä. Hyödyllinen, kun valitaan miten äänet lasketaan. | 1.2 Väittely, 1.4 Äänestys |

### Mallien yhdistäminen yhteen rajapintaan (Tekniset huomiot)
| Projekti | Mitä siitä kannattaa ottaa | Kieli |
|---|---|---|
| [Vercel AI SDK](https://ai-sdk.dev) ([vercel/ai](https://github.com/vercel/ai)) | Yhteiset `generateText` / `streamText` -funktiot kaikille malleille. Omat paketit `@ai-sdk/anthropic`, `@ai-sdk/openai` ja `@ai-sdk/xai`. Mallin vaihto onnistuu yhtä riviä muuttamalla, ja striimaus on valmiina. **Paras vaihtoehto, jos projekti on JavaScript/TypeScript (esim. Next.js).** | TypeScript |
| [BerriAI/litellm](https://github.com/BerriAI/litellm) | Yksi OpenAI-tyylinen rajapinta yli 100 palveluntarjoajalle, myös xAI:lle. **Valmis kustannusseuranta ja budjettirajat** käyttäjä-/tiimi-/avainkohtaisesti. **Paras vaihtoehto, jos projekti on Python.** | Python |
| [OpenRouter](https://openrouter.ai) | Palvelu (ei avointa koodia), jolla kaikkiin malleihin pääsee yhdellä API-avaimella. llm-council käyttää tätä. Helppo aloittaa, mutta välikäsi ottaa pienen lisämaksun. | Mikä tahansa |

### Automaattinen reititin (2.1)
| Projekti | Mitä siitä kannattaa ottaa |
|---|---|
| [lm-sys/RouteLLM](https://github.com/lm-sys/RouteLLM) (Apache-2.0) | Reititin, joka ohjaa helpot kysymykset halvemmalle ja vaikeat tehokkaammalle mallille. Kynnysarvolla säädetään hinnan ja laadun tasapainoa. Tekijät raportoivat jopa 35–85 % säästöjä. Alkuperäinen on tehty kahdelle mallille (vahva/heikko), joten kolmelle mallille idea pitää soveltaa. Hyvä esikuva myös sille, miten käyttäjäpalautteesta (3.3) voi opettaa reititintä. |

### Käyttöliittymä (osio 4)
| Projekti | Mitä siitä kannattaa ottaa | Lisenssi |
|---|---|---|
| [ChatALL](https://github.com/ai-shifu/ChatALL) | Suosituin "kysy kaikilta kerralla" -sovellus. Esikuva vierekkäiselle näkymälle ja mallien valinnalle. | Apache-2.0 |
| [Open WebUI](https://docs.openwebui.com/features/chat-conversations/chat-features/multi-model-chats) | Monimallitila: useampi malli vastaa samassa keskustelussa, ja niiden alle saa **"Merged Response"** -yhdistelmävastauksen. Hyvä malli siitä, miltä 4.1 + 1.7 voisi näyttää yhdessä. | Oma lisenssi, joten vain ideaksi |
| [LibreChat](https://github.com/danny-avila/LibreChat) | Mallin vaihto kesken keskustelun niin, että historia säilyy. Lisäksi käyttäjätilit ja tiedostojen lataus. Esikuva osioille 2.2–2.4 ja 5.2. | MIT |
| [hraw297/polyai](https://github.com/hraw297/polyai) | Pieni Node.js-sovellus, joka kutsuu OpenAI:ta, Anthropicia, Googlea ja xAI:ta. Helppo lukea, ja hyvä vertailukohta API-kutsujen rakenteelle. | Tarkista |

---

## Tekniset huomiot

- Tee jokaiselle mallille yhteinen rajapinta (esim. `sendMessage(model, messages, options)` → `{ text, inputTokens, outputTokens, latency }`), jolloin yhteistyötilat on helppo rakentaa sen päälle eikä niiden tarvitse tietää, mitä API:a kulloinkin käytetään.
- Kutsu malleja rinnakkain aina kun mahdollista (esim. `Promise.all` / `asyncio.gather`).
- Käsittele virheet malleittain: jos yksi malli ei vastaa (aikakatkaisu, rajoitukset, virhe), muut tulokset näytetään silti ja virhe kerrotaan käyttäjälle selkeästi.
- Käytä kunkin palveluntarjoajan uusimpia ja parhaita malleja; pidä mallien nimet yhdessä konfiguraatiotiedostossa, jotta ne on helppo vaihtaa.
- API-avaimet: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `XAI_API_KEY` ympäristömuuttujissa. Lisää `.env` tiedostoon `.gitignore`.
