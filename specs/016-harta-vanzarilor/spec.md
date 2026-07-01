# Feature Specification: Harta Vânzărilor

**Feature Branch**: `016-harta-vanzarilor`

**Created**: 2026-07-01

**Status**: Draft

**Input**: User description: "Adaugă o secțiune vizuală numită 'Harta vânzărilor' pe pagina de Statistici (Dashboard). Integrează o hartă vectorială (SVG) interactivă a României, împărțită pe județe. Harta trebuie să fie conectată direct la baza de date SQLite: județele în care nu s-a livrat nicio comandă vor avea o culoare neutră, iar județele unde există cel puțin o comandă cu statusul 'Livrată' trebuie să fie evidențiate (colorate diferit, cu o intensitate a culorii proporțională cu numărul de comenzi sau profitul din acel județ). La trecerea cu mouse-ul (hover) peste un județ, afișează un pop-up rapid (Tooltip din shadcn) cu numele județului, numărul total de comenzi livrate acolo și valoarea totală încasată."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Vizualizarea distribuției geografice a comenzilor livrate (Priority: P1)

Utilizatorul (angajat sau administrator) deschide pagina de Statistici și vede imediat o hartă a României care reflectă activitatea de livrare: județele fără comenzi livrate apar cu o culoare neutră, iar județele cu comenzi livrate sunt colorate, cu intensitatea culorii proporțională cu volumul de activitate.

**Why this priority**: Aceasta este valoarea principală a featurei — o privire de ansamblu geografic asupra activității firmei. Fără aceasta, harta nu are nicio utilitate.

**Independent Test**: Poate fi testată independent prin accesarea paginii /statistici cu date seed care conțin comenzi livrate în județe specifice și verificarea că acele județe apar vizibil diferite față de cele fără comenzi.

**Acceptance Scenarios**:

1. **Given** există comenzi cu `delivered = 1` și `county = 'Cluj'` în baza de date, **When** utilizatorul navighează la pagina de Statistici, **Then** județul Cluj apare colorat/evidențiat pe hartă, iar restul județelor fără comenzi livrate apar cu culoarea neutră (gri).
2. **Given** nu există nicio comandă livrată în baza de date, **When** utilizatorul navighează la pagina de Statistici, **Then** toate județele apar cu culoarea neutră și harta este totuși vizibilă și funcțională.
3. **Given** există comenzi livrate în mai multe județe cu volume diferite, **When** utilizatorul privește harta, **Then** județele cu mai multe comenzi livrate apar cu o nuanță mai intensă decât cele cu mai puține comenzi.

---

### User Story 2 — Tooltip cu detalii pe hover (Priority: P2)

Utilizatorul plasează cursorul mouse-ului peste un județ de pe hartă și vede instantaneu un pop-up (tooltip) cu informații sintetice despre activitatea din acel județ.

**Why this priority**: Tooltipul transformă harta dintr-o infografică pasivă într-un instrument informațional util. Permite investigarea rapidă a unui județ fără a părăsi pagina.

**Independent Test**: Poate fi testată independent prin hover pe un județ colorat și verificarea că tooltipul apare cu date corecte, și hover pe un județ neutru pentru verificarea că tooltipul arată date zero.

**Acceptance Scenarios**:

1. **Given** utilizatorul este pe pagina de Statistici cu harta vizibilă, **When** plasează cursorul pe județul Iași (cu comenzi livrate), **Then** apare un tooltip cu: numele "Iași", numărul total de comenzi livrate și valoarea totală a comenzilor livrate din acel județ.
2. **Given** utilizatorul este pe pagina de Statistici cu harta vizibilă, **When** plasează cursorul pe un județ fără comenzi livrate, **Then** apare un tooltip cu: numele județului, "0 comenzi livrate" și "0 lei".
3. **Given** un tooltip este vizibil, **When** utilizatorul mișcă cursorul în afara județului, **Then** tooltipul dispare imediat.
4. **Given** utilizatorul este pe un ecran mic (viewport mobil), **When** navighează la pagina de Statistici, **Then** harta este vizibilă și utilizabilă fără scroll orizontal (adaptată la lățimea ecranului).

---

### User Story 3 — Metrică selectabilă pentru intensitatea culorii (Priority: P3)

Utilizatorul poate alege dacă intensitatea culorii județelor reflectă numărul de comenzi livrate sau profitul total generat din acel județ.

**Why this priority**: Adaugă flexibilitate analitică, dar nu este blocantă — harta cu o singură metrică fixă (număr de comenzi) livrează deja valoare.

**Independent Test**: Poate fi testată independent prin schimbarea metricii și verificarea că intensitățile culorilor se actualizează corespunzător.

**Acceptance Scenarios**:

1. **Given** utilizatorul este pe pagina de Statistici cu harta afișată, **When** selectează "Profit" în loc de "Număr comenzi", **Then** culorile județelor se actualizează pentru a reflecta profitul relativ (județele cu profit mai mare apar mai intense), iar tooltipul afișează profitul ca metrică principală.
2. **Given** utilizatorul schimbă metrica, **When** face hover pe un județ, **Then** tooltipul afișează ambele valori (număr comenzi și valoare) indiferent de metrica selectată pentru colorare.

---

### Edge Cases

- Ce se întâmplă când câmpul `county` al unei comenzi livrate este `NULL` sau gol? Comanda respectivă este ignorată în calcule, iar hartă rămâne corectă.
- Ce se întâmplă dacă o comandă are `county` setat la un județ care nu se regăsește în SVG-ul hărții? Datele sunt calculate, dar nu afectează vizualizarea (nu există formă SVG pentru acel județ).
- Ce se întâmplă dacă profitul (`profit`) pentru o comandă livrată este `NULL` sau 0? Valoarea este tratată ca 0 în calcul fără a genera erori.
- Ce se întâmplă dacă toate comenzile livrate sunt concentrate într-un singur județ? Acel județ primește intensitatea maximă, celelalte județe cu comenzi primesc intensitate proporțională.
- Ce se întâmplă la un număr mare de comenzi (>1000)? Interogarea SQL agregată pe județ este eficientă și nu degradează performanța paginii.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Pagina de Statistici TREBUIE să afișeze o secțiune distinctă intitulată "Harta vânzărilor" care conține harta SVG interactivă a României.
- **FR-002**: Harta TREBUIE să afișeze toate cele 41 de județe ale României plus municipiul București ca regiuni SVG independente, identificabile individual.
- **FR-003**: Sistemul TREBUIE să calculeze, pentru fiecare județ, numărul total de comenzi cu `delivered = 1` și valoarea totală corespunzătoare (suma profiturilor comenzilor livrate din acel județ).
- **FR-004**: Județele fără nicio comandă livrată TREBUIE să fie afișate cu o culoare neutră (gri deschis).
- **FR-005**: Județele cu cel puțin o comandă livrată TREBUIE să fie evidențiate cu o culoare distinctă, iar intensitatea culorii TREBUIE să fie proporțională cu volumul activității (număr de comenzi sau profit, după metrica selectată).
- **FR-006**: La hover pe orice județ, sistemul TREBUIE să afișeze un tooltip (folosind componenta Tooltip din shadcn/ui) cu: numele județului, numărul total de comenzi livrate și valoarea totală a comenzilor livrate din acel județ.
- **FR-007**: Datele hărții TREBUIE să fie citite din baza de date SQLite la fiecare accesare a paginii, reflectând starea curentă a comenzilor.
- **FR-008**: Harta TREBUIE să fie responsivă — se scalează proporțional pentru a se încadra în lățimea containerului, fără scroll orizontal.
- **FR-009**: Utilizatorul TREBUIE să poată selecta metrica de colorare între "Număr comenzi" și "Profit total" printr-un element de control vizibil (toggle sau selector) în secțiunea hărții.
- **FR-010**: Calculele de intensitate a culorii TREBUIE să utilizeze normalizare liniară față de valoarea maximă — județul cu cea mai mare valoare primește intensitatea maximă, celelalte sunt proporționale.
- **FR-011**: Comenzile cu câmpul `county` NULL sau gol TREBUIE să fie excluse din calcule și din vizualizare, fără a genera erori.

### Key Entities *(include if feature involves data)*

- **Order (Comandă)**: Entitate existentă în tabelul `orders`. Câmpurile relevante: `county` (județul de livrare, TEXT), `delivered` (flag livrare, INTEGER 0/1), `profit` (profitul comenzii, REAL). Fiecare comandă cu `delivered = 1` și `county` nenul contribuie la harta vânzărilor.
- **County Aggregate (Agregat județ)**: Entitate calculată (nu stocată), derivată prin GROUP BY pe câmpul `county` din comenzile livrate. Conține: numele județului, numărul de comenzi livrate și suma profiturilor.
- **Romania SVG Map**: Hartă vectorială statică a României care mapează coduri/nume de județe la forme SVG. Aceasta este un asset static care va fi integrat în aplicație.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Harta vânzărilor este vizibilă pe pagina de Statistici în mai puțin de 2 secunde de la deschiderea paginii, inclusiv datele din baza de date.
- **SC-002**: Toate cele 41 de județe plus București sunt vizibile și identificabile pe hartă.
- **SC-003**: Tooltipul apare în mai puțin de 200 ms de la intrarea cursorului pe un județ și dispare în mai puțin de 100 ms după ieșire.
- **SC-004**: Culorile județelor reflectă corect datele din baza de date — verificabil prin compararea valorilor din tooltip cu interogări SQL directe.
- **SC-005**: Harta este utilizabilă pe ecrane cu lățime minimă de 320px (viewport mobil minim), fără scroll orizontal.
- **SC-006**: Selecția metricii (număr comenzi vs. profit) actualizează vizualizarea instantaneu (fără reîncărcare de pagină).
- **SC-007**: Performanța interogării SQL pentru agregarea datelor pe județe nu depășește 50 ms pentru până la 10.000 comenzi în baza de date.

## Assumptions

- Câmpul `county` din tabelul `orders` stochează numele județului în română, în același format ca etichetele din harta SVG (de ex. "Cluj", "Iași", "București"). Dacă există discrepanțe de format, va fi necesară o mapare de normalizare.
- Valoarea totală afișată în tooltip ("valoarea totală încasată") se bazează pe câmpul `profit` al comenzilor livrate, acesta reprezentând cel mai bun proxy disponibil pentru venitul net generat. O alternativă ar fi suma `unit_price × quantity` pe toate produsele comenzii, dar aceasta implică un JOIN suplimentar; `profit` este suficient pentru MVP.
- Datele de județ (`county`) sunt deja populate în baza de date pentru comenzile existente (feature 006 a adăugat coloana `county` în `orders`).
- Harta SVG a României va fi obținută ca fișier SVG public cu regiuni etichetate per județ; integrarea ca asset static nu necesită niciun pachet npm suplimentar.
- Metrica implicită pentru intensitatea culorii este "Număr comenzi" (FR-009); utilizatorul poate schimba în "Profit total".
- Funcționalitatea de hover/tooltip nu este testabilă pe dispozitive touch; această limitare este acceptată pentru MVP.
- Securitate: nu există date sensibile în agregatul afișat; accesul la pagina de Statistici urmează același model de autorizare ca restul paginilor aplicației (acces intern, fără autentificare externă).
- Animațiile de tranziție la hover sunt de dorit pentru UX, dar nu sunt obligatorii pentru MVP.
