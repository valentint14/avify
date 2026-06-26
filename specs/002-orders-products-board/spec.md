# Feature Specification: Orders & Products Board

**Feature Branch**: `002-orders-products-board`

**Created**: 2026-06-26

**Status**: Draft

**Input**: User description: "Vreau ca aplicația să funcționeze exact ca sistemul de Story-uri și Sub-task-uri din JIRA. Ecranul principal va afișa o listă de Comenzi (care acționează ca Story-urile din JIRA). Fiecare comandă poate fi expandată printr-un click, moment în care dedesubt apar Produsele aferente (care acționează ca Sub-task-urile). În interiorul acestei zone expandate, vreau să am un mini-board vizual unde pot muta produsele prin drag-and-drop între coloane de stări (De făcut, În Design, Validare Client, Printare, Asamblare, Gata). La fel ca în JIRA, starea comenzii mari (a Story-ului) este dependentă de sub-task-uri: în momentul în care mut ultimul produs în coloana 'Gata', întreaga comandă trebuie să fie marcată automat ca fiind 'Finalizată'. Aplicația este locală, folosită doar de mine, fără autentificare."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Browse Orders on Main Screen (Priority: P1)

Utilizatorul deschide aplicația și vede o listă cu toate comenzile existente. Fiecare comandă afișează numele ei, starea curentă (ex. „În progres", „Finalizată") și un sumar al produselor (ex. „3 din 5 produse gata"). Utilizatorul poate parcurge rapid lista și înțelege starea generală a tuturor comenzilor.

**Why this priority**: Aceasta este intrarea principală în aplicație. Fără o listă funcțională de comenzi, restul funcționalității este inaccesibilă.

**Independent Test**: Poate fi testat complet prin adăugarea manuală a câtorva comenzi în baza de date și verificarea că acestea apar corect în lista principală, cu starea și sumarul corecte.

**Acceptance Scenarios**:

1. **Given** aplicația este deschisă și există cel puțin o comandă, **When** utilizatorul vede ecranul principal, **Then** lista afișează toate comenzile cu numele, starea și numărul de produse finalizate din total.
2. **Given** nu există nicio comandă, **When** utilizatorul vede ecranul principal, **Then** ecranul afișează un mesaj de tip „empty state" care îi comunică că nu există comenzi.
3. **Given** o comandă are toate produsele în starea „Gata", **When** utilizatorul vede lista, **Then** comanda respectivă este marcată vizual ca „Finalizată" (ex. culoare distinctă, etichetă).

---

### User Story 2 — Expandare Comandă și Vizualizare Produse (Priority: P1)

Utilizatorul apasă pe o comandă din listă și aceasta se expandează direct pe loc, dezvăluind un mini-board Kanban cu toate produsele aferente distribuite pe coloane de stări. Utilizatorul poate apăsa din nou pentru a collapsa comanda.

**Why this priority**: Expandarea inline (fără navigare separată) este mecanismul central al interacțiunii, echivalent cu detaliile unui Story JIRA. Fără aceasta, produsele sunt inaccesibile.

**Independent Test**: Poate fi testat prin click pe o comandă cu produse și verificarea că mini-board-ul apare dedesubt cu produsele plasate în coloanele corecte, apoi click din nou pentru collapse.

**Acceptance Scenarios**:

1. **Given** utilizatorul vede lista de comenzi, **When** apasă pe o comandă, **Then** comanda se expandează inline și afișează un mini-board Kanban cu coloanele: De făcut, În Design, Validare Client, Printare, Asamblare, Gata.
2. **Given** comanda este expandată, **When** utilizatorul apasă din nou pe ea, **Then** mini-board-ul se collapsează și lista revine la forma compactă.
3. **Given** o comandă este expandată, **When** o altă comandă este apăsată, **Then** prima se collapsează și cea nouă se expandează (un singur board vizibil la un moment dat).
4. **Given** comanda nu are produse, **When** utilizatorul expandează comanda, **Then** mini-board-ul este vizibil dar gol, cu un mesaj că nu există produse.

---

### User Story 3 — Drag-and-Drop Produse între Coloane (Priority: P1)

Utilizatorul mută un produs dintr-o coloană de stare în alta prin drag-and-drop. Schimbarea este persistată imediat.

**Why this priority**: Aceasta este funcționalitatea core de lucru zilnic. Fără drag-and-drop, utilizatorul nu poate actualiza starea produselor.

**Independent Test**: Poate fi testat prin mutarea unui produs dintr-o coloană în alta și reîncărcarea paginii pentru a confirma că schimbarea a fost salvată.

**Acceptance Scenarios**:

1. **Given** mini-board-ul este vizibil cu produse în coloane, **When** utilizatorul trage un produs dintr-o coloană în alta, **Then** produsul apare în noua coloană și dispare din cea originală.
2. **Given** utilizatorul a mutat un produs, **When** pagina este reîncărcată, **Then** produsul rămâne în coloana în care a fost mutat.
3. **Given** utilizatorul trage un produs, **When** îl eliberează peste aceeași coloană de origine, **Then** nu se produce nicio schimbare.
4. **Given** o coloană este goală, **When** utilizatorul trage un produs în acea coloană, **Then** produsul este acceptat și apare în coloana respectivă.

---

### User Story 4 — Finalizare Automată a Comenzii (Priority: P2)

Când utilizatorul mută ultimul produs al unei comenzi în coloana „Gata", comanda este marcată automat ca „Finalizată" fără nicio acțiune manuală suplimentară.

**Why this priority**: Aceasta este logica de business principală care eliberează utilizatorul de actualizări manuale redundante — echivalentul comportamentului JIRA în care Story-ul se închide automat când toate Sub-task-urile sunt rezolvate.

**Independent Test**: Poate fi testat prin crearea unei comenzi cu un singur produs, mutarea produsului în „Gata" și verificarea că starea comenzii devine „Finalizată" imediat.

**Acceptance Scenarios**:

1. **Given** o comandă are un singur produs în orice altă coloană decât „Gata", **When** utilizatorul mută acel produs în coloana „Gata", **Then** comanda este marcată automat ca „Finalizată".
2. **Given** o comandă are mai multe produse și toate sunt în „Gata" cu excepția unuia, **When** utilizatorul mută ultimul produs în „Gata", **Then** comanda devine „Finalizată" imediat.
3. **Given** o comandă este „Finalizată", **When** utilizatorul mută un produs înapoi dintr-o altă coloană (ex. din „Gata" în „Asamblare"), **Then** starea comenzii revine automat la „În progres".
4. **Given** o comandă este „Finalizată", **When** utilizatorul adaugă un produs nou în coloana „De făcut", **Then** starea comenzii revine automat la „În progres".

---

### User Story 5 — Adăugare Comenzi și Produse (Priority: P2)

Utilizatorul poate adăuga comenzi noi și produse noi în cadrul unei comenzi existente direct din interfață.

**Why this priority**: Aplicația este inutilizabilă fără posibilitatea de a introduce date noi. Aceasta este condiția necesară pentru orice altă funcționalitate.

**Independent Test**: Poate fi testat prin adăugarea unei comenzi noi cu un produs, verificând că ambele apar în interfață.

**Acceptance Scenarios**:

1. **Given** utilizatorul se află pe ecranul principal, **When** apasă butonul de adăugare comandă și completează numele, **Then** comanda nouă apare în lista principală.
2. **Given** o comandă este expandată, **When** utilizatorul apasă butonul de adăugare produs și completează numele, **Then** produsul nou apare în coloana „De făcut".
3. **Given** utilizatorul încearcă să salveze o comandă/produs cu un nume gol, **When** apasă confirmare, **Then** acțiunea este blocată și utilizatorul vede un mesaj de eroare clar.

---

### Edge Cases

- Ce se întâmplă dacă o comandă are produse în mai multe coloane și utilizatorul mută unul înapoi din „Gata"? → Comanda trebuie să revină la „În progres" (acoperit în US4-SC3).
- Ce se întâmplă dacă conexiunea locală la date este întreruptă în timpul unui drag-and-drop? → Modificarea trebuie fie confirmată, fie anulată cu un mesaj de eroare vizibil.
- Ce se întâmplă dacă un produs are un nume foarte lung? → Textul trebuie trunchiat vizual în card, cu posibilitatea de a vedea numele complet la hover.
- Ce se întâmplă dacă utilizatorul redimensionează fereastra în timp ce un board este expandat? → Mini-board-ul trebuie să rămână utilizabil la lățimi rezonabile (nu necesită suport complet mobile).

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Sistemul TREBUIE să afișeze lista tuturor comenzilor pe ecranul principal, cu numele, starea curentă și sumarul produselor (număr finalizate / total).
- **FR-002**: Sistemul TREBUIE să permită expandarea și collapsarea unei comenzi prin click direct pe ea, afișând mini-board-ul Kanban dedesubt.
- **FR-003**: Sistemul TREBUIE să permită expandarea a cel mult unei comenzi la un moment dat (comportament accordion).
- **FR-004**: Mini-board-ul TREBUIE să conțină exact șase coloane în această ordine: De făcut, În Design, Validare Client, Printare, Asamblare, Gata.
- **FR-005**: Sistemul TREBUIE să permită mutarea produselor între coloane prin drag-and-drop.
- **FR-006**: Starea unui produs TREBUIE să fie persistată imediat după fiecare mutare prin drag-and-drop.
- **FR-007**: Sistemul TREBUIE să calculeze automat starea comenzii pe baza stării produselor sale: dacă TOATE produsele sunt în coloana „Gata", comanda devine „Finalizată"; în orice altă situație, comanda este „În progres".
- **FR-008**: Tranzițiile de stare ale comenzii (la „Finalizată" sau înapoi la „În progres") TREBUIE să fie imediate și vizibile în lista principală fără reîncărcare manuală.
- **FR-009**: Sistemul TREBUIE să permită adăugarea de comenzi noi cu un nume.
- **FR-010**: Sistemul TREBUIE să permită adăugarea de produse noi într-o comandă existentă; produsele noi TREBUIE să apară în coloana „De făcut".
- **FR-011**: Sistemul TREBUIE să valideze că numele comenzilor și produselor nu sunt goale la momentul salvării.
- **FR-012**: Aplicația TREBUIE să funcționeze complet local, fără autentificare și fără conexiune la internet.

### Key Entities

- **Comandă** (Order): Entitatea principală, echivalentul unui Story JIRA. Atribute: identificator unic, nume, stare derivată (În progres / Finalizată), dată creare, listă de produse asociate.
- **Produs** (Product): Sub-entitatea aferentă unei comenzi, echivalentul unui Sub-task JIRA. Atribute: identificator unic, nume, stare curentă (una din cele 6 coloane), referință la comanda părinte, dată creare.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Utilizatorul poate muta un produs dintr-o coloană în alta în mai puțin de 3 secunde (drag, drop, confirmare vizuală).
- **SC-002**: Marcarea automată a comenzii ca „Finalizată" apare vizibil în interfață în mai puțin de 1 secundă după mutarea ultimului produs în „Gata", fără interacțiune suplimentară din partea utilizatorului.
- **SC-003**: Utilizatorul poate adăuga o nouă comandă cu un produs și poate muta acel produs prin toate 6 coloanele în mai puțin de 2 minute de la prima utilizare (testare de uzabilitate cu utilizator nou).
- **SC-004**: Toate modificările (stare produs, stare comandă) supraviețuiesc unei reîncărcări complete a paginii — rata de pierdere a datelor este 0%.
- **SC-005**: Lista principală cu până la 50 de comenzi (fiecare cu până la 20 de produse) se încarcă și devine interactivă în mai puțin de 2 secunde pe hardware-ul local al utilizatorului.

---

## Assumptions

- Aplicația este utilizată exclusiv local de un singur utilizator; nu există cerințe de multi-user, sincronizare sau cloud.
- Nu există autentificare — aplicația se deschide direct fără login.
- Datele sunt stocate local pe mașina utilizatorului (baza de date locală sau fișier local).
- Starea comenzii este derivată exclusiv din starea produselor sale — nu există o opțiune de setare manuală a stării comenzii.
- O comandă fără produse nu poate fi „Finalizată" — starea sa este „În progres" (sau un echivalent neutru) până când are cel puțin un produs și acesta ajunge în „Gata".
- Suportul mobile nu este necesar; aplicația este destinată utilizării pe desktop/laptop.
- Nu există cerințe de ștergere sau arhivare a comenzilor/produselor în această versiune — funcționalitatea poate fi adăugată ulterior.
- Ordinea coloanelor din mini-board este fixă și nu poate fi configurată de utilizator.
- Un produs poate fi în una și numai una dintre cele 6 coloane la orice moment dat.
