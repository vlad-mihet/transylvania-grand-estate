/**
 * TGE Academy — agent-training course content.
 *
 * Source: material the client (Transilvania Grand SRL) supplied for new
 * Academy "rubrici" (sections): AI, Proceduri de lucru, Ghidul vânzărilor.
 * Each top-level entry becomes a `Course`; each lesson a `Lesson`.
 *
 * Scope note: the prod Academy already ships "real-estate-fundamentals" and
 * "real-estate-legislation" (Fundamente + Legislație). Those are NOT
 * re-authored here — only the three genuinely-new sections live in this file.
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
 * Seeded `status: 'published'`, `visibility: 'public'` to match the two
 * existing courses (any authenticated agent sees them without an enrollment).
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
  // 1. AI pentru Agenți Imobiliari
  // ─────────────────────────────────────────────────────────────
  {
    slug: "ai-pentru-agenti",
    order: 20,
    title: { ro: "AI pentru Agenți Imobiliari" },
    description: {
      ro: "Cum transformi inteligența artificială într-un coleg de echipă care nu obosește niciodată. Mai mult timp pentru clienți, decizii bazate pe date și marketing fără efort — fără să-ți pierzi vocea și autenticitatea. TGE și Adorys recomandă AI-ul pentru creșterea performanței.",
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
- Generarea descrierilor de proprietăți sub marca **TGE** și **Adorys**
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

AI-ul poate genera texte atractive pentru anunțuri, crea vizualuri și prezentări, chiar și video-uri scurte de promovare marca TGE și Adorys.

**Sfaturi:**
- Folosește AI pentru draft-uri, dar personalizează mesajele cu experiența ta și sub mărcile TGE și Adorys.
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

- **Personalizează** fiecare mesaj generat de AI — adaugă detalii specifice despre proprietăți și clienți. **TGE și Adorys trebuie să facă parte din script.**
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

**Important:** toate postările se fac pe platformele sociale care aparțin Transilvania Grand Estate și Adorys. Postările se trimit către Agenție spre verificare și sunt încărcate de personalul Agenției.`,
        },
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 2. Proceduri de Lucru (Fluxul Agentului)
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
Programezi foto/video profesional în 48h. Scrii anunțul în REBS, publici pe TGE (premium) și Adorys (volum), sincronizezi pe Storia, OLX, Imobiliare.ro.
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

## TGE vs Adorys (pe vânzători)
- **TGE:** doar proprietăți >500k EUR, acte curate, exclusivitate minim 90 de zile. Tu controlezi prețul și marketingul.
- **Adorys:** accepți și non-exclusivitate, dar prioritizezi mandatele exclusive. Mai mult volum, marjă mai mică.
- Proprietățile de pe TGE se publică și pe Adorys.

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
Verifici zilnic lead-urile din REBS de pe TGE și Adorys. Prioritizezi lead-urile TGE (scor mai mare, precalificate). Suni în max. 5 min de la primire.

## 2. Primul contact — script și obiectiv
Confirmi nevoia în 90 sec. Nu vinzi imobilul la telefon — obiectivul e **vizionarea** sau apelul video. Pe WhatsApp trimiți 2-3 poze + link-ul TGE/Adorys cu watermark.

## 3. Calificare
Pui 6 întrebări în max. 4 min: buget aprobat? finanțare (cash/ipotecar/prima casă)? zona și suprafața minimă? deadline de mutare? cine decide? a mai văzut cu altă agenție? Completezi scorul A/B/C în REBS.
**Documente:** preaprobare bancară sau declarație de capacitate financiară. Nu te baza pe „am banii".

## 4. Vizionare — ce ceri și ce verifici
Trimiți contractul de vizionare pe WhatsApp cu 30 min înainte. La fața locului verifici CI, faci poza cu clientul în fața imobilului, completezi procesul-verbal. Încarci tot în REBS.
**Documente:** contract de vizionare, CI client, proces-verbal de vizionare; pentru TGE/Adorys și extrasul CF <24h.

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

**Tu:** „Bună ziua, mă numesc [Nume], sunt de la Transilvania Grand SRL / TGE / Adorys. Sun legat de imobilul din [Zonă/Stradă] pe care îl aveți de vânzare. Am 2 min să vă spun de ce vă sun?"

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
  // 3. Ghidul Vânzărilor pentru Agenți
  // ─────────────────────────────────────────────────────────────
  {
    slug: "ghidul-vanzarilor",
    order: 40,
    title: { ro: "Ghidul Vânzărilor pentru Agenți" },
    description: {
      ro: "De ce m-ar alege pe mine un client când ar putea căuta singur? Pentru că lucrezi prin două branduri respectate — Transilvania Grand Estate și Adorys — și pentru că trebuie să înveți să-ți vinzi serviciile eficient. Oamenii cumpără de la oameni.",
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
          ro: `Lucrezi sub două branduri cu nume sonore — **Transylvania Grand Estate** (segment premium, high-ticket, dezvoltatori și ansambluri) și **Adorys** (segment standard, vânzări de volum), ambele sub umbrela holdingului **Transilvania Grand SRL**. Dar oamenii cumpără de la oameni: clienții te aleg pe tine pentru că le inspiri încredere și respect.

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
- **Marketing eficient** prin tine și prin brandurile TGE și Adorys.
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
          ro: `Degeaba ești cel mai bun agent dacă clienții nu știu asta. Pe lângă vânzarea serviciilor, ocupă-te de **marketing**. Brandurile (TGE și Adorys) au fiecare propria platformă, cu marketingul asigurat de Agenție — dar marketingul tău personal îți aduce clienții.

## Social media — potențial imens și gratuit
- **Profiluri active** pe Facebook, Instagram, TikTok.
- **Postări regulate**: actualizări despre proprietăți, sfaturi, informații despre piața locală.
- **Anunțuri plătite** pentru o audiență mai largă.

## Video
Nu căuta scuze („n-am aparatură profi"). Oamenii apreciază naturalețea.
- **Tururi virtuale** ale proprietăților.
- **Live streaming** — prezinți proprietăți și răspunzi la întrebări.

## Publicitate
Flyere și pliante marca TGE și Adorys, distribuite în zonele vizate.

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

> Mergi cu respect și încredere. Oferă-le rezultate clienților și aceștia te vor recomanda. **TGE și Adorys îți urează mult succes!**`,
        },
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 4. Reprezentarea Exclusivă în Imobiliare
  // ─────────────────────────────────────────────────────────────
  {
    slug: "reprezentarea-exclusiva",
    order: 50,
    title: { ro: "Reprezentarea Exclusivă în Imobiliare" },
    description: {
      ro: "De ce un singur agent dedicat aduce un preț mai bun și mai puțin stres decât zece anunțuri paralele. Ce este exclusivitatea, cum o explici proprietarului, ce conține contractul și cum vinzi acest serviciu — totul sub brandurile Transilvania Grand Estate și Adorys.",
    },
    lessons: [
      {
        slug: "ce-este-reprezentarea-exclusiva",
        order: 10,
        title: { ro: "Ce este reprezentarea exclusivă și cum diferă de intermedierea liberă" },
        excerpt: {
          ro: "Două moduri de a colabora cu proprietarul: intermedierea liberă, unde mai mulți agenți concurează haotic, și reprezentarea exclusivă, unde un singur agent răspunde 100% de rezultat.",
        },
        content: {
          ro: `Când vine vorba de vânzarea unei proprietăți, există două moduri principale prin care un agent imobiliar poate colabora cu proprietarul: **intermedierea liberă** și **reprezentarea exclusivă**.

## Intermedierea liberă

Orice agent poate lucra la vânzarea proprietății, iar proprietarul poate lucra cu mai mulți agenți simultan sau chiar vinde singur. De obicei, acest model creează o competiție nesănătoasă între agenți și poate duce la un serviciu superficial, prețuri fluctuante și confuzie pentru vânzător.

- Mai mulți agenți pot intermedia vânzarea aceleiași proprietăți.
- Există riscul promovării cu prețuri și abordări diferite (inclusiv inducerea în eroare a clienților, voită sau nu).
- Proprietarul poate lista pe mai multe canale, ceea ce reduce valoarea percepută de cumpărători și crește șansa ca o parte din clienți să-l contacteze direct.
- Agenții nu investesc în marketing de calitate, pentru că nu au siguranța unei tranzacții reușite.

## Reprezentarea exclusivă

Un singur agent imobiliar se ocupă de tranzacție, oferind un serviciu complet, personalizat și concentrat 100% pe obiectivul clientului. Acesta investește timp, bani și resurse pentru a obține cel mai bun preț și cele mai bune condiții pentru proprietar.

- Agentul are un contract exclusiv cu proprietarul și este singura persoană responsabilă de promovarea și vânzarea proprietății.
- Oferă servicii premium: strategie personalizată de marketing, promovare avansată, suport juridic.
- Se semnează un contract ferm, cu drepturi și obligații clare.
- Agentul primește comision indiferent cum se finalizează tranzacția — chiar dacă proprietarul găsește singur clientul sau dacă agentul colaborează cu alți agenți, comisionul stabilit revine agentului cu contract de exclusivitate.

## Comparație directă

| Criteriu | Reprezentare exclusivă | Intermediere liberă |
|---|---|---|
| Cine vinde | Un singur agent dedicat | Mai mulți agenți în paralel |
| Marketing | Strategie premium, investiție reală | Anunțuri copy-paste, fără investiție |
| Prețul afișat | Unic și controlat | Diferit pe fiecare canal |
| Comision agent | Garantat prin contract | Nesigur — descurajează efortul |
| Experiența proprietarului | Un punct de contact, claritate | Haos, negocieri paralele, confuzie |

> **Pe scurt:** exclusivitatea nu limitează numărul de cumpărători — îi concentrează. Un singur agent răspunde de rezultat, în loc ca nimeni să răspundă de nimic.`,
        },
      },
      {
        slug: "avantajele-reprezentarii-exclusive",
        order: 20,
        title: { ro: "Avantajele reprezentării exclusive (proprietar + agent)" },
        excerpt: {
          ro: "Mulți proprietari cred că exclusivitatea le limitează cumpărătorii. Realitatea e exact opusă — pentru proprietar înseamnă preț mai bun și mai puțin stres, iar pentru agent, un comision garantat.",
        },
        content: {
          ro: `Mulți proprietari ezită să semneze un contract de exclusivitate, de teamă că ar limita numărul de cumpărători interesați. Realitatea este exact opusă.

## Pentru proprietar

- **Serviciu complet:** agentul dedicat se ocupă de tot procesul — evaluare, promovare, negociere și finalizarea tranzacției.
- **Preț mai bun:** o strategie clară de vânzare asigură obținerea prețului maxim.
- **Marketing personalizat:** campanii targetate, fotografii profesionale, tururi virtuale, reclame plătite.
- **Economie de timp:** se evită haosul vizionărilor multiple cu agenți diferiți.
- **Siguranță juridică:** totul se desfășoară legal, fără riscuri ascunse.
- **Implicare 100%:** având siguranța comisionului, agentul se poate dedica complet promovării proprietății.
- **Un singur punct de contact:** fără confuzii și fără negocieri paralele.
- **Mai puțin stres și mai multă transparență** pe tot parcursul vânzării.

Agentul reprezintă interesele proprietarului și construiește o strategie personalizată pentru a obține cel mai bun preț.

## Pentru agent

Pentru agentul imobiliar, acest tip de contract este calea sigură spre succes:

- **Comision garantat** — nu mai există riscul de a lucra gratuit.
- **Control asupra tranzacției** — agenții nu se concurează reciproc, ci colaborează.
- **Client mai mulțumit** — proprietarii primesc servicii premium.
- **Branding personal** — devii expertul din zona ta.

> **Reține:** sub brandurile **Transilvania Grand Estate** (premium) și **Adorys** (volum), exclusivitatea îți permite să investești cu încredere în marketing, pentru că rezultatul muncii tale e protejat prin contract.`,
        },
      },
      {
        slug: "cum-convingi-proprietarul",
        order: 30,
        title: { ro: "Cum convingi un proprietar să semneze exclusivitate" },
        excerpt: {
          ro: "Cheia este educarea clientului. Majoritatea nu înțeleg beneficiile exclusivității — așa că le explici concret, le demonstrezi valoarea serviciului și le adresezi obiecțiile.",
        },
        content: {
          ro: `Cheia este **educarea clientului**. Majoritatea proprietarilor nu înțeleg beneficiile exclusivității, așa că trebuie să le explici clar.

## 1. Prezintă avantajele concrete

Fă o comparație directă între intermedierea liberă și exclusivitate (exact ce ai învățat în lecțiile anterioare) și folosește exemple de succes. Proprietarul trebuie să vadă, punct cu punct, ce câștigă.

## 2. Demonstrează valoarea serviciului tău

- Arată-i strategia ta de marketing detaliată și diferența dintre o promovare potrivită și o mulțime de anunțuri copy-paste publicate de mai mulți agenți, care induc în eroare clienții interesați și îi fac să renunțe la contactarea proprietății.
- Explică procesul de selecție a cumpărătorilor potriviți — posibil tocmai datorită relației mult mai detaliate pe care o ai cu proprietarul.

## 3. Abordează obiecțiile

**„Dar dacă alt agent are un cumpărător?"**
→ „Colaborăm cu alți agenți prin MLS-uri, grupuri și networking personal. Expunerea rămâne la fel de mare — diferența e că eu țin legătura cu ceilalți agenți, nu dumneavoastră."

**„De ce să aleg un singur agent?"**
→ „Un singur agent dedicat lucrează 100% pentru dumneavoastră, mai ales fiind sigur că încasează comisionul din tranzacție."

> **Ideea de bază:** nu te impui, ci explici. Proprietarul semnează când înțelege că exclusivitatea lucrează în favoarea lui, nu împotriva lui.`,
        },
      },
      {
        slug: "contractul-de-exclusivitate",
        order: 40,
        title: { ro: "Contractul de exclusivitate, obligațiile părților și comisioanele" },
        excerpt: {
          ro: "Ce trebuie să conțină un contract solid, ce obligații are fiecare parte, comisioanele standard (3-5%) și cum împarți comisionul atunci când colaborezi cu alți agenți.",
        },
        content: {
          ro: `Un contract solid elimină temerile proprietarului și protejează ambele părți.

> **Resurse:** descarcă draftul de contract de exclusivitate din secțiunea **RESURSE**, studiază-l și stăpânește-l înainte de a-l propune unui proprietar.

## Ce trebuie să conțină contractul

- Identificarea părților și a proprietății.
- Durata contractului (de obicei 3-6 luni).
- Comisionul agentului.
- Obligațiile agentului: marketing, negociere, verificarea actelor.
- Obligațiile proprietarului: disponibilitate pentru vizionări, exclusivitate.

## Obligațiile fiecărei părți

**Agentul trebuie să:**
- promoveze activ proprietatea;
- informeze constant clientul despre stadiul și evoluția proprietății listate;
- organizeze vizionări și negocieri eficiente.

**Proprietarul trebuie să:**
- ofere acces la proprietate;
- colaboreze și să nu listeze proprietatea la alți agenți.

## Comisioanele standard și colaborarea cu alți agenți

- Standard, comisionul pentru reprezentare exclusivă este de **3-5% din prețul de vânzare**.
- Colaborarea cu alți agenți este esențială. De obicei, comisionul total se împarte **50%-50%**, dar te poți înțelege și la alte procente cu agentul cu care colaborezi.
- **Cumpărătorul nu este comisionat** — proprietarul plătește serviciul, pentru că el beneficiază de promovare, negociere și securitatea tranzacției.

> **Exemplu:** ai un comision de 4% de la proprietar (standard). Poți ceda agentului colaborator 1% sau 2% din comisionul tău. Procentul se negociază de la caz la caz, sau îți poți stabili deja public oferta de colaborare.`,
        },
      },
      {
        slug: "strategii-de-marketing-personalizat",
        order: 50,
        title: { ro: "Strategii de marketing personalizat pentru reprezentarea exclusivă" },
        excerpt: {
          ro: "Tehnicile care atrag cumpărătorii potriviți și maximizează vizibilitatea: fotografii și tururi virtuale, social media, anunțuri optimizate, email marketing, networking și colaborarea prin MLS.",
        },
        content: {
          ro: `Pentru că ai siguranța comisionului, te poți implica 100% în promovare. Iată cele mai eficiente metode pentru a atrage cumpărătorii potriviți și a maximiza vizibilitatea ofertelor.

## Fotografii calitative și tururi virtuale

Prima impresie contează: circa **90% dintre cumpărători își bazează decizia pe imagini**. Fotografiile de calitate sporesc interesul și aduc mai multe vizionări.

Elemente esențiale pentru fotografii imobiliare bune:
- iluminare naturală și unghiuri potrivite;
- evidențierea punctelor forte ale proprietății;
- editare profesională pentru claritate și atractivitate.

> **Atenție:** editarea profesională nu înseamnă să ștergi defecte sau să faci retușuri mincinoase. Proprietatea trebuie să arate real.

Folosește și **tururi video** pentru o experiență interactivă, videoclipuri de prezentare pentru storytelling imobiliar și, unde se potrivește, transmisiuni live.

## Promovare pe rețelele sociale

- **Facebook și Instagram:** targetare precisă pe baza intereselor și comportamentului utilizatorilor.
- **TikTok și YouTube:** conținut video captivant care generează engagement.
- **LinkedIn:** networking cu investitori și profesioniști din industrie.

Strategii eficiente: conținut valoros (postări educaționale, studii de caz, povești de succes), reclame plătite targetate și colaborări cu influenceri imobiliari pentru credibilitate.

## Anunțuri optimizate

- Selectează platformele potrivite: **Imobiliare.ro, Storia, OLX, Idealista** (expunere națională și internațională).
- Scrie descrieri care evidențiază beneficiile unice ale proprietății.
- Folosește cuvinte cheie pentru SEO imobiliar.
- Folosește pachete premium pentru promovare extinsă și poziționare prioritară.

## Puterea email marketingului

- Construiește o bază de date cu clienți și investitori potențiali.
- Automatizează campaniile pentru nurturing (ex.: follow-up-uri strategice).
- Trimite newslettere lunare cu oferte exclusive, tendințe de piață și sfaturi utile.

## Networking strategic

- Evenimente de profil și conferințe imobiliare.
- Parteneriate cu dezvoltatori, arhitecți și firme de design interior.
- Open house-uri pentru agenți și cumpărători VIP.

## Colaborări cu alți agenți prin MLS

**MLS (Multiple Listing Service)** este o platformă prin care agenții își împărtășesc ofertele (grupuri, aplicații etc.). Interesează-te cum găsești un astfel de MLS în orașul tău (caută pe Google, social media etc.).

Beneficii ale colaborării prin MLS:
- acces la un număr mai mare de cumpărători interesați;
- credibilitate și profesionalism crescute în industrie;
- reducerea timpului de vânzare prin cooperare activă.

Metoda de colaborare cu agentul care vine cu clientul: îi cedezi o parte din comisionul primit de la proprietar. De exemplu, dintr-un comision de 4% îi poți ceda 1-2%; procentul se negociază sau îl stabilești public ca ofertă de colaborare.`,
        },
      },
      {
        slug: "vanzarea-serviciului-de-exclusivitate",
        order: 60,
        title: { ro: "Vânzarea eficientă a serviciului de exclusivitate către proprietari" },
        excerpt: {
          ro: "Cum vinzi serviciul de exclusivitate: construiește-ți autoritatea, fii transparent în fiecare etapă, demonstrează rezultate prin studii de caz și testimoniale, apoi închide profesionist.",
        },
        content: {
          ro: `În primul rând, stabilește o **întâlnire în persoană** cu proprietarul căruia urmează să-i vinzi acest serviciu. În cazuri excepționale poți apela la Zoom sau alte aplicații de ședințe online. Important este să stabilești o conexiune personalizată cu clientul.

## 1. Construiește-ți autoritatea

Proprietarii au nevoie de încredere înainte de a-ți încredința vânzarea. Agenții percepuți ca experți atrag mai mulți clienți fără efort suplimentar.

> **Atenție:** vorbim despre **agenți**, nu despre agenții! Scoate-ți din cap ideea că ai nevoie de o agenție mare în spate ca să poți vinde servicii de exclusivitate.

Canale eficiente pentru autoritate:
- Scrie articole despre avantajele exclusivității și despre tendințele pieței.
- Oferă potențialilor clienți materiale educative care explică avantajele acestui tip de colaborare.
- Creează videoclipuri scurte (1-3 min) în care explici de ce reprezentarea exclusivă funcționează mai bine. Postează pe YouTube, Facebook, Instagram și TikTok. (Exemplu: „5 greșeli pe care proprietarii le fac când listează cu mai mulți agenți".)
- Pe social media, arată că ești activ: distribuie vânzări recente, tururi video și feedback de la clienți; folosește grupurile imobiliare pentru a interacționa direct.
- Prin email marketing, construiește o listă de proprietari și trimite periodic newslettere utile (ex.: „De ce este periculos să colaborezi cu mai mulți agenți?").

## 2. Fii transparent — explică fiecare etapă

Mulți proprietari sunt sceptici tocmai pentru că nu înțeleg avantajele. Claritatea le dă siguranță.

**Mit:** „Dacă lucrez cu mai mulți agenți, am șanse mai mari să vând repede."
**Realitate:** „Când mai mulți agenți listează aceeași proprietate, nu investesc în marketing și scad prețul ca să grăbească vânzarea."

Explică-i că **tu** vei colabora cu ceilalți agenți din oraș și că expunerea va fi la fel de bună sau chiar mai bună — avantajul fiind că tu ții legătura cu ei, nu proprietarul, scutindu-l de muncă.

Procesul, pas cu pas:
1. **Evaluare corectă a prețului** — analize de piață pentru un preț competitiv.
2. **Marketing personalizat** — fotografii profesionale, tururi virtuale, reclame plătite.
3. **Screening-ul cumpărătorilor** — doar clienți serioși ajung la proprietate.
4. **Negociere profesionistă** — obținerea celui mai bun preț.
5. **Ghidare până la finalizare** — asistență juridică și logistică.

Fii sincer despre așteptări și rezultate: spune clar ce poate și ce nu poate face exclusivitatea și estimează timpul de vânzare pe baza unor date reale. Oferă un contract clar, explicat pas cu pas — scopul tău este să protejezi interesele proprietarului, spre deosebire de colaborarea la liber cu un agent care reprezintă interesele cumpărătorului.

## 3. Demonstrează rezultatele — studii de caz și testimoniale

- **Studii de caz reale:** compară două proprietăți similare, una vândută exclusiv vs. una în regim deschis. („Am vândut un apartament în 30 de zile, în timp ce altele listate fără exclusivitate au rămas pe piață luni întregi.")
- **Testimoniale:** culege recenzii video sau text de la foști clienți și postează-le pe site și social media. Folosește întrebări strategice: „Ce diferență a făcut exclusivitatea în procesul de vânzare?"
- **Statistici relevante:** „Proprietățile vândute în exclusivitate se tranzacționează cu circa 15% mai rapid." / „80% dintre clienții mei au obținut un preț mai bun prin reprezentare exclusivă."
- **Before & after:** arată cum ai preluat o proprietate fără succes în regim deschis și ai vândut-o rapid prin exclusivitate (poze cu îmbunătățiri prin staging, noi strategii de marketing etc.).

## Tehnici de încheiere

- **Conștientizează problemele colaborării fără exclusivitate:** „Dacă agenții nu investesc în promovare, cine pierde?" / „Ce se întâmplă dacă prețul scade din cauza concurenței nesănătoase?" Un anunț postat de mai mulți agenți cu prețuri diferite denotă neseriozitate și alungă clienții.
- **Creează urgență (reală):** „Acum este un moment bun pentru a vinde." / „Avem deja cumpărători interesați de acest tip de proprietate."
- **Oferă o garanție:** „Dacă în X zile nu aduc vizionări relevante, revizuim strategia." / „Promit transparență totală și actualizări constante."
- **Închide direct și profesionist:** „Dacă sunteți de acord, putem începe chiar acum. Când ați avea timp pentru o întâlnire?"

> **Sarcină practică:** descarcă draftul de contract și studiază-l până îl stăpânești. Sună 5 proprietari și propune-le întâlniri în zilele următoare. Întâlnește-te cu fiecare și aplică, pas cu pas, vânzarea învățată aici. Urmărește rezultatul și notează ce consideri că nu ai făcut bine.`,
        },
      },
    ],
  },
];
