# Feature Specification: Catalog Produse

**Feature Branch**: `003-product-catalog`

**Created**: 2026-06-26

**Status**: Draft

**Input**: User description: "Vreau să adaug o pagină separată în aplicație numită 'Catalog Produse', care să funcționeze ca o bază de date pentru produsele mele standard (de exemplu: Invitație clasică, Meniu nuntă, Place card, Mărturie etc.). Pe această pagină vreau să pot adăuga, edita sau șterge aceste produse șablon. Ulterior, când creez o Comandă nouă pe ecranul principal (în stilul Story-ului din JIRA), nu voi mai scrie produsele de mână, ci le voi selecta printr-o listă (dropdown/căutare) direct din acest Catalog. Produsele selectate vor deveni automat sub-task-urile acelei comenzi și vor putea fi mutate prin drag-and-drop în mini-board-ul comenzii, exact cum am stabilit anterior. Aplicația rămâne locală și fără autentificare."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Gestionare Catalog Produse (Priority: P1)

Utilizatorul accesează pagina „Catalog Produse" direct prin URL și poate vedea toate produsele șablon existente. De acolo poate adăuga produse noi, edita denumirea sau descrierea unuia existent, sau îl poate șterge definitiv.

**Why this priority**: Catalogul este fundația întregii funcționalități — fără produse definite, selecția din comenzi nu este posibilă.

**Independent Test**: Poate fi testat complet navigând la pagina „Catalog Produse", adăugând un produs nou (ex. „Invitație clasică"), editând numele acestuia și ștergând un alt produs — fără să fie necesară nicio Comandă.

**Acceptance Scenarios**:

1. **Given** catalogul este gol, **When** utilizatorul adaugă un produs cu numele „Invitație clasică", **Then** produsul apare în lista catalogului.
2. **Given** catalogul conține „Meniu nuntă", **When** utilizatorul editează denumirea în „Meniu de nuntă elegantă", **Then** denumirea actualizată apare în catalog.
3. **Given** catalogul conține „Place card", **When** utilizatorul îl șterge, **Then** produsul dispare din catalog și nu mai apare în nicio selecție viitoare.
4. **Given** utilizatorul încearcă să adauge un produs cu denumire goală, **When** confirmă formularul, **Then** produsul nu este salvat și utilizatorul vede un mesaj de eroare clar.

---

### User Story 2 - Selectare Produse din Catalog la Crearea Comenzii (Priority: P1)

Când utilizatorul creează o Comandă nouă pe ecranul principal, în loc să scrie produsele manual, vede o listă de selecție (dropdown sau câmp de căutare) alimentată din Catalogul Produse și poate alege unul sau mai multe produse direct din catalog.

**Why this priority**: Este fluxul principal pentru care a fost creat catalogul — elimină munca repetitivă și erorile de scriere.

**Independent Test**: Poate fi testat creând o Comandă nouă, deschizând selectorul de produse, căutând „Invit" și selectând „Invitație clasică" — produsul trebuie să apară ca sub-task în comandă fără scriere manuală.

**Acceptance Scenarios**:

1. **Given** catalogul conține produse, **When** utilizatorul creează o Comandă nouă, **Then** formularul afișează un selector de produse din Catalog (dropdown/căutare).
2. **Given** selectorul este deschis, **When** utilizatorul tastează primele litere ale unui produs, **Then** lista se filtrează și afișează doar produsele care se potrivesc.
3. **Given** utilizatorul selectează „Meniu nuntă" și „Place card", **When** salvează Comanda, **Then** ambele produse apar ca sub-task-uri ale acelei Comenzi, vizibile în mini-board.
4. **Given** catalogul este gol, **When** utilizatorul deschide selectorul de produse, **Then** vede un mesaj care îl îndrumă să acceseze mai întâi „Catalog Produse" pentru a adăuga produse.

---

### User Story 3 - Navigare drag-and-drop a produselor în mini-board-ul Comenzii (Priority: P2)

Produsele selectate din catalog devin sub-task-uri în mini-board-ul Comenzii și pot fi mutate între coloanele de stare (ex. De făcut → În lucru → Finalizat) prin drag-and-drop, exact ca în implementarea kanban existentă.

**Why this priority**: Extinde comportamentul kanban existent la produsele venite din catalog — valoare adăugată, dar depinde de P1 pentru a funcționa.

**Independent Test**: Poate fi testat deschizând o Comandă care are produse adăugate din catalog, trăgând un produs dintr-o coloană în alta și verificând că starea este salvată și persistată la reîncărcare.

**Acceptance Scenarios**:

1. **Given** o Comandă are sub-task-uri create din catalog, **When** utilizatorul trage un sub-task din coloana „De făcut" în „În lucru", **Then** sub-task-ul apare în coloana nouă și starea este salvată.
2. **Given** utilizatorul a mutat un produs și reîncarcă pagina, **When** redeschide Comanda, **Then** produsul rămâne în coloana în care a fost mutat.

---

### User Story 4 - Adăugare manuală de produse în cadrul Comenzii (Priority: P3)

Utilizatorul poate adăuga produse ad-hoc în Comandă (care nu există în Catalog), pentru situații excepționale. Aceste produse există doar în contextul comenzii respective și nu se adaugă automat în Catalog.

**Why this priority**: Cazuri excepționale (produse unice, personalizate per client) — util, dar nu critic pentru fluxul principal.

**Independent Test**: Poate fi testat adăugând un produs cu denumire „Produs special unicat" direct în Comandă, fără ca acesta să existe în Catalog, și verificând că nu apare în Catalog.

**Acceptance Scenarios**:

1. **Given** utilizatorul editează o Comandă, **When** introduce o denumire de produs ce nu există în Catalog și îl adaugă, **Then** produsul apare ca sub-task în Comandă.
2. **Given** produsul a fost adăugat ad-hoc, **When** utilizatorul navighează la Catalog, **Then** produsul ad-hoc NU apare în Catalog.

---

### Edge Cases

- Ce se întâmplă cu sub-task-urile dintr-o Comandă dacă produsul-sursă este șters din Catalog? Sub-task-urile existente rămân neschimbate; ștergerea din Catalog nu afectează retrospectiv Comenzile create anterior.
- Ce se întâmplă dacă utilizatorul încearcă să adauge același produs din Catalog de două ori în aceeași Comandă? Sistemul permite adăugarea de duplicate (cantitate diferită sau tratament diferit per client poate justifica asta).
- Ce se întâmplă dacă Catalogul conține sute de produse? Selectorul afișează primele N rezultate relevante și filtrează pe măsură ce utilizatorul tastează.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Aplicația TREBUIE să ofere o pagină dedicată „Catalog Produse" accesibilă la un URL dedicat (ex. `/catalog`).
- **FR-002**: Utilizatorul TREBUIE să poată adăuga un produs nou în Catalog, specificând cel puțin denumirea (câmp obligatoriu).
- **FR-003**: Utilizatorul TREBUIE să poată edita denumirea și descrierea unui produs existent din Catalog.
- **FR-004**: Utilizatorul TREBUIE să poată șterge un produs din Catalog, cu confirmare înainte de ștergere definitivă.
- **FR-005**: Produsele din Catalog TREBUIE să fie persistate local, supraviețuind reîncărcării aplicației.
- **FR-006**: Formularul de creare/editare Comandă TREBUIE să includă un selector de produse care afișează lista din Catalog.
- **FR-007**: Selectorul de produse TREBUIE să suporte filtrare/căutare în timp real pe baza textului introdus de utilizator.
- **FR-008**: Produsele selectate din Catalog TREBUIE să devină automat sub-task-uri ale Comenzii, vizibile în mini-board-ul kanban al acelei Comenzi.
- **FR-009**: Sub-task-urile create din Catalog TREBUIE să suporte drag-and-drop între coloanele mini-board-ului Comenzii.
- **FR-010**: Ștergerea unui produs din Catalog NU TREBUIE să modifice Comenzile deja create care conțin acel produs.
- **FR-011**: Utilizatorul TREBUIE să poată adăuga produse ad-hoc într-o Comandă (fără ca acestea să existe în Catalog).
- **FR-012**: Sistemul TREBUIE să afișeze un mesaj clar dacă Catalogul este gol la momentul selecției, îndrumând utilizatorul.

### Key Entities

- **ProductTemplate** (produs șablon din Catalog): denumire (obligatorie, unică în catalog), descriere (opțională), dată creare.
- **OrderItem** (sub-task al Comenzii): denumire, stare curentă (coloana kanban), referință opțională la ProductTemplate sursă, ordine în coloană.
- **Order** (Comandă, entitate existentă): conține o listă de OrderItem-uri, stare generală, informații client.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Utilizatorul poate adăuga un produs nou în Catalog și îl poate regăsi în selector în mai puțin de 30 de secunde.
- **SC-002**: Crearea unei Comenzi cu 5 produse selectate din Catalog durează mai puțin de 2 minute față de 4 minute prin scriere manuală.
- **SC-003**: Filtrarea în selectorul de produse răspunde vizibil sub 300ms după fiecare tastă, fără lag perceptibil.
- **SC-004**: 100% dintre sub-task-urile adăugate din Catalog sunt persistate corect și vizibile la reîncărcarea aplicației.
- **SC-005**: Ștergerea unui produs din Catalog nu afectează nicio Comandă existentă — 0 regresii la date istorice.
- **SC-006**: Utilizatorul completează fluxul complet (adaugă produs în Catalog → creează Comandă → selectează produse → mută în kanban) fără a consulta documentație sau a cere ajutor.

## Assumptions

- Aplicația rămâne locală, fără autentificare sau sincronizare în cloud — stocarea este exclusiv pe dispozitivul utilizatorului.
- Un produs din Catalog are cel puțin o denumire; câmpuri suplimentare (preț implicit, categorie, imagine) sunt în afara scopului acestei versiuni.
- Coloanele kanban ale mini-board-ului (ex. „De făcut", „În lucru", „Finalizat") sunt deja definite și nu fac obiectul acestei funcționalități.
- Comportamentul drag-and-drop al mini-board-ului kanban (implementat anterior pentru 002-orders-products-board) va fi reutilizat fără modificări de arhitectură.
- Catalogul nu impune un număr maxim de produse pentru această versiune (nicio limită artificială).
- Produsele din Catalog nu au stoc sau inventar asociat — sunt pur șabloane de denumire/descriere.
- Aplicația nu are un Navbar — navigarea între pagini se face manual prin URL. „Catalog Produse" este accesibil direct la URL-ul dedicat, fără element de meniu global.
