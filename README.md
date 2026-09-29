# Clear Night

Semestrální práce **4IZ268 Webové technologie: webová aplikace v JavaScriptu** (VŠE, ZS 2026/2027).

**Will the stars be visible tonight?** Clear Night ukáže pro libovolné místo, jak dobré budou v příštích sedmi nocích podmínky pro pozorování oblohy. Z hodinové předpovědi počasí a polohy Měsíce spočítá pro každou hodinu skóre, doporučí nejlepší okno a v pozadí vykreslí skutečnou hvězdnou oblohu, jak bude z daného místa v danou hodinu vidět.

- Aplikace: https://matousmamolat.github.io/clear-night/
- Kód: https://github.com/matousmamolat/clear-night

Čistý JavaScript bez knihoven a frameworků.

## Funkce

1. **Vyhledání místa** podle názvu (AJAX, Open-Meteo Geocoding API).
2. **Hodinová předpověď na 7 nocí** (AJAX, Open-Meteo Forecast API): oblačnost ve třech hladinách, vlhkost, viditelnost, pravděpodobnost srážek, vítr, západ a východ Slunce.
3. **Skóre pozorovacích podmínek** pro každou hodinu podle vlastního modelu a **nejlepší okno** noci (tři nejlepší hodiny za sebou).
4. **Přehled 7 nocí** na svislé ose a detail vybrané noci. Kliknutím na hodinu se ukážou její údaje.
5. **Poloha a fáze Měsíce** počítané v JavaScriptu. Jasný Měsíc nad obzorem snižuje skóre.
6. **Skutečná hvězdná obloha** v pozadí: 5 044 hvězd a čáry souhvězdí z katalogu načteného přes AJAX, přepočítané na místo a hodinu.
7. **Oblíbená místa** v localStorage: uložit, přejmenovat, smazat, rychle otevřít.
8. **Stav v URL** (History API): reload i sdílený odkaz otevřou stejné místo a noc, fungují tlačítka zpět a vpřed.
9. **Ošetření chyb:** nic nenalezeno, výpadek připojení, chyba serveru, zablokované nebo poškozené localStorage, neplatné URL.

## Struktura

```
index.html            jediná stránka aplikace
css/style.css         vzhled (černobílý „přístrojový“ styl, responzivní)
js/api.js             komunikace s Open-Meteo (fetch, async/await)
js/astro.js           astronomické výpočty (hvězdný čas, výška nad obzorem, Měsíc)
js/score.js           model skóre a nejlepší okno
js/places.js          oblíbená místa v localStorage
js/sky.js             vykreslení oblohy do <canvas>
js/app.js             rozhraní: hledání, noci, hodiny, URL, oblíbená místa
data/sky.json         katalog hvězd a čar souhvězdí (načítá se přes AJAX)
fonts/                písma Barlow, Barlow Condensed, IBM Plex Mono
```

Soubory `api.js`, `astro.js`, `score.js` a `places.js` obsahují jen výpočty a data, na stránku nesahají. Všechno, co se týká zobrazení, je v `app.js` a `sky.js`.

## Jak se počítá skóre (`js/score.js`)

Každá hodina začíná na `100 − oblačnost`, kde rozhoduje nejhustší vrstva a vysoká řídká oblačnost se počítá ze 70 %. Výsledek pak zmenšují násobiče od 0 do 1:

| Vliv | Kdy začne vadit | Nejhorší případ |
|---|---|---|
| Vlhkost (opar, rosa) | nad 70 % | ×0,6 při 100 % |
| Viditelnost | pod 20 km | ×0,5 při 5 km |
| Pravděpodobnost srážek | od 0 % | ×0,2 při 100 % |
| Vítr (chvění dalekohledu) | nad 20 km/h | ×0,7 při 50 km/h |
| Soumrak | první a poslední hodina noci | ×0,6 |
| Měsíc nad obzorem | podle osvětlení a výšky | ×0,5 u úplňku ve výšce 20° a víc |

Skóre noci je průměr nejlepších tří hodin za sebou (posuvné okno v `bestWindow()`).

## Splnění požadavků

| Požadavek | Řešení |
|---|---|
| Aplikace v JavaScriptu | Čistý JS (ES2017+), 7 souborů podle odpovědnosti |
| Vhodné využití AJAX | 3 druhy požadavků přes `fetch`: vyhledání místa, předpověď, katalog hvězd |
| Veřejné API | Open-Meteo Forecast a Geocoding API, bez klíče |
| Na serveru dostupném z internetu | GitHub Pages |
| Funkční historie prohlížeče | `history.pushState` a `popstate`, stav v URL (`?place=…&lat=…&lon=…&night=…`) |
| Uchování stavu | localStorage (oblíbená místa) a URL (místo a noc) |
| Nejnovější prohlížeče | Otestováno v Chromiu, Brave a mobilním Safari |

## Zdroje a licence

- Předpověď počasí a vyhledávání míst: [Open-Meteo](https://open-meteo.com/), data pod licencí CC BY 4.0 (uvedeno v patičce aplikace), nekomerční použití bez klíče.
- Polohy hvězd: katalog Hipparcos (ESA), připravený projektem [d3-celestial](https://github.com/ofrohn/d3-celestial) (© Olaf Frohn, BSD-3-Clause, licence v `data/LICENSE-d3-celestial.txt`). Soubor `data/sky.json` vznikl skriptem `tools/build-sky-data.js`.
- Astronomické vzorce: zjednodušené metody z knihy Jean Meeus, *Astronomical Algorithms*.
- Písma Barlow, Barlow Condensed a IBM Plex Mono: SIL Open Font License 1.1.
- Aplikace nepoužívá žádné cizí obrázky, vše na obrazovce kreslí kód.

## Spuštění

Stačí statický server, například Live Server ve VS Code. Otevření souboru přímo (`file://`) nestačí, protože prohlížeč pak nedovolí načíst `data/sky.json`.
