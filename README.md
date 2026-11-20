# Business-idea

Suunnitelma sovellukseen, jossa **Claude, ChatGPT ja Grok** toimivat yhdessä: ne vastaavat, tarkistavat toistensa työn ja väittelevät. Ulkoasu on **realistinen avaruus** (Deep Field): oikea 3D-renderöinti ja hillitty, lennonjohtomainen käyttöliittymä.

![Päänäkymä](docs/mockups/11-paanakyma-3d.jpg)

## Mistä aloittaa
1. **[IDEAS.md](IDEAS.md)** on koko tuotesuunnitelma: visio, 160 ideaa, ulkoasu ja toteutusjärjestys. Anna tämä tiedosto Claudelle: *"Lue IDEAS.md ja toimi sen ohjeiden mukaan."*
2. **[docs/space3d/](docs/space3d/)** sisältää toimivan three.js-3D-moottorin ja kolme interaktiivista prototyyppiä:
   - `agent-map.html`: agenttikartta (mallit taivaankappaleina, missio avaruusasemana)
   - `mission-control.html`: päänäkymä planeetan horisontin yllä
   - `galaxy.html`: tiedostot spiraaligalaksina
   - `design-system.html`: värit, fontit, komponentit ja realismin säännöt

   Avaaminen: aja repon juuressa `python3 -m http.server` ja mene selaimella osoitteeseen `http://localhost:8000/docs/space3d/agent-map.html`. Vedä hiirellä pyörittääksesi ja rullaa zoomataksesi.
3. **[docs/mockups/](docs/mockups/)** sisältää mallikuvat:
   - 1–5: tärkeimmät toiminnot (vierekkäinen näkymä, konsensusmittari, väittely, aloitusnäkymä, työtila)
   - 10–13: realistinen avaruusulkoasu, renderöity suoraan prototyypeistä

Vanha neon-tyyli (Nebula v1) on arkistossa kansiossa `docs/archive/`.

| Agenttikartta | Tiedostogalaksi |
|---|---|
| ![Agenttikartta](docs/mockups/10-agenttikartta-3d.jpg) | ![Tiedostogalaksi](docs/mockups/12-tiedostogalaksi-3d.jpg) |
