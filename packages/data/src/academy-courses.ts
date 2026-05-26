/**
 * TGE Academy — agent-training course content.
 *
 * Source: material the client (Transilvania Grand SRL) supplied for the
 * Academy "rubrici" (sections): Legislație, AI, Proceduri de lucru, Ghidul
 * vânzărilor. Each top-level entry becomes a `Course`; each lesson a `Lesson`.
 *
 * Content is **Romanian markdown** (the Academy student view renders markdown
 * via `MarkdownView`). Romanian text MUST keep full diacritics (ă â î ș ț).
 * Only the `ro` locale is authored here — the API's locale fallback serves
 * `ro` for any other requested locale and flags it as a pending translation.
 *
 * The Prisma `localizedRichTextSchema` requires both `ro` and `en` when a
 * payload is validated by Zod, but the seed writes these straight to the
 * Prisma JSON columns (no Zod gate), so `ro`-only is intentional and safe.
 *
 * Courses are seeded `status: 'published'`, `visibility: 'enrolled'` — visible
 * only to agents who hold an AcademyEnrollment (wildcard `courseId: null`
 * granted at invitation time covers all current + future courses).
 *
 * NOT included yet (pending client delivery): "Fundamentele Imobiliarelor"
 * (content never supplied) and the printable contract drafts (uploaded as
 * lesson attachments via the admin UI once received).
 */

export interface AcademyLessonSeed {
  slug: string;
  /** Sparse order within the course (10, 20, 30…). */
  order: number;
  title: { ro: string };
  excerpt: { ro: string };
  /** Markdown body. */
  content: { ro: string };
  type?: "text" | "video";
}

export interface AcademyCourseSeed {
  slug: string;
  /** Sparse order in the catalog (10, 20, 30…). */
  order: number;
  title: { ro: string };
  description: { ro: string };
  lessons: AcademyLessonSeed[];
}

export const academyCourses: AcademyCourseSeed[] = [
  // ─────────────────────────────────────────────────────────────
  // 1. Legislație Imobiliară
  // ─────────────────────────────────────────────────────────────
  {
    slug: "legislatie-imobiliara",
    order: 10,
    title: { ro: "Legislație Imobiliară" },
    description: {
      ro: "Cele cinci legi fără de care nu ieși din birou, plus clauzele din contractul de vânzare-cumpărare care te scot din proces. Comisionul mare vine din încredere, încrederea vine din siguranță, iar siguranța vine din lege.",
    },
    lessons: [
      {
        slug: "gdpr-legea-190-2018",
        order: 10,
        title: { ro: "Legea 190/2018 + GDPR — Datele clientului nu sunt ale tale" },
        excerpt: {
          ro: "Nume, telefon, buletin, venit, extras CF — toate sunt date cu caracter personal. Le iei doar cu consimțământ scris și scop clar.",
        },
        content: {
          ro: `## Ce zice legea

Orice nume, telefon, buletin, venit sau extras CF reprezintă **date cu caracter personal**. Le poți prelucra doar cu **consimțământ scris** și un **scop clar**.

## Greșeala de amator

Dai numărul proprietarului la 3 cumpărători „să se înțeleagă între ei". Sau postezi pe grup poze din casă cu actele pe masă.

## Ce face un agent de top

1. **Acord GDPR semnat** la prima vizionare. Fără el, nu deschizi ușa.
2. **Anonimizezi** când trimiți oferte pe WhatsApp. Ștergi numele din pozele CF.
3. **Ștergi datele** la 30 de zile dacă nu se semnează.

## Amenda

Până la **4% din cifra de afaceri**. ANPC și ANSPDCP nu iartă.`,
        },
      },
      {
        slug: "legea-129-2019-spalarea-banilor",
        order: 20,
        title: { ro: "Legea 129/2019 — Spălarea banilor te bagă la închisoare pe tine" },
        excerpt: {
          ro: "Ești entitate raportoare. Orice tranzacție peste 10.000 EUR cash sau suspectă se raportează la ONPCSB în 24h.",
        },
        content: {
          ro: `## Ce zice legea

Ești **entitate raportoare**. Orice tranzacție peste **10.000 EUR cash** sau suspectă se raportează la **ONPCSB în 24h**.

## Greșeala de amator

„Lasă, șefu', că dă tataie 50.000 EUR cash, om serios." Tu iei comisionul și intri complice.

## Ce face un agent de top

1. **Cunoaște-ți clientul (KYC)**: copie CI, verifici beneficiarul real dacă e firmă.
2. **Refuzi cash peste 10.000 EUR.** Punct. Legea 70/2015 interzice — doar bancar.
3. **Raportezi suspiciuni**: client grăbit, preț umflat sau prea ieftin, nu-l interesează actele, plătește altcineva.

## Riscul

**3–10 ani închisoare** + interdicție de profesie. Nu merită 2% comision.`,
        },
      },
      {
        slug: "legea-196-2018-contract-intermediere",
        order: 30,
        title: { ro: "Legea 196/2018 — Contractul de intermediere e scutul tău" },
        excerpt: {
          ro: "Fără contract scris nu poți cere comision legal. Înțelegerea verbală înseamnă 0 lei în instanță.",
        },
        content: {
          ro: `## Ce zice legea

Fără **contract scris** nu poți cere comision legal. „Înțelegerea verbală" = **0 lei în instanță**.

## Greșeala de amator

Arăți 20 de case fără contract. Clientul cumpără direct cu proprietarul. Tu rămâi cu benzina consumată.

## Ce face un agent de top

1. **Contract de intermediere** (exclusiv sau neexclusiv) semnat **înainte** de prima vizionare.
2. **Clauză clară**: comision %, când se datorează, pe ce perioadă.
3. **Fișă de vizionare semnată** la fiecare casă — dovada că tu l-ai dus acolo.

## Fără asta

Muncești gratis. Instanța râde de tine.`,
        },
      },
      {
        slug: "cod-civil-vicii-ascunse",
        order: 40,
        title: { ro: "Codul Civil (art. 1650–1762) — Vicii ascunse = proces pe numele tău" },
        excerpt: {
          ro: "Vânzătorul răspunde de vicii ascunse 3 ani. Dacă tu știai și n-ai zis, clientul te dă în judecată pentru dol.",
        },
        content: {
          ro: `## Ce zice legea

Vânzătorul răspunde de vicii ascunse **3 ani**. Dar dacă tu știai de igrasie și n-ai spus, clientul te dă în judecată **pe tine** pentru dol.

## Greșeala de amator

„Da, șefu', e super apartament, ia-l." Peste 2 luni curge tavanul. Clientul: „agentul m-a mințit".

## Ce face un agent de top

1. **Due diligence minim**: ceri extras CF nou, certificat fiscal, certificat energetic, releveu.
2. **Declari ce știi în scris**: „Clientul a fost informat de urme de igrasie în baie." Semnează.
3. **Nu garantezi nimic**: tu nu ești constructor. „Din ce văd eu" + „verificați cu un expert".

## Protecție

**Asigurare de răspundere profesională** — obligatorie dacă ești serios.`,
        },
      },
      {
        slug: "oug-21-1992-publicitate-inselatoare",
        order: 50,
        title: { ro: "OUG 21/1992 + Legea 296/2004 — Publicitatea înșelătoare te arde" },
        excerpt: {
          ro: "Anunțul trebuie să fie 100% real: metri, preț, dotări, poze actuale. ANPC te face praf altfel.",
        },
        content: {
          ro: `## Ce zice legea

Anunțul trebuie să fie **100% real**: metri, preț, dotări, poze actuale.

## Greșeala de amator

Pui „metrou 2 min" când e 15 min pe jos. Sau „centrală nouă" din 2008. Sau poze randate când blocul e în șantier. ANPC te face praf.

## Ce face un agent de top

1. **Verifici personal**: mergi pe jos la metrou cu cronometrul. Măsori camerele.
2. **Poze reale, dată recentă**: fără wide-angle care dublează camera, fără „mobilă doar decor".
3. **Preț final**: treci în anunț dacă e negociabil + comision inclus sau nu.

## Amenda ANPC

**5.000 – 100.000 lei**, plus plângere penală pentru înșelăciune.

---

## Bonus: Cele 3 documente fără care NU vinzi

| Document | De ce îl ceri | Cine îl dă |
|---|---|---|
| **Extras CF de informare** | Să nu vinzi ce nu e al lui; vezi ipoteci, procese, intabulare | Proprietarul, de la ANCPI, max. 30 zile vechime |
| **Certificat fiscal** | Fără datorii la stat; notarul nu face actul fără el | Proprietarul, de la primărie |
| **Certificat energetic** | Obligatoriu la vânzare/închiriere din 2013 | Proprietarul, de la un auditor energetic |

**Regula de aur:** fără acte, nu pui la vânzare. Punct.`,
        },
      },
      {
        slug: "contract-vanzare-cumparare-clauze",
        order: 60,
        title: { ro: "Contractul de Vânzare-Cumpărare — Clauzele care te scot din proces" },
        excerpt: {
          ro: "Notarul face actul, dar tu aduci părțile la masă. Patru clauze care te protejează pe tine și pe client.",
        },
        content: {
          ro: `Notarul face actul, dar tu aduci părțile la masă. Dacă semnează o prostie, clientul te sună pe tine primul. Cere **4 clauze** care te protejează.

## 1. Clauza de comision — să-ți iei banii fără să cerșești

> „Comisionul agenției, în cuantum de X% + TVA din prețul final, este datorat și exigibil la data semnării prezentului contract de vânzare-cumpărare. Părțile mandatează notarul public să rețină și să vireze comisionul din prețul tranzacției."

Notarul oprește banii tăi direct din tranzacție. Nu mai alergi după nimeni.

## 2. Clauza „Văzut și plăcut" + declarație vicii aparente

> „Cumpărătorul declară că a vizionat imobilul personal în data de…, a luat la cunoștință de starea acestuia și îl dobândește în starea «văzut și plăcut», menționând următoarele vicii aparente: [...]. Vânzătorul declară pe proprie răspundere că nu cunoaște alte vicii ascunse."

Ai dovada scrisă că clientul a văzut defectele (art. 1707 Cod Civil).

## 3. Clauza de preț real + metoda de plată — anti-ANAF, anti-ONPCSB

> „Prețul total și real al vânzării este de XXX EUR. Plata se face integral prin transfer bancar în contul IBAN… pe numele vânzătorului. Părțile declară, sub sancțiunea art. 326 Cod Penal privind falsul în declarații, că prețul este cel real și nu există alte înțelegeri nedeclarate."

Te scoți din schema lor. Dacă fac prostii, e pe declarația lor, nu pe pielea ta.

## 4. Clauza de predare + penalități

> „Predarea efectivă a imobilului, liber de orice bunuri și persoane, se face în termen de maxim 3 zile de la încasarea integrală a prețului, pe bază de proces-verbal. Pentru fiecare zi de întârziere, vânzătorul datorează penalități de 0,1% pe zi din prețul total."

---

## 3 Red Flags la antecontract pe care NU le semnezi

| Clauza otrăvită | De ce fugi | Ce ceri în loc |
|---|---|---|
| „Se vinde cum este" fără listă de vicii | Îți asumă clientul toate bombele ascunse | Listă detaliată de vicii + „vânzătorul nu cunoaște altele" |
| „Avansul se pierde dacă banca nu dă credit" | Clientul rămâne și fără casă, și fără avans | „Avansul se restituie integral dacă respingerea nu e din culpa cumpărătorului" |
| „Comision 0 la agenție" | Una din părți te lucrează | Refuzi tranzacția |`,
        },
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 2. AI pentru Agenți Imobiliari
  // ─────────────────────────────────────────────────────────────
  {
    slug: "ai-pentru-agenti",
    order: 20,
    title: { ro: "AI pentru Agenți Imobiliari" },
    description: {
      ro: "Cum transformi inteligența artificială într-un coleg de echipă care nu obosește niciodată. Mai mult timp pentru clienți, decizii bazate pe date și marketing fără efort — fără să-ți pierzi vocea și autenticitatea. TGE și Adorya recomandă AI-ul pentru creșterea performanței.",
    },
    lessons: [
      {
        slug: "cum-ai-ul-transforma-viata-agentului",
        order: 10,
        title: { ro: "Cum AI-ul poate transforma viața unui agent imobiliar" },
        excerpt: {
          ro: "Mai mult timp pentru clienți, mai puțin stres. AI-ul preia sarcinile repetitive ca tu să te concentrezi pe întâlniri și pe închiderea tranzacțiilor.",
        },
        content: {
          ro: `## Mai mult timp pentru clienți, mai puțin stres

Ca agent imobiliar, fiecare minut contează. AI-ul poate prelua sarcini repetitive:

- Scrierea email-urilor de follow-up
- Generarea descrierilor de proprietăți sub marca **TGE** și **Adorya**
- Programarea vizitelor și remindere pentru clienți

Astfel ai mai mult timp pentru ceea ce aduce valoare reală: **întâlnirile față-în-față și închiderea tranzacțiilor**.

> **Exemplu practic:** un agent folosește AI-ul pentru a genera descrieri atractive pentru 10 proprietăți noi într-o oră. În mod normal i-ar fi luat o zi întreagă.

## Decizii mai inteligente, bazate pe date

AI-ul poate analiza sute de tranzacții, trenduri de piață și comportamentul clienților. Pentru tine asta înseamnă:

- Alegerea prețului optim pentru listări
- Identificarea zonelor cu potențial de creștere
- Personalizarea mesajelor către clienți

**Tip:** folosește rapoartele generate de AI ca să arăți clienților că propunerile tale sunt bazate pe date reale, nu doar pe intuiție.

## Marketing și vizualuri fără efort

AI-ul poate genera texte atractive pentru anunțuri, crea vizualuri și prezentări, chiar și video-uri scurte de promovare marca TGE și Adorya.

**Sfaturi:**
- Folosește AI pentru draft-uri, dar personalizează mesajele cu experiența ta și sub mărcile TGE și Adorya.
- Adaugă întotdeauna detalii reale despre proprietate și zonă.
- Combină AI-ul cu fotografii proprii sau tururi 3D pentru impact profesional.`,
        },
      },
      {
        slug: "unelte-ai-mituri-vs-realitate",
        order: 20,
        title: { ro: "Unelte AI utile + Mituri vs Realitate" },
        excerpt: {
          ro: "O listă de unelte AI pentru agenți și demontarea miturilor frecvente. Începe cu un singur tool, testează-l, personalizează, apoi treci la următorul.",
        },
        content: {
          ro: `## Lista de unelte AI utile

| Unealtă | Ce face |
|---|---|
| **ChatGPT / OpenAI** | Texte pentru email-uri și descrieri de proprietăți |
| **Copy.ai** | Marketing & social media (postări, newslettere) |
| **Jasper.ai** | Copywriting profesionist, titluri, texte SEO |
| **Canva AI** | Design și vizualuri (bannere, prezentări) |
| **Pictory** | Transformă texte în videoclipuri subtitrate |
| **DALL·E / Midjourney** | Creare vizualuri și imagini pentru marketing |
| **Otter.ai** | Transcriere apeluri și întâlniri cu clienți |
| **Trello + Butler** | Automatizare task-uri și remindere |

**Cum le folosești inteligent:** începe cu un singur tool, testează-l, personalizează ce generează, apoi treci la următorul. Nu e nevoie să le folosești pe toate simultan.

## Mituri vs Realitate

| Mit | Realitate |
|---|---|
| AI-ul va înlocui agenții | Nu poate înlocui experiența, empatia și negocierile |
| Clienții vor simți că ești „fake" | Folosit corect, doar economisește timp |
| Trebuie să fii expert în tehnologie | Tool-urile sunt intuitive, chiar pentru începători |
| AI-ul e scump | Sunt multe variante gratuite sau trial |
| AI-ul dă soluții perfecte din prima | Generează sugestii — trebuie filtrate și adaptate la contextul local |

## Cum să nu pari „fake"

- **Personalizează** fiecare mesaj generat de AI — adaugă detalii specifice despre proprietăți și clienți. **TGE și Adorya trebuie să facă parte din script.**
- **Păstrează vocea ta** — AI-ul sugerează textul, dar tu îl semnezi și îl transmiți.
- **Fii transparent**: „Am folosit un instrument AI ca să economisesc timp, dar toate detaliile sunt verificate de mine."
- **Echilibrul om + AI** — relația umană rămâne cheia.
- **Testează mereu** — verifică descrierile, prețurile și informațiile înainte de a le folosi public.`,
        },
      },
      {
        slug: "ai-ul-si-social-media",
        order: 30,
        title: { ro: "AI-ul și Social Media" },
        excerpt: {
          ro: "Research rapid, idei de postări pentru feed/reels/stories și un calendar editorial pe 30 de zile. Consistența construiește brandul.",
        },
        content: {
          ro: `Social media este astăzi principalul canal prin care clienții îți descoperă serviciile. AI-ul poate face research, genera idei de postări și organiza un plan editorial.

## 1. Research rapid pentru conținut

AI-ul poate:
- analiza trendurile din real estate (ex.: „care sunt zonele în creștere în orașul tău?");
- identifica întrebările frecvente ale clienților („cum se calculează comisionul?", „cum verific actele?");
- propune hashtag-uri și titluri atractive.

## 2. Idei de postări pentru feed, reels și stories

Cere AI-ului **scripturi de 30–60 secunde** pentru reels, ca să filmezi rapid cu telefonul. Exemplu: un tur scurt al unei proprietăți, cu text suprapus și voce-off.

## 3. Plan de creștere și calendar de postări

Un brand crește prin **consistență**. AI-ul îți poate organiza conținutul într-un plan pe 30 de zile, cu:
- frecvența de postare (ex.: 3 postări/săptămână + stories zilnice);
- tematici variate (educațional, personal, motivațional, promoțional);
- call-to-action clare („Scrie-mi în privat pentru o evaluare gratuită").

## De ce merită

- **Economisești timp** — zeci de idei în câteva secunde.
- **Consistență** — ai conținut pregătit chiar și în perioadele aglomerate.
- **Vizibilitate** — folosind trenduri și formate potrivite (reels, stories, carusele).

> **Sarcină practică:** ia-ți 30 de minute pe zi și „joacă-te" cu un AI diferit în fiecare zi a săptămânii. Întreabă-ți cunoștințele dacă își dau seama că e făcut cu AI. Când nu vor sesiza — te-ai prins.

**Important:** toate postările se fac pe platformele sociale care aparțin Transilvania Grand Estate și Adorya. Postările se trimit către Agenție spre verificare și sunt încărcate de personalul Agenției.`,
        },
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 3. Proceduri de Lucru (Fluxul Agentului)
  // ─────────────────────────────────────────────────────────────
  {
    slug: "proceduri-de-lucru",
    order: 30,
    title: { ro: "Proceduri de Lucru — Fluxul Agentului" },
    description: {
      ro: "Ce are de făcut agentul colaborator, cap-coadă. Fluxul de dezvoltare a portofoliului (preluarea proprietăților), fluxul de vânzare a proprietăților din portofoliu, scriptul de apel și modelul de raport de piață. REBS este coloana vertebrală peste tot.",
    },
    lessons: [
      {
        slug: "flux-dezvoltare-portofoliu",
        order: 10,
        title: { ro: "Fluxul de dezvoltare a portofoliului (preluarea proprietăților)" },
        excerpt: {
          ro: "Pentru vânzători, logica e ca agentul să ia controlul pe imobil, pe preț și pe proces. Nouă pași, de la prospectare la post-vânzare.",
        },
        content: {
          ro: `Pentru vânzători, logica e ca agentul să ia controlul pe **imobil, pe preț și pe proces**.

## 1. Prospectare — de unde vin proprietarii
Scanezi zilnic anunțurile vechi/neactive de pe OLX, Storia, publicații notariale. Cauți „vând direct" și „fără agenție". Suni cu scriptul: „Am 3 cumpărători pentru zona dvs., vreți o evaluare gratuită?".
**Folosești:** REBS (import lead-uri vânzători), Google Alerts, Drive (follow-up). **Documente:** niciunul; notezi sursa în REBS.

## 2. Primul contact — obții întâlnirea
Nu vinzi serviciile, vinzi rezultatul: „Vă spun în 20 min cât se vinde real azi, pe baza a 12 tranzacții similare". Programezi întâlnirea **la imobil**.
**Folosești:** WhatsApp Business cu catalog, REBS, Canva (1-pager). **Documente:** confirmarea întâlnirii.

## 3. Calificare — nu pierzi timpul
Întrebi: 1) Motivația reală de vânzare? 2) Aveți actele complete? 3) Prețul dorit? 4) Sunteți dispus la exclusivitate? 5) Cine ia decizia finală?
**Documente:** copie CI, copie act proprietate doar pentru verificare rapidă la fața locului.

## 4. Evaluare & Contract — îți iei mandatul
Faci evaluarea pe loc cu CMA din REBS. Prezinți 3 scenarii (preț rapid, de piață, „de vis"), recomanzi prețul de piață, propui exclusivitate 90 de zile.
**Documente:** contract de intermediere în exclusivitate, anexa foto/video, extras CF <24h, copie act proprietate, CI proprietar, certificat fiscal.

## 5. Marketing & Vizualizare
Programezi foto/video profesional în 48h. Scrii anunțul în REBS, publici pe TGE (premium) și Adorya (volum), sincronizezi pe Storia, OLX, Imobiliare.ro.
**Documente:** acord foto/video, certificat energetic comandat, declarație utilități la zi.

## 6. Oferte & Negociere — controlezi procesul
Toate ofertele vin la tine. Nu dai numărul proprietarului. Prezinți oferta în scris + contraargumente bazate pe CMA. Loghezi tot în REBS.
**Documente:** foaie de ofertă semnată, accept/refuz scris.

## 7. Antecontract — securizezi tranzacția
Redactezi antecontractul din template-ul avizat. Verifici clauzele și extrasul CF. Programezi notarul și trimiți dosarul cu 48h înainte.
**Documente:** antecontract, dovada avans, extras CF, certificat fiscal, certificat energetic, act proprietate.

## 8. Notar — închizi corect
Ești prezent. Verifici prețul, modalitatea de plată, clauza de ridicare ipotecă și comisionul agenției. Încasezi comisionul la semnare, conform facturii.
**Documente:** act de vânzare, factură comision, proces-verbal predare-primire chei.

## 9. Post-vânzare — transformi vânzătorul în sursă de lead-uri
La 7 zile suni („Au intrat banii? Tot ok?"). La 30 de zile ceri review pe Google și 3 recomandări.
**Documente:** formular de feedback, acord testimonial, chitanță predare acte.

---

## TGE vs Adorya (pe vânzători)
- **TGE:** doar proprietăți >500k EUR, acte curate, exclusivitate minim 90 de zile. Tu controlezi prețul și marketingul.
- **Adorya:** accepți și non-exclusivitate, dar prioritizezi mandatele exclusive. Mai mult volum, marjă mai mică.
- Proprietățile de pe TGE se publică și pe Adorya.

**REBS blochează publicarea** până nu ai extras CF și contractul de intermediere uploadate.

> **Atenție!** Nu se semnează niciun contract de exclusivitate dacă actele nu sunt în regulă, dacă proprietarul vrea să ascundă viciile sau să forțeze practici neloiale. Verificarea amănunțită a imobilului este în sarcina agentului. Proprietățile tranzacționate trebuie să mulțumească viitorii cumpărători — pentru o bună reputație și ca principiu etic.`,
        },
      },
      {
        slug: "flux-vanzare-portofoliu",
        order: 20,
        title: { ro: "Fluxul de vânzare a proprietăților din portofoliu" },
        excerpt: {
          ro: "Opt pași, de la lead-ul intrat în REBS până la post-vânzare. Dacă nu e logat în CRM, nu s-a întâmplat.",
        },
        content: {
          ro: `REBS e coloana vertebrală peste tot.

## 1. Prospectare — de unde vin lead-urile
Verifici zilnic lead-urile din REBS de pe TGE și Adorya. Prioritizezi lead-urile TGE (scor mai mare, precalificate). Suni în max. 5 min de la primire.

## 2. Primul contact — script și obiectiv
Confirmi nevoia în 90 sec. Nu vinzi imobilul la telefon — obiectivul e **vizionarea** sau apelul video. Pe WhatsApp trimiți 2-3 poze + link-ul TGE/Adorya cu watermark.

## 3. Calificare
Pui 6 întrebări în max. 4 min: buget aprobat? finanțare (cash/ipotecar/prima casă)? zona și suprafața minimă? deadline de mutare? cine decide? a mai văzut cu altă agenție? Completezi scorul A/B/C în REBS.
**Documente:** preaprobare bancară sau declarație de capacitate financiară. Nu te baza pe „am banii".

## 4. Vizionare — ce ceri și ce verifici
Trimiți contractul de vizionare pe WhatsApp cu 30 min înainte. La fața locului verifici CI, faci poza cu clientul în fața imobilului, completezi procesul-verbal. Încarci tot în REBS.
**Documente:** contract de vizionare, CI client, proces-verbal de vizionare; pentru TGE/Adorya și extrasul CF <24h.

## 5. Negociere — fără să te arzi
Nu transmiți contraoferta verbal — o pui în scris (email/WhatsApp) și o loghezi în REBS. Folosești CMA-ul ca argument. Dacă ai exclusivitate, negociezi prețul proprietarului, nu comisionul tău.
**Documente:** foaie de contraofertă semnată de ambele părți.

## 6. Antecontract — cine semnează ce și ordinea
Redactezi din template-ul avizat. Ordinea: 1) clientul citește, 2) semnează clientul, 3) semnează proprietarul, 4) încasezi avansul **în contul firmei**, nu cash. Încarci dovada în REBS.
**Documente:** antecontract, dovada avans, extras CF, CI părți, certificat energetic, act proprietate.

## 7. Notar — ce duci și ce verifici
Trimiți dosarul complet cu 48h înainte. Verifici datele părților, prețul, modalitatea de plată, clauza de ridicare ipotecă, comisionul agenției. Rămâi până la semnare.
**Documente:** act de vânzare, factură comision, dovadă plată comision.

## 8. Post-vânzare — follow-up și recomandare
La 7 zile suni „Totul ok?". La 30 de zile ceri review pe Google și recomandări. Marchezi în REBS „Închis + Referral".

---

> **Antecontract vs Contract:** antecontractul de vânzare-cumpărare se folosește când cumpărătorul dă doar un avans (ex.: credit — banca virează banii în 3-4 săptămâni). Comisionul se încasează în contul agenției **la semnarea antecontractului**. Dacă cumpărătorul virează suma integrală, nu mai e nevoie de antecontract — se încheie direct contractul de vânzare-cumpărare la notar, iar comisionul se plătește la încheierea contractului.

**Regula de aur în REBS:** dacă nu e logat în CRM, nu s-a întâmplat. Fără log nu poți dovedi munca ta în fața comisioanelor disputate.`,
        },
      },
      {
        slug: "script-apel-si-obiectii",
        order: 30,
        title: { ro: "Scriptul apelului telefonic + gestionarea obiecțiilor" },
        excerpt: {
          ro: "Scriptul îți dă întâlnirea la imobil în 90% din cazuri dacă proprietarul e motivat. Ține 2 minute.",
        },
        content: {
          ro: `## Scriptul de bază — apel de ieșire

**Tu:** „Bună ziua, mă numesc [Nume], sunt de la Transilvania Grand SRL / TGE / Adorya. Sun legat de imobilul din [Zonă/Stradă] pe care îl aveți de vânzare. Am 2 min să vă spun de ce vă sun?"

**El:** „Da / Spuneți."

**Tu:** „Lucrez zilnic cu cumpărători în zona asta. Înainte să vă pierd timpul, am 2 întrebări rapide: 1) Imobilul e încă de vânzare? 2) Dacă vă spun în 20 min cât se vinde azi în zonă, pe baza a 12 tranzacții reale din ultimele 3 luni, aveți 20 min să ne vedem la imobil mâine sau poimâine?"

> **De ce merge:** dai valoare imediată (evaluarea reală). Nu vinzi „servicii", vinzi un rezultat concret.

## Obiecții și răspunsuri scurte

**„Vând singur, nu vreau agenție"** → „Perfect, respect asta. Nu vă cer exclusivitate la telefon. Vin, vă arăt cum fac evaluarea și decideți dvs. Dacă nu vă ajută, rămâneți cu informația gratis. Vă convine mâine la 18:00?"

**„Am deja agenție"** → „Aveți exclusivitate cu ei? Dacă nu, pot să vă aduc cumpărători în plus fără cost extra. Dacă da, vă fac o a doua opinie pe preț, tot gratis."

**„Cât e comisionul?"** → „Discutăm asta doar după ce vă arăt ce cumpărători am și cum poziționăm imobilul. Dacă nu vă convine planul, nu lucrăm. E corect?"

**„Trimiteți-mi pe WhatsApp oferta"** → „Pot, dar evaluarea se face pe loc — văd actele, poziția, lumina. Altfel vă dau un preț greșit. Îmi dați 20 min mâine la imobil?"

**„E prea scump, nu am timp acum"** → „Nu vin să vă vând nimic. Vin 15 min să vă las raportul de piață. Dacă nu vă folosește, îl aruncați."

## Regulile de aur

1. **Nu dai prețul la telefon.** „Prețul îl stabilim pe loc, după ce văd actele și starea." Nu dai nici comisionul la telefon.
2. **Obiectivul e întâlnirea**, nu vânzarea. Dacă stai >3 min la telefon, ai pierdut.
3. **Propune 2 sloturi concrete**: „Mâine 18:00 sau poimâine 10:00?" Nu întreba „când vă convine".
4. **Confirmă pe WhatsApp imediat**: „Confirmat mâine 18:00 la [adresă]. Vin cu raportul de piață."

## Ce faci după apel
- Loghezi în REBS: „Contactat, întâlnire programată".
- Trimiți pe WhatsApp confirmarea + portofoliul tău.
- Pui reminder în REBS cu 2h înainte.`,
        },
      },
      {
        slug: "raportul-de-piata-model",
        order: 40,
        title: { ro: "Raportul de piață — model (instrument interactiv)" },
        excerpt: {
          ro: "O pagină, 3 cifre, 1 plan = semnătură. Folosește instrumentul interactiv din Academy ca să-l completezi, printezi și trimiți pe email/WhatsApp.",
        },
        content: {
          ro: `Raportul de piață e arma ta de închidere a mandatului. Îl lași proprietarului la întâlnire.

> **Instrument interactiv:** completează raportul direct în Academy, la pagina **Raport de piață** (din meniu). Îl poți printa / salva ca PDF și trimite pe email sau WhatsApp.

## Structura recomandată

**1. Concluzie în 3 rânduri** — pe baza a 12 tranzacții similare din ultimele 90 de zile pe o rază de 500 m, prețul corect este X–Y EUR. La prețul Z se vinde în 30-45 de zile; la un preț mai mare riscăm >120 de zile fără oferte serioase.

**2. Comparabilele reale** — tabel cu adresă, suprafață, preț vânzare, preț/mp, timp de vânzare (sursă: REBS + ANCPI, tranzacții închise, nu anunțuri).

**3. Ce face diferența** — avantaje (etaj intermediar, an construcție, balcon) și dezavantaje (fără parcare, expunere nord), plus recomandarea de preț.

**4. Planul meu pentru dvs.** — zilele 1-3 (foto/video, anunț, boost TGE), zilele 4-30 (vizionări, raport săptămânal), ziua 30 (revizuim prețul dacă nu avem oferte).

**5. Următorul pas** — semnătura = începem azi.

## Cum îl folosești ca să închizi mandatul

1. **Nu lăsa raportul înainte de întâlnire** — valoarea e în explicația ta de 5 min pe cifre.
2. **Bifează cu pixul** prețul recomandat și deadline-ul de 30 de zile.
3. **Pune poza ta + 2 tranzacții vândute în zonă** — social proof închide.

> **Greșeala:** raport de 4 pagini cu grafice. Proprietarul nu-l citește. **1 pagină, 3 cifre, 1 plan = semnătură.**`,
        },
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 4. Ghidul Vânzărilor pentru Agenți
  // ─────────────────────────────────────────────────────────────
  {
    slug: "ghidul-vanzarilor",
    order: 40,
    title: { ro: "Ghidul Vânzărilor pentru Agenți" },
    description: {
      ro: "De ce m-ar alege pe mine un client când ar putea căuta singur? Pentru că lucrezi prin două branduri respectate — Transilvania Grand Estate și Adorya — și pentru că trebuie să înveți să-ți vinzi serviciile eficient. Oamenii cumpără de la oameni.",
    },
    lessons: [
      {
        slug: "vanzarea-serviciilor-de-agent",
        order: 10,
        title: { ro: "Vânzarea serviciilor de agent imobiliar" },
        excerpt: {
          ro: "Degeaba ești cel mai bun agent dacă nu știi să te vinzi. Atitudinea, ascultarea activă și întrebările potrivite îți câștigă clientul.",
        },
        content: {
          ro: `Lucrezi sub două branduri cu nume sonore — **Transylvania Grand Estate** (segment premium, high-ticket, dezvoltatori și ansambluri) și **Adorya** (segment standard, vânzări de volum), ambele sub umbrela holdingului **Transilvania Grand SRL**. Dar oamenii cumpără de la oameni: clienții te aleg pe tine pentru că le inspiri încredere și respect.

## Scopul tău: ascultă și înțelege nevoia

Nu te grăbi să vinzi. Concentrează-te pe cum poți ajuta și nu vei părea „alt agent disperat să încaseze rapid comisionul".

## Întrebări utile (adaptează-le după personalitatea ta)
- Cu ce scop mă sunați? Cum vă pot ajuta?
- Ce tip de proprietate căutați? Ce caracteristici sunt esențiale?
- Când ar fi ideal să intrați în posesia proprietății?
- Ați mai vizitat alte proprietăți? Ce nu v-a plăcut, ca să am un reper?
- Ce ar fi de evitat (chiriași, zone, particularități), ca să triez bine pentru dvs.?

Aceste întrebări îi arată clientului că îi respecți timpul și că vrei să-i scurtezi căutarea.

## Analogia consultantului imobiliar
1. **Ascultă activ** — fii prezent și empatizează.
2. **Fii realist** — nu promite lucruri imposibile.
3. **Demonstrează expertiză** — explică detaliile proprietății și procesul.
4. **Oferă soluții personalizate** — adaptează oferta la nevoi.
5. **Construiește o relație** — fii prietenos și accesibil.

## De ce mi-ar plăti comision?
Explică-le exact ce primesc:
- **Analiza comparativă de piață** și stabilirea prețului corect (preț prea mare = stă nevândut; preț prea mic = pierde bani).
- **Marketing eficient** prin tine și prin brandurile TGE și Adorya.
- **Trierea clienților** și negocierea în interesul lor.
- Îi scutești de apeluri și vizionări inutile.
- Acces și expunere la mai mulți clienți prin colaborarea cu alți agenți.

> Sunt mulți agenți imobiliari, dar puțini știu să se vândă cum trebuie. Aceia nu sunt concurența ta. Doar tu știi că ești începător — nimeni altcineva.`,
        },
      },
      {
        slug: "gestionarea-obiectiilor",
        order: 20,
        title: { ro: "Gestionarea obiecțiilor clienților" },
        excerpt: {
          ro: "Înțelege obiecția, ascultă activ, folosește argumente personalizate și transformă obiecțiile în oportunități.",
        },
        content: {
          ro: `Când un client are obiecții, esențial este să comunici clar și să identifici nevoile reale.

## 1. Înțelege obiecția
Obiecțiile pot fi despre preț, locație, calitate sau experiența agentului. Ascultă activ și identifică esența.

## 2. Ascultare activă
- **Fii empatic:** „Înțeleg de ce ai această îngrijorare", „Este o întrebare validă".
- **Clarifică:** „Ce anume te îngrijorează în legătură cu prețul acestei proprietăți?"

## 3. Întrebări deschise
„Ce anume cauți la noua ta proprietate?" — dezvăluie motivațiile reale.

## 4. Argumente personalizate
- **Date:** „În acest cartier, prețurile au crescut cu 10% în ultimul an."
- **Beneficii unice:** „Am experiență în această zonă și am ajutat mulți clienți să găsească proprietăți potrivite."

## 5. Tehnici de combatere
- **„Da, dar":** „Da, prețul e mai mare, dar are potențial de apreciere datorită dezvoltărilor viitoare."
- **Reformularea:** „Înțeleg că ești îngrijorat de preț, dar asta reflectă valoarea pe termen lung."

## 6. Crearea încrederii
- **Testimoniale:** „Am avut un client cu aceleași îngrijorări, acum e foarte mulțumit."
- **Transparență:** dacă există riscuri, discută-le. Nu promite marea cu sarea.

## 7. Follow-up
„Acum că am discutat despre preț, mai ai alte întrebări?" + mesaj de mulțumire după întâlnire.

## 8. Încheierea vânzării
- **Pașii următori:** „Dacă ești de acord, organizăm o vizionare săptămâna viitoare."
- **Urgență (reală):** „Această proprietate a primit multe solicitări, ar fi bine să acționăm repede."

## Temeri frecvente
- **Preț:** „Vă pot oferi opțiuni care se potrivesc bugetului și aduc valoare pe termen lung."
- **Experiență proastă anterioară:** „Îmi pare rău. Aș dori să vă demonstrez o experiență diferită. Haideți să discutăm așteptările dvs."`,
        },
      },
      {
        slug: "marketing-si-social-media",
        order: 30,
        title: { ro: "Marketing și Social Media" },
        excerpt: {
          ro: "Marketingul personal e jumătate din joc. Social media, video, networking și recenzii — gratuit și cu potențial imens.",
        },
        content: {
          ro: `Degeaba ești cel mai bun agent dacă clienții nu știu asta. Pe lângă vânzarea serviciilor, ocupă-te de **marketing**. Brandurile (TGE și Adorya) au fiecare propria platformă, cu marketingul asigurat de Agenție — dar marketingul tău personal îți aduce clienții.

## Social media — potențial imens și gratuit
- **Profiluri active** pe Facebook, Instagram, TikTok.
- **Postări regulate**: actualizări despre proprietăți, sfaturi, informații despre piața locală.
- **Anunțuri plătite** pentru o audiență mai largă.

## Video
Nu căuta scuze („n-am aparatură profi"). Oamenii apreciază naturalețea.
- **Tururi virtuale** ale proprietăților.
- **Live streaming** — prezinți proprietăți și răspunzi la întrebări.

## Publicitate
Flyere și pliante marca TGE și Adorya, distribuite în zonele vizate.

## Networking
Cea mai bună reclamă e din vorbă în vorbă. Vorbește despre ce faci — vei fi surprins câtă lume din jurul tău are o nevoie imobiliară chiar acum.
- **Evenimente locale** (târguri, evenimente comunitare).
- **Colaborări** cu bancheri, avocați, alți profesioniști.

## Recenzii
- Încurajează clienții să lase recenzii pe Google.
- Publică povești de succes (studii de caz).

## Email marketing
Newslettere cu oferte recente, articole și informații despre piață.

---

**Anunțurile tale** pentru TikTok, Facebook, Instagram, YouTube — fă-le cât mai atractive. Folosește AI-ul pentru generare de conținut, dar **întotdeauna cu vocea ta**, pentru originalitate și personalizare. Postările se trimit către Agenție spre verificare și sunt încărcate de personalul Transilvania Grand SRL.

> Mergi cu respect și încredere. Oferă-le rezultate clienților și aceștia te vor recomanda. **TGE și Adorya îți urează mult succes!**`,
        },
      },
    ],
  },
];
