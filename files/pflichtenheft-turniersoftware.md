# Pflichtenheft — Turnierverwaltung

**Version:** 1.0
**Stand:** 10.08.2026
**Änderung gegenüber 0.9:** Nachdruck einmal täglich zu fester Zeit. Damit sind alle offenen Punkte entschieden — das Dokument ist umsetzungsreif.
**Status:** vollständig entschieden, bereit zur Umsetzung

---

## 1. Zweck

Die Software plant, verwaltet und zeigt Turniere auf Freizeiten.
Sie deckt alle gängigen Turnierformen mit **einer** Engine ab: Anmeldung, Spielplan erzeugen, Ergebnisse eintragen, Sieger automatisch weiterschreiben, Stand anzeigen.

**Eigenständige Software.** Keine Anbindung an die Camp-Software.

### 1.1 Ausbaustufen

**Stufe 1 — dieses Jahr: nur Papier.**
Am schwarzen Brett hängen ausgedruckte Listen. Kein Terminal, kein Bildschirm, kein Server. Die Software läuft auf einem Laptop bei einem MA: Teams erfassen, Spielplan erzeugen, A4 drucken, aushängen. Ergebnisse werden von Hand auf die ausgehängte Liste geschrieben und am Laptop nacherfasst. Danach neuer Ausdruck.

Die Nacherfassung macht **eine einzelne Person**. Das heißt: Fällt sie einen Tag aus, wird nichts aktualisiert. Der Aushang muss deshalb auch dann noch benutzbar sein, wenn er zwei Tage alt ist — er trägt alle Restspiele mit Eintragfeldern (F-28) und ist damit für sich allein vollständig.

**Stufe 2 — ab nächstem Jahr: Tablet und Bildschirm.**
Zusätzlich ein Tablet als Terminal am schwarzen Brett, an dem die Teams selbst eintragen, und ein Bildschirm mit rotierender Anzeige. Erst dann braucht es einen Server im WLAN und den Offline-Sync.

| Bereich | Stufe 1 | Stufe 2 |
|---|---|---|
| Server | keiner, alles auf einem Laptop | Raspberry Pi im WLAN |
| Ergebniseingabe | MA am Laptop, aus der Papierliste | Teams am Tablet, MA weiterhin am Laptop |
| Ausgabe an die Teams | A4-Ausdruck | Ausdruck plus Bildschirm mit Rotation |
| Sync | keiner nötig, ein Gerät | Event-Queue, Terminal offline-fähig |

Der Papierweg aus Stufe 1 bleibt in Stufe 2 vollständig erhalten — dann als Rückfallebene bei Geräteausfall. Deshalb gilt: **Stufe 2 ist eine Ergänzung, kein Umbau.** Datenmodell, Turnierlogik und Druckvorlagen ändern sich dabei nicht.

### 1.2 Nicht-Ziele

- Keine Gesamtwertung über mehrere Disziplinen. Jedes Turnier steht für sich
- Keine Ticket-, Zuschauer- oder Bezahlfunktion
- Keine Statistik pro Spieler
- Keine öffentliche Erreichbarkeit aus dem Internet
- Keine technische Betrugssicherung (siehe 4.6)

---

## 2. Rollen

| Rolle | Gerät | Rechte |
|---|---|---|
| **Admin** | eigenes Gerät | Turniere anlegen, Modus, Anmeldung öffnen/schließen, Setzung, Korrektur, Storno, Protokoll |
| **Mitarbeiter (MA)** | eigenes Gerät | Ergebnisse korrigieren, Spiele absagen, Anmeldungen nachtragen |
| **Team / Spieler** | Tablet am schwarzen Brett | Eigenes Ergebnis eintragen, Spielplan ansehen — **erst Stufe 2** |
| **Anzeige** | Bildschirm im WLAN | Nur lesen — **erst Stufe 2** |

In Stufe 1 existieren nur Admin und MA. Login über Passwort. Das Terminal in Stufe 2 hat **keinen** Benutzerlogin und fragt keine Identität ab — es wird auf Fair Play gesetzt (siehe 4.6). MA-Funktionen am Terminal nur über PIN.

---

## 3. Turniermodi

Alle Modi laufen über dasselbe Datenmodell (Kapitel 5). Ein Modus ist nur eine Regel, wie Matches erzeugt und Slots verknüpft werden.

### 3.1 Single Elimination (K.-o.)

- Teamzahl 2–10
- Freilose: `Freilose = nächste Zweierpotenz − Teamzahl`. Sie gehen an die bestgesetzten Teams und werden automatisch aufgelöst
- Spiele: `n − 1`
- Optional: Spiel um Platz 3

### 3.2 Double Elimination

- Winner-Bracket (WB) und Loser-Bracket (LB), Ausscheiden nach der zweiten Niederlage
- Spiele: `2n − 2`, mit Bracket Reset `2n − 1`
- **Pflicht:** Verlierer über Kreuz ins LB einsetzen (obere WB-Hälfte → untere LB-Hälfte), sonst sofortige Rematches
- Bracket Reset pro Turnier an- oder abschaltbar

### 3.3 Liga / Jeder gegen Jeden

- Einfach- oder Hin-und-Rückrunde
- Spiele: `n × (n−1) / 2` bzw. das Doppelte
- Alle Spiele sind unabhängig und in beliebiger Reihenfolge spielbar
- **Grenze bei einem Feld:** ab etwa 10 Teams zeitlich nicht mehr machbar (6.4). Das System warnt und schlägt Gruppen vor

### 3.4 Gruppenphase + K.-o.

- Gruppenzahl frei, Gruppengrößen dürfen sich um 1 unterscheiden
- Verteilung: Schlangensystem nach Setzung oder Zufall
- Konfigurierbar: wie viele Teams pro Gruppe weiterkommen
- **Pflicht:** Kreuz-Setzung in die K.-o.-Runde (Sieger A gegen Zweiter B)
- Regel für „beste Gruppendritte" konfigurierbar

### 3.5 Schweizer System

- Feste Rundenzahl, Standard `aufgerundet log2(n)`
- Paarung je Runde nach Punktzahl, keine Wiederholungspaarungen
- **Einschränkung:** Eine Runde muss komplett sein, bevor die nächste ausgelost wird. Für frei terminierte Turniere ungeeignet

### 3.6 Herausforderungs-Leiter (Ladder)

- Rangliste. Ein Team fordert ein Team bis maximal X Plätze über sich heraus
- Bei Sieg tauschen die Plätze
- Kein Spielplan, keine feste Spielzahl. Als einziger Modus können Teams **während** des Turniers noch dazukommen
- Konfigurierbar: maximale Sprungweite, Sperrfrist für dieselbe Paarung

### 3.7 Punkte und Tiebreaker

Pro Turnier konfigurierbar. Standard: Sieg 3, Unentschieden 1, Niederlage 0. Unentschieden zulassen: ja/nein. Bei K.-o.-Spielen erzwingt das System einen Sieger.

Tiebreaker in dieser Reihenfolge, jeder Schritt einzeln abschaltbar:

1. Direkter Vergleich (bei mehr als zwei gleichen Teams: Untertabelle nur aus deren Spielen untereinander)
2. Tordifferenz
3. Mehr erzielte Tore
4. Los — muss vom Admin bestätigt werden, das System würfelt nicht still

---

## 4. Funktionale Anforderungen

### 4.1 Turnier anlegen

- **F-01** Turnier anlegen mit Name, Disziplin, Modus, Zeitraum. Spieldauer und Wechselzeit sind optionale Felder
- **F-02** Modus-Auswahl aus Kapitel 3. Nach dem ersten eingetragenen Ergebnis ist der Modus gesperrt
- **F-03** Vor dem Erzeugen des Spielplans zeigt das System: Anzahl Spiele und Spiele pro Team (min/max). Sind Spieldauer und Wechselzeit gepflegt, zusätzlich die benötigte Feldzeit nach 6.4
- **F-04** *Entfällt.* Keine automatische Zeitwarnung, keine Modusvorschläge. Die Spielzahl aus F-03 ist Information, die Entscheidung trifft der Admin
- **F-05** Das System warnt, wenn der Modus nicht zur freien Terminierung passt (Double Elimination, Schweizer System)
- **F-06** Turnier duplizieren
- **F-07** Bis zu **8 Turniere gleichzeitig**. Jedes Turnier hat genau eine Disziplin und genau ein Feld
- **F-08** Turnierstatus: Anmeldung offen → Anmeldung geschlossen → läuft → beendet → archiviert

### 4.2 Teams erfassen

Die Anmeldung läuft **im Vorfeld über Papierlisten**. Die Software nimmt keine Anmeldungen entgegen. MA oder Admin erfassen die fertige Liste, bevor das Turnier startet. Angemeldet wird pro Turnier — keine Teamzuordnung über Disziplinen hinweg, keine Gesamtwertung.

- **F-10** Teams am Laptop erfassen: Name, optional Mitglieder. Keine Namenseingabe am Terminal — auf einem alten Handy tippt das niemand freiwillig
- **F-11** Teams per CSV importieren (Spalten: Name, Mitglieder, Setzplatz)
- **F-12** Ein Team kann eine einzelne Person sein. Einzelturniere brauchen kein Sonderkonzept: Teamname = Spielername
- **F-13** Doppelte Namen innerhalb eines Turniers werden abgelehnt, mit Nummerierungsvorschlag
- **F-14** Harte Obergrenze **10 Teams** pro Turnier
- **F-15** Teamliste eines bestehenden Turniers in ein neues kopieren
- **F-16** Der Spielplan wird erzeugt, sobald die Liste steht — das geht schon vor dem Lager. Ausdrucke lassen sich zu Hause vorbereiten
- **F-17** **Nachmeldung** vor dem ersten Ergebnis: Team hinzufügen, Spielplan wird neu erzeugt. Danach nur noch im Ladder-Modus möglich
- **F-18** **Rückzug oder Nichtantreten:** jederzeit möglich. Alle offenen Spiele des Teams werden **1:0 für den Gegner** gewertet — Sieg zählt, Tordifferenz wird nicht verzerrt. Bei K.-o. rückt der Gegner auf. Bei Papieranmeldung Wochen im Voraus und Teilnehmern zwischen 8 und 14 ist das der Normalfall, nicht die Ausnahme
- **F-19** Setzung: Standard Zufall, optional manuell durch den Admin

### 4.3 Spielplan und Terminierung

- **F-20** Spielplan wird aus Modus + Teams automatisch erzeugt
- **F-21** Freilose werden automatisch gesetzt und gekennzeichnet
- **F-22** **Standardfall ist freie Terminierung:** Spiele haben keinen festen Termin. Sie stehen als „offen" in einer Liste, sortiert nach Spielbarkeit
- **F-23** Ein Spiel ist spielbar, wenn beide Slots aufgelöst sind. Nicht spielbare Spiele werden ausgegraut mit Begründung („wartet auf Spiel 5")
- **F-24** Optional: Spiele auf feste Zeitfenster legen. Dann prüft das System, ob ein Team zwei Spiele gleichzeitig hat — auch über Turniergrenzen hinweg, sofern Namen übereinstimmen
- **F-25** Deadline pro Phase setzbar. Nicht gespielte Spiele werden nach konfigurierter Regel gewertet (Standard: 0 Punkte für beide)
- **F-26** Ausdruck ausschließlich A4. In Stufe 1 ist der Ausdruck die **gesamte** Benutzeroberfläche für die Teams, nicht nur eine Rückfallebene. Drei Druckvorlagen:
  - **Spielplan als Liste** (A4 hoch): eine Zeile je Spiel, mit Feldern zum Eintragen von Hand. Hauptvorlage — funktioniert für alle Modi. Selbst der längste Fall (Liga mit 10 Teams, 45 Spiele) passt auf ein Blatt
  - **Tabelle / Kreuztabelle** (A4 quer): bei maximal 10 Teams unkritisch, Zellen mindestens 12 mm
  - **Baum** (A4 quer): bis 10 Teams immer eine einzige Seite. Keine mehrseitige Vorlage, keine Seitenverweise
- **F-27** Jede Seite trägt Disziplin, Stand-Datum, Uhrzeit und eine laufende Ausdrucknummer, dazu den Hinweis, ältere Blätter abzunehmen. Ohne das hängen nach drei Tagen zwei Stände nebeneinander und niemand weiß, welcher gilt
- **F-28** Die Spielplan-Liste hat je Zeile leere Kästchen für das handschriftliche Ergebnis
- **F-29** Im Nachdruck sind bereits erfasste Spiele als erledigt markiert, offene bleiben leer. Ein Aushang zeigt damit Ergebnisse und Restprogramm zugleich

### 4.4 Ergebnisse

- **F-30** Ergebnis eintragen am Terminal: Disziplin → Spiel → Tore Team A / Team B → bestätigen. Sieger wird berechnet
- **F-31** **Eine** Bestätigung reicht. Es wird auf Fair Play gesetzt, keine Doppelbestätigung, keine MA-Freigabe. Das Ergebnis zählt sofort für Tabelle und Baum
- **F-32** Status-Kette: geplant → spielbar → eingetragen → gewertet. Zusätzlich: abgesagt, gewertet ohne Spiel, strittig (nur bei Sync-Konflikt, siehe 8.4)
- **F-33** Nach dem Eintragen werden abhängige Slots automatisch gefüllt (Sieger und Verlierer weiterschreiben, Tabelle neu rechnen)
- **F-34** Ergebnis ändern kann jeder am Terminal innerhalb von 10 Minuten nach dem Eintrag (Tippfehler). Danach nur noch MA oder Admin per PIN
- **F-35** Bei Korrektur zeigt das System vorher, welche Folgespiele ungültig werden, und verlangt eine Bestätigung
- **F-36** Abhängige Ergebnisse werden zurückgesetzt, nicht stillschweigend überschrieben
- **F-37** Jede Änderung wird protokolliert: Zeitpunkt, Gerät, alter Wert, neuer Wert. Das Protokoll ersetzt die Kontrolle nicht, macht aber Streitfälle nachvollziehbar
- **F-38** **Nacherfassung am Laptop (Stufe 1, Kernfunktion):** Liste aller offenen Spiele in Spielplan-Reihenfolge, Eingabe rein über Tastatur — Zahl, Tab, Zahl, Enter, nächste Zeile. Kein Mausklick nötig. Ziel: 20 Ergebnisse von der Papierliste in unter 2 Minuten
- **F-39** Direkt danach ein Befehl `Aushang drucken`: aktualisierte Spielplan-Liste und Tabelle mit neuem Stand-Datum, fertig zum Aushängen. **Sammeldruck:** ein Befehl erzeugt den kompletten Satz für alle laufenden Turniere als ein PDF. Bei 8 Disziplinen will niemand acht Druckvorgänge einzeln auslösen
- **F-39a** Die Nacherfassung ist an keinen persönlichen Zugang gebunden. Jeder MA-Zugang kann sie ausführen, damit bei Ausfall der Hauptperson jemand anderes übernehmen kann
- **F-39b** Nachdruck einmal täglich zu fester Zeit. Die Ausdrucknummer zählt je Turnier hoch und ist damit gleichzeitig der Tageszähler

### 4.5 Anzeige

In Stufe 1 ist die Ausgabe an die Teams ausschließlich der Ausdruck (F-26). F-42 und F-43 gehören zu Stufe 2. F-40 und F-41 werden auch in Stufe 1 gebraucht — als Ansicht für den MA und als Quelle für den Druck.

- **F-40** Baumansicht für alle K.-o.-Modi, horizontal scrollbar, mit Zoom
- **F-41** Tabellenansicht für Liga und Gruppen, inklusive Kreuztabelle
- **F-42** Vollbild-Ansicht für Bildschirm oder Beamer, Auto-Refresh alle 30 Sekunden
- **F-43** Rotation über alle laufenden Disziplinen, 20 Sekunden je Disziplin. Bei 8 Turnieren dauert ein voller Durchlauf 2 min 40 — konfigurierbar, und einzelne Disziplinen sind aus der Rotation nehmbar
- **F-44** Endstand mit Platz 1–3
- **F-45** Anzeige nur im lokalen Netz, ohne Login, ohne Schreibrechte

### 4.6 Fair Play statt Sperren

Entschieden: **keine technische Betrugssicherung.** Kein Identitätsnachweis, keine Doppelbestätigung, keine MA-Freigabe vor der Wertung.

Was stattdessen bleibt:

- **F-46** Vollständiges Protokoll aller Eingaben und Änderungen (F-37)
- **F-47** Jedes eingetragene Ergebnis erscheint sofort auf dem Anzeigebildschirm und im Ausdruck. Öffentlichkeit ist hier die wirksamste Kontrolle
- **F-48** Admin und MA können jedes Ergebnis jederzeit korrigieren
- **F-49** **Streitfälle entscheidet der Admin.** Es gibt keine Instanz darunter und keine Abstimmung im System. Die Software liefert dafür nur das Protokoll (F-46) und den aktuellen Aushang

Das ist eine bewusste Entscheidung gegen Aufwand, nicht ein Versehen. Sie spart die komplette Freigabe- und Streitfall-Logik. Falls sich das im Betrieb als Problem zeigt, ist die Nachrüstung eine reine Ergänzung: ein Status *vorläufig* plus eine Freigabeliste für MA — das Datenmodell muss dafür nicht angefasst werden.

### 4.7 Terminal am schwarzen Brett (Stufe 2)

Es gibt **ein** Terminal für alle Disziplinen. Es steht nicht am Feld, sondern am schwarzen Brett. Teams kommen nach dem Spiel dorthin.

- **F-50** Startbildschirm: Kacheln für alle laufenden Disziplinen, je mit Status (läuft / beendet) und Anzahl offener Spiele
- **F-51** Ein Tap auf eine Disziplin öffnet zwei Aktionen: **Ergebnis eintragen** und **Spielplan ansehen**
- **F-52** Ergebniseingabe: Liste der offenen, spielbaren Spiele → Spiel antippen → zwei große Zähler (Plus/Minus), kein Zahlenfeld → bestätigen → Quittung
- **F-53** „Meine nächsten Spiele": Team antippen, das Terminal zeigt dessen offene Spiele und Gegner. Ersetzt den Ausdruck für den schnellen Blick
- **F-54** Kiosk-Modus: keine Navigation aus der App heraus, kein Zugriff auf Einstellungen, kein Zurück-Button. Wiederanlauf nach Neustart ohne Eingriff
- **F-55** Nach 60 Sekunden ohne Eingabe Rücksprung auf den Startbildschirm
- **F-56** Der komplette Weg von Startbildschirm bis eingetragenem Ergebnis darf höchstens 5 Taps und zwei Zahlen brauchen — das Terminal ist der Engpass, wenn mehrere Spiele gleichzeitig enden
- **F-57** MA-Funktionen am Terminal (Spiel absagen, altes Ergebnis ändern, Team zurückziehen) nur nach MA-PIN
- **F-58** Dauerhafte Anzeige des Verbindungsstatus: verbunden / offline mit Anzahl wartender Einträge
- **F-59** Das Terminal funktioniert vollständig offline (Kapitel 8)

### 4.8 Feldverwaltung — entfällt

Gestrichen. Die Software verwaltet keine Feldbelegung und zeigt nicht an, ob ein Feld frei ist. In einem Zeltlager mit 8- bis 14-Jährigen regeln die Teams vor Ort selbst, wer wann spielt.

Die Anforderungen F-60 bis F-63 sind ersatzlos gestrichen. Die Nummern bleiben frei, damit Verweise nicht verrutschen.

### 4.9 Daten

- **F-70** Turnier archivieren statt löschen
- **F-71** Export des kompletten Turniers als JSON, Wiederherstellung daraus möglich
- **F-72** Tägliches automatisches Backup auf USB-Stick

---

## 5. Datenmodell

Der Kern ist die **Slot-Referenz**. Ein Match kennt seine Teams nicht direkt, sondern über eine Quelle. Damit sind Single Elimination, Double Elimination, Gruppen und Liga dieselbe Struktur — nur die erzeugten Referenzen unterscheiden sich.

```
Tournament
  id, name, discipline, field_name, mode, config (JSON),
  match_duration_min, changeover_min (beide optional), max_teams (Standard 10),
  status (setup | running | finished | archived),
  created_at

Team                          -- kann auch eine Einzelperson sein
  id, tournament_id, name, seed, color, members[], withdrawn

Phase
  id, tournament_id, type (group | bracket_w | bracket_l | league | ladder),
  order, config

Match
  id, phase_id, round, index_in_round,
  slot_a (SlotRef), slot_b (SlotRef),
  team_a_id, team_b_id,          -- aufgelöst, sobald bekannt
  score_a, score_b,
  status, winner_id, loser_id,
  entered_at, entered_by_device,
  scheduled_at, best_of

SlotRef
  { type: "team",      team_id }
  { type: "winner_of", match_id }
  { type: "loser_of",  match_id }
  { type: "rank_of",   phase_id, rank }
  { type: "bye" }

Device
  id, name, role (terminal | display | admin), last_seen
  -- nicht mehr an ein Turnier gebunden

Event                          -- Sync-Queue, siehe Kapitel 8
  uuid, device_id, match_id, type, payload, created_at, applied_at

MatchLog
  id, match_id, actor, timestamp, field, old_value, new_value
```

**Auflösungsregel:** Wird ein Ergebnis eingetragen, sucht das System alle Matches, deren `slot_a` oder `slot_b` auf dieses Match zeigt, und trägt `team_a_id` bzw. `team_b_id` ein. Wird ein Ergebnis zurückgenommen, läuft dieselbe Suche rückwärts und leert die Slots samt ihrer Ergebnisse.

**Team ist bewusst turniergebunden.** Dieselbe Person kann in 8 Turnieren als 8 verschiedene Teams auftauchen. Das ist gewollt: keine Gesamtwertung, keine Personenverwaltung, keine Duplikatprüfung über Turniere hinweg.

---

## 6. Kernalgorithmen

### 6.1 Bracket-Erzeugung mit Freilosen

1. `p` = nächste Zweierpotenz ≥ `n`
2. Standard-Setzpositionen für `p` erzeugen (1 gegen p, 2 gegen p−1, usw.)
3. Positionen über `n` hinaus mit `{type: "bye"}` füllen
4. Matches mit einem Bye werden direkt als gewertet markiert, Sieger ist das reale Team

### 6.2 Loser-Bracket

- LB-Runden wechseln sich ab: eine Runde nur zwischen LB-Teams, die nächste gegen die frischen Verlierer aus dem WB
- Frische Verlierer werden gespiegelt eingesetzt (Kreuz-Regel aus 3.2)
- Der Verlierer des WB-Finales steigt in der letzten LB-Runde ein

### 6.3 Tabelle

Neuberechnung bei jedem eingetragenen Ergebnis, nicht inkrementell fortschreiben. Bei maximal 200 Spielen je Turnier ist ein voller Durchlauf schneller geschrieben und weniger fehleranfällig als eine Delta-Logik.

### 6.4 Spielzahl

Pro Disziplin gibt es ein Feld, alle Spiele laufen hintereinander. Der Engpass ist die Anzahl der Spiele.

| Teams | Single Elim. | Double Elim. | Gruppen + K.-o. | Liga |
|---|---|---|---|---|
| 4 | 3 | 6 | — | 6 |
| 6 | 5 | 10 | 9 (2×3, Top 4) | 15 |
| 8 | 7 | 14 | 15 (2×4, Top 4) | 28 |
| 10 | 9 | 18 | 23 (2×5, Top 4) | 45 |

F-03 zeigt diese Zahl vor dem Erzeugen des Spielplans. Sie reicht als Signal: 45 Spiele hintereinander auf einem Feld sind über eine Woche machbar, aber knapp — 9 Spiele am Tag, jeden Tag.

Sind Spieldauer und Wechselzeit gepflegt, rechnet das System zusätzlich:

```
Slotdauer      = Spieldauer + Wechselzeit
Benötigte Zeit = Anzahl Spiele × Slotdauer
```

Ohne diese Angaben zeigt es nur die Spielzahl. Eine Warnung oder Sperre gibt es nicht.

---

## 7. Nicht-funktionale Anforderungen

- **NF-01** Terminal bedienbar mit einer Hand, im Freien, bei Sonne: Schrift mindestens 20 px, Buttons mindestens 60 px
- **NF-02** Ergebniseingabe am Terminal in unter 20 Sekunden ab Startbildschirm
- **NF-03** Kein Datenverlust bei Neustart, Verbindungsabbruch oder leerem Akku während der Eingabe
- **NF-04** Zielgerät Terminal: altes Android-Handy ab Android 9, Browser-basiert, dauerhaft am Ladekabel
- **NF-05** Server ist ein Raspberry Pi im WLAN ohne Internet (Details 8.1)
- **NF-06** Ausdruck ausschließlich A4. Der Spielplan bleibt auf Papier vollständig nutzbar, wenn die Technik ausfällt (F-26 ist Pflicht). Bei einem einzigen Terminal ist Papier die einzige Rückfallebene
- **NF-07** Maximal 10 Teams je Turnier und 8 Turniere gleichzeitig. Größter Fall: Liga mit 10 Teams als Hin- und Rückrunde, 90 Matches. Über alle Turniere unter 800 Matches. Diese Datenmenge passt komplett in den Arbeitsspeicher — keine Pagination, kein Diffing, keine inkrementellen Updates
- **NF-08** Server-Neustart höchstens 60 Sekunden, ohne Datenverlust
- **NF-09** Ein kompletter Turnierstand ist wenige Kilobyte groß. Clients holen bei jeder Änderung den **ganzen** Zustand, nicht einzelne Deltas
- **NF-10** Das Terminal ist ein Einzelgerät und damit ein Engpass. Der Startbildschirm muss in unter 1 Sekunde stehen, auch wenn 8 Turniere laufen

---

## 8. Technischer Rahmen und Sync

**Stufe 1 braucht davon nichts.** Ein Laptop, eine SQLite-Datei, ein Drucker. Kein Server, kein WLAN, kein Sync. Wichtig ist nur, dass die Datenbankdatei täglich auf einen USB-Stick kopiert wird.

**Ab Stufe 2:** Ein Raspberry Pi als Server im lokalen WLAN. Das Terminal arbeitet offline-fähig und synchronisiert, sobald das WLAN wieder da ist. Weil derselbe Code auf Laptop und Pi läuft (Node plus SQLite), ist das ein Umzug, kein Umbau.

### 8.1 Hardware (Stufe 2)

- **H-01** Raspberry Pi 4 als Server, WLAN-Router ohne Internet, Terminal und Anzeige als Clients
- **H-02** **Speicher: USB-SSD oder USB-Stick, nicht die SD-Karte.** SD-Karten sterben bei Stromausfall im Schreibvorgang. Das ist im Lagerbetrieb der wahrscheinlichste Totalausfall
- **H-03** Datenbank: SQLite im WAL-Modus. Bei dieser Datenmenge reicht das vollständig
- **H-04** Autostart über systemd mit `Restart=always`
- **H-05** Feste IP für den Pi plus Hostname (z. B. `turnier.local`). Terminal und Anzeige zeigen dauerhaft auf diese Adresse. Aufruf per QR-Code-Aufkleber am schwarzen Brett
- **H-06** Backup: stündlich eine Kopie der Datenbank, täglich zusätzlich auf einen zweiten USB-Stick
- **H-07** Der Pi darf nicht ungeplant heruntergefahren werden. Empfohlen: kleine USV oder Powerbank mit Durchladefunktion
- **H-08** Terminal dauerhaft am Ladekabel, Display-Timeout aus, Kiosk-Browser im Autostart
- **H-09** Läuft auf demselben Pi noch andere Software (z. B. Kiosk-/Banksystem): eigener Port, eigener Dienst, eigene Datenbankdatei. Trade-off: ein Gerät weniger, aber ein gemeinsamer Ausfallpunkt

### 8.2 Warum der Sync hier einfach bleibt

Es gibt genau **ein** Terminal für alle Turniere — also genau einen schreibenden Client. Zwei Geräte können dasselbe Match nicht gleichzeitig verändern, außer ein MA greift korrigierend ein. Das macht den Sync zu einer simplen Warteschlange statt zu einem Merge-Problem.

### 8.3 Ablauf

- **A-01** Jede Eingabe am Terminal wird zuerst lokal gespeichert (IndexedDB) und als Event mit eigener UUID in eine Queue gelegt
- **A-02** Die App rechnet lokal weiter: Tabelle und Baum aktualisieren sich sofort, auch offline
- **A-03** Sobald Verbindung besteht, gehen die Events in Reihenfolge an den Server. Der Server ist die maßgebliche Quelle
- **A-04** Events sind idempotent. Ein doppelt gesendetes Event mit bekannter UUID wird verworfen
- **A-05** Konfliktfall (Server hat für dasselbe Match bereits ein abweichendes Ergebnis): Server behält seinen Stand, markiert das Match als *strittig* und zeigt es dem MA. Nichts wird still überschrieben
- **A-06** Nach dem Sync zieht das Terminal den vollständigen Stand vom Server und ersetzt seinen lokalen

### 8.4 Grenzen, die akzeptiert werden

- Offline geschriebene K.-o.-Ergebnisse schreiben lokal weiter. Eine spätere Admin-Korrektur kann ein lokal bereits gespieltes Folgespiel ungültig machen. Bewusster Trade-off — die Alternative wäre, offline keine Folgespiele freizugeben

- Die Anzeige ist nicht offline-fähig. Ohne WLAN zeigt sie den letzten Stand mit Zeitstempel

---

## 9. Screens

**Terminal (eines, am schwarzen Brett)**

1. Startbildschirm — Kacheln aller Disziplinen mit Status und Anzahl offener Spiele
2. Disziplin-Menü — Ergebnis eintragen / Spielplan
3. Offene Spiele — Liste
4. Ergebniseingabe — zwei Zähler, eine Bestätigung
5. Quittung — Rücksprung nach 5 Sekunden
6. Meine nächsten Spiele — Team antippen

**Admin / MA (eigenes Gerät)**

7. Turnierliste — alle Turniere mit Status und Fortschritt
8. Turnier anlegen — Wizard: Grunddaten → Modus → Teams → Kapazitätsvorschau
9. Teams — erfassen, importieren, zurückziehen
10. Turnierübersicht — Baum oder Tabelle
11. Korrektur und Protokoll
12. Strittige Spiele
13. Geräteverwaltung und Druck

**Anzeige**

14. Vollbild mit Rotation über alle Disziplinen

---

## 10. Abnahmekriterien

| # | Fall | Erwartung |
|---|---|---|
| T-1 | 3 Teams, Single Elimination | Freilos für Setzplatz 1, 2 Spiele, Hinweis auf Jeder-gegen-Jeden |
| T-2 | 6 Teams, Single Elimination | 2 Freilose, 5 Spiele |
| T-3 | 8 Teams, Double Elimination | 14 Spiele, kein Rematch in LB-Runde 1, Bracket Reset abschaltbar |
| T-4 | 8 Teams, Liga | 28 Spiele, alle sofort spielbar, Tabelle korrekt sortiert |
| T-5 | 8 Teams, 2 Gruppen + Halbfinale | 12 + 3 Spiele, Kreuz-Setzung greift |
| T-6 | 10 Teams, Liga | Vorschau zeigt 45 Spiele, bevor der Plan erzeugt wird. Keine Sperre, keine Warnung |
| T-7 | 11. Team erfassen | Wird abgelehnt (F-14) |
| T-8 | 10 Teams, Baum drucken | Passt vollständig auf eine A4-Seite quer, lesbar |
| T-9 | Team zieht nach zwei gespielten Spielen zurück | Offene Spiele als 1:0 für den Gegner gewertet, Tabelle und Baum bleiben stimmig |
| T-10 | Ergebnis im Viertelfinale nachträglich ändern | Warnung mit Liste der Folgespiele, danach zurückgesetzt |
| T-11 | Drei Teams punktgleich in einer Gruppe | Untertabelle aus deren direkten Spielen entscheidet |
| T-12 | Spiel bis Deadline nicht gespielt | Wertung nach Regel, Tabelle stimmt |
| T-13 | 8 Turniere laufen, Terminal öffnen | Startbildschirm in unter 1 Sekunde, alle 8 Kacheln |
| T-14 | Terminal 2 h offline, 8 Ergebnisse eingetragen | Alles landet in richtiger Reihenfolge auf dem Server, keine Dublette |
| T-15 | Terminal offline, gleichzeitig Admin korrigiert dasselbe Match | Match wird *strittig*, kein stilles Überschreiben |
| T-16 | Terminal-Neustart mitten in der Eingabe | Startbildschirm, kein halbes Ergebnis in der Queue |
| T-17 | Nachmeldung vor dem ersten Ergebnis | Spielplan wird neu erzeugt, alte Paarungen verworfen |
| T-18 | Pi während eines Schreibvorgangs vom Strom trennen | Nach Neustart Datenbank intakt, höchstens das letzte Ereignis fehlt |
| T-19 | 12 handschriftliche Ergebnisse nacherfassen | Rein über die Tastatur, ohne Maus, unter 2 Minuten |
| T-20 | Nachdruck nach der Nacherfassung | Neues Stand-Datum, erledigte Spiele markiert, offene leer |
| T-21 | Sammeldruck bei 8 laufenden Turnieren | Ein Befehl, ein PDF, alle Disziplinen hintereinander |
| T-22 | Aushang zwei Tage nicht erneuert | Blatt bleibt benutzbar: alle Restspiele stehen drauf, Ergebnisse passen von Hand daneben |

---

## 11. Umsetzungsreihenfolge

**Stufe 1 — bis zum diesjährigen Lager**

1. Datenmodell und Slot-Auflösung (Kapitel 5) — ohne das ist alles andere Wegwerfcode
2. Turnier anlegen, Teams erfassen, Spielzahl-Vorschau (4.1, 4.2, 6.4)
3. Liga und Single Elimination inklusive Freilose
4. Ergebnisfluss: eintragen, korrigieren mit Kaskade, Protokoll
5. Nacherfassung am Laptop (F-38) — der meistgenutzte Bildschirm in Stufe 1
6. Tabelle und Tiebreaker
7. **Druckvorlagen A4 mit Stand-Datum (F-26 bis F-29)** — in Stufe 1 die einzige Schnittstelle zu den Teams. Wenn nur eine Sache richtig gut wird, dann diese
8. Rückzug und kampflose Wertung (F-18)
9. Baum- und Tabellenansicht am Laptop
10. Gruppenphase + K.-o.
11. Export und Backup (F-70 bis F-72)

**Stufe 2 — bis zum Lager im Folgejahr**

12. Server auf dem Pi, Event-Queue, Offline-Betrieb (Kapitel 8)
13. Terminal-App auf dem Tablet (4.7)
14. Anzeige-Vollbild mit Rotation (F-42, F-43)
15. Double Elimination
16. Schweizer System und Ladder — nur, wenn wirklich gebraucht

---

## 12. Entschiedene Punkte

| # | Frage | Entscheidung |
|---|---|---|
| O-1 | Eigenständig oder Modul? | Eigenständige Software |
| O-2 | Technischer Rahmen | Pi im lokalen WLAN, Terminal offline-fähig mit Event-Sync |
| O-3 | Wer trägt Ergebnisse ein? | Die Teams selbst, am gemeinsamen Terminal |
| O-4 | Anzahl Felder | Ein Feld pro Disziplin, alle Spiele hintereinander |
| O-5 | Mehrere Turniere gleichzeitig? | Ja, maximal 8 |
| O-6 | Anzeige öffentlich? | Nein, nur im lokalen Netz |
| O-7 | Teams turnierübergreifend? | Nein. Anmeldung pro Turnier, keine Gesamtwertung. Einzelspieler sind Teams mit einem Mitglied |
| O-8 | Wie viele Disziplinen parallel? | Maximal 8 |
| O-9 | Betrugssicherung? | Keine. Fair Play, dafür Protokoll und öffentliche Anzeige |
| O-10 | Terminals | Ein einziges Terminal am schwarzen Brett für alle Disziplinen |
| O-11 | Anmeldung | Im Vorfeld über Papierlisten. Die Software erfasst nur die fertige Liste |
| — | Feldverwaltung | Entfällt. Die Teams regeln vor Ort selbst, wer wann spielt |
| — | Teamzahl | Maximal 10 Teams je Turnier |
| O-16 | Wer erfasst die Papierergebnisse nach? | Eine einzelne Person. Daraus folgen Sammeldruck (F-39) und ein Aushang, der auch veraltet noch funktioniert |
| O-17 | Wie oft wird neu ausgehängt? | Einmal täglich zu fester Zeit |
| O-14 | Eigener Bildschirm für die Anzeige? | Stufe 1 dieses Jahr nur Papierlisten. Ab nächstem Jahr Tablet als Terminal plus eigener Bildschirm |
| O-12 | Spieldauer je Disziplin | Wird nicht gepflegt. F-04 entfällt, F-03 zeigt nur die Spielzahl |
| O-13 | Wer entscheidet Streitfälle? | Der Admin (F-49) |
| O-15 | Wertung kampfloser Spiele | 1:0 für den Gegner |

## 13. Offene Punkte

Keine. Alle Entscheidungen stehen in Kapitel 12. Änderungen laufen über eine neue Version dieses Dokuments.

Das größte verbleibende Risiko liegt nicht in den Anforderungen, sondern im Layout: In Stufe 1 **ist** der A4-Aushang die Benutzeroberfläche. Es lohnt sich, ihn als Papierentwurf zu zeichnen, bevor Code entsteht — Spaltenbreiten, Kästchengröße für Handschrift, Position von Tabelle und Restprogramm auf einem Blatt.
