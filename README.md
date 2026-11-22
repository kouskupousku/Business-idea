# Mysterious

Sovellus, jossa **Claude, ChatGPT ja Grok** toimivat yhdessä: ne vastaavat, tarkistavat toistensa työn ja väittelevät. Brändivärit ovat **musta ja liila**, ja ulkoasu on **realistinen avaruus** (Deep Field): oikea 3D-renderöinti ja hillitty, lennonjohtomainen käyttöliittymä. Oikeassa reunassa oleva **yhteyskanava** näyttää animaationa, kun mallit puhuvat toisilleen.

![Päänäkymä ja yhteyskanava](docs/mockups/11-paanakyma-3d.jpg)

## Mistä aloittaa
1. **[IDEAS.md](IDEAS.md)** on koko tuotesuunnitelma: visio, 160 ideaa, ulkoasu ja toteutusjärjestys. Anna tämä tiedosto Claudelle: *"Lue IDEAS.md ja toimi sen ohjeiden mukaan."*
2. **[docs/space3d/](docs/space3d/)** sisältää toimivan three.js-3D-moottorin ja interaktiiviset prototyypit:
   - `mission-control.html`: päänäkymä planeetan horisontin yllä, oikealla yhteyskanava (`comms.js`)
   - `agent-map.html`: agenttikartta (mallit taivaankappaleina, missio avaruusasemana)
   - `galaxy.html`: tiedostot spiraaligalaksina
   - `design-system.html`: värit, fontit, komponentit ja realismin säännöt

   Avaaminen: aja repon juuressa `python3 -m http.server` ja avaa selaimessa `http://localhost:8000/docs/space3d/mission-control.html`.
3. **[docs/mockups/](docs/mockups/)** sisältää kuvat ja videot:
   - 1–5: tärkeimmät toiminnot
   - 10–13: realistinen avaruusulkoasu
   - 14–15: yhteyskanavan animaatio ([koko näkymä, MP4](docs/mockups/14-yhteyskanava-paanakyma.mp4), [lähikuva, MP4](docs/mockups/15-yhteyskanava.mp4))

**Logo:** tehdään erikseen. Korvaa paikkamerkki `docs/space3d/assets/logo.svg` oikealla logolla, niin se näkyy kaikissa näkymissä.

![Yhteyskanava](docs/mockups/15-yhteyskanava.gif)
