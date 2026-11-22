# Muistiholvi: Mysteriousin yhteinen muisti

Tämä kansio on **toimiva esimerkki** muistijärjestelmästä, jota Claude, ChatGPT ja Grok käyttävät yhdessä. Kansio on tavallinen **Obsidian-holvi** (Markdown, YAML-otsake ja `[[wikilinkit]]`), joten sen voi avata suoraan Obsidianissa. Sovellus näyttää saman sisällön **muistigalaksina** (`docs/space3d/memory-galaxy.html`).

> Esimerkkimuistien sisältö (kahvila, kampanja, budjetti) on keksittyä esimerkkidataa, ei oikeaa tietoa.

## Periaatteet
1. **Mallit ensin, ihmiset toiseksi.** Muistin runko on tiivis konemuoto, jonka mallit lukevat nopeasti ja halvalla. Ihmiselle on yksi kenttä, `summary` (enintään 140 merkkiä), joka näytetään, kun muistia klikataan.
2. **Yksi totuus, monta näkymää.** Tiedostot ovat ainoa lähde. Hakuindeksi, galaksi ja Obsidianin graafinäkymä luodaan niistä.
3. **Haku kahdessa vaiheessa.** Ensin `memory_search` palauttaa vain tiivistelmät (muutama kymmenen tokenia per osuma). Sitten `memory_read` hakee koko rungon vain tarvittaville. Tämä säästää kontekstia ja rahaa.
4. **Kukaan malli ei kirjoita suoraan.** Kaikki kirjoitukset kulkevat **muistivahdin** kautta.
5. **Ei salaisuuksia.** Holviin ei koskaan tallenneta salasanoja, API-avaimia tai tokeneita. Henkilötiedoissa noudatetaan GDPR:ää.

## Kansiorakenne
```
memory-vault/
├── muistit/          yksi muisti = yksi tiedosto: <id>.md (esim. m-0427.md)
├── aiheet/           aihekartat (Obsidianin MOC). Galaksin sektorit generoidaan näistä.
├── schema/
│   ├── memory.schema.json   otsakkeen kentät ja sallitut arvot
│   └── tools.json           mallien muistityökalut (funktiokutsut)
└── .index/           (luodaan ajossa, ei versionhallintaan) hakuindeksi ja upotukset
```
Oikeassa sovelluksessa jokaisella käyttäjällä on oma holvinsa. Holvit eivät koskaan sekoitu keskenään.

## Muistitiedoston muoto
```markdown
---
id: m-0427
type: päätös            # fakta | päätös | mieltymys | lähde | konsensus | projekti | havainto | ristiriita
owner: shared           # shared | claude | gpt | grok
topic: "[[Business-idea]]"
stage: aktiivinen       # tuore | aktiivinen | vakiintunut | arkistoitu
importance: 0.86        # 0–1
confidence: 0.92        # 0–1
links: ["[[m-0391]]", "[[m-0412]]"]
summary: "Kahvila siirtyy korttimaksuihin. Käteinen sallitaan varalla."
---
D|kahvila.maksutapa=kortti_ensisij;kateinen=sallittu|conf=.92
R|+jono_nopeus +kirjanpito|-iakkaat_kanta-asiakkaat(grok)
C|3/3 @2026-11-20|68%→86%
L|[[m-0391]] [[m-0412]]
```

### Rungon tietueet (konemuoto)
Yksi rivi on yksi tietue: `KOODI|sisältö|lisätiedot`. Rivit ovat lyhyitä ja yksiselitteisiä, joten ne vievät vähän tokeneita ja kaikki kolme mallia ymmärtävät ne ilman erillistä jäsennintä.

| Koodi | Merkitys | Esimerkki |
|---|---|---|
| `F` | fakta | `F|asiakkaat.aamu.segmentti=toimisto_lahi|share≈.5` |
| `D` | päätös | `D|budjetti.mark.kk=600€` |
| `P` | mieltymys | `P|kieli=fi;pituus=lyhyt` |
| `R` | perustelu (+ puolesta, − vastaan) | `R|+jono_nopeus|-iakkaat(grok)` |
| `S` | lähde | `S|n=3|aihe=kahvilat_kateinen_paluu` |
| `C` | konsensus | `C|3/3 @2026-11-20|68%→86%` |
| `X` | ristiriita ja sen ratkaisu | `X|ristiriita?[[m-0427]]→ratkaistu:...` |
| `J` | projekti tai tehtävä | `J|kampanja.kevät=...|tila=suunniteltu` |
| `O` | havainto tai trendi | `O|trendi=kaura_latte↑` |
| `L` | linkit muihin muisteihin | `L|[[m-0391]] [[m-0233]]` |
| `T` | aikaraja tai vanheneminen | `T|tarkista=2027-01-01` |

## Miten mallit käyttävät muistia
- **Kaikki kolme mallia** saavat samat työkalut funktiokutsuina (`schema/tools.json`): `memory_search`, `memory_read`, `memory_write`, `memory_link` ja `memory_forget`. Saman rajapinnan voi tarjota myös MCP-palvelimena.
- **Claude** voi lisäksi käyttää Anthropicin omaa muistityökalua (`memory_20250818`). Se toimii `/memories`-kansiossa komennoilla `view`, `create`, `str_replace`, `insert`, `delete` ja `rename`. Tallennus on sovelluksen omalla palvelimella, joten `/memories` voidaan ohjata tähän holviin. Silloinkin tallennukset kulkevat muistivahdin kautta.
- **Ennen jokaista vastausta** sovellus tekee automaattisesti yhden haun käyttäjän viestillä ja liittää mukaan 3–5 parhaan muistin tiivistelmät sekä ydinmuistin (pysyvät mieltymykset).

### Haku
Pisteet lasketaan yhdistelmänä: merkityshaku upotuksilla (esim. SQLite + sqlite-vec tai Postgres + pgvector) + avainsanahaku (BM25/FTS) + tärkeys + tuoreus. Parhaille osumille haetaan lisäksi yhden askeleen linkit. Tavoiteaika on alle 50 ms paikallisella indeksillä.

### Muistivahti (kirjoitukset)
Halpa ja nopea malli tarkistaa jokaisen `memory_write`-pyynnön:
- **Päällekkäisyys:** hyvin samankaltainen muisti on jo olemassa → muistit yhdistetään.
- **Ristiriita** toisen muistin kanssa → molemmat säilyvät, väliin tulee `X`-tietue, ja asia näytetään käyttäjälle.
- **Salaisuudet ja henkilötiedot** → hylätään tai sumennetaan.
- **Tiivistelmä** kirjoitetaan, jos se puuttuu.

### "Uni" eli yöllinen konsolidaatio
Kerran vuorokaudessa (esim. klo 3):
- samankaltaiset tuoreet muistit ryhmitellään ja yhdistetään
- usein käytetyt muistit nousevat vaiheesta `tuore` → `aktiivinen` → `vakiintunut`
- käyttämättömien tärkeys pienenee hitaasti, ja vanhentuneet arkistoidaan
- aikasidonnaiset muistit (`T`-tietue tai `expires`) tarkistetaan uudelleen.

## Miten holvi näkyy galaksina
| Muistin ominaisuus | Galaksissa |
|---|---|
| `topic` | sektori tai haara |
| `stage` (ikä) | etäisyys ytimestä ja tähden väri: tuore = sininen nuori tähti ulkohaaralla, vakiintunut = kultainen tähti lähellä ydintä |
| `importance` | kirkkaus ja koko (tärkeimmillä diffraktiopiikit) |
| `arkistoitu` | himmeä tähti pölykaistassa |
| ydinmuisti (`[[Ydinmuisti]]`) | galaksin kirkas ydin |
| `links` | tähtikuviot, kun muisti valitaan |
| lukeminen ja kirjoittaminen | valopulssi muistista mallin planeettaan |
| `owner` | omistajasuodatin. Mallit ovat omanvärisiä planeettoja omien alueidensa yllä: Claude (meripihka), ChatGPT (turkoosi), Grok (jäänsininen). |

## Käyttäjän oikeudet
- Kaikki muistit näkyvät galaksissa ja listana, ja jokaisen voi muokata tai poistaa.
- Koko holvin voi ladata (Obsidian-kansiona) ja poistaa kokonaan (GDPR).
- "Mitä mallit tietävät minusta" -sivu näyttää ydinmuistin ja käyttäjää koskevat muistit.
