export interface ArticleSeedData {
  slug: string;
  title: { en: string; ro: string; fr: string; de: string };
  excerpt: { en: string; ro: string; fr: string; de: string };
  content: { en: string; ro: string; fr: string; de: string };
  coverImage: string;
  category: "guide" | "news" | "market-report";
  tags: string[];
  publishedAt: string;
  authorName: string;
  authorAvatar: string | null;
  readTimeMinutes: number;
}

export const articles: ArticleSeedData[] = [
  // ─── 1. Complete Guide to Buying Property in Romania ───
  {
    slug: "ghid-complet-cumparare-proprietate-romania",
    title: {
      en: "Complete Guide to Buying Property in Romania",
      ro: "Ghid complet pentru cumpărarea unei proprietăți în România",
      fr: "Guide complet pour acheter une propriété en Roumanie",
      de: "Vollständiger Leitfaden zum Immobilienkauf in Rumänien",
    },
    excerpt: {
      en: "Everything you need to know about buying property in Romania: legal requirements, necessary documents, step-by-step process, and practical tips for first-time buyers.",
      ro: "Tot ce trebuie să știi despre cumpărarea unei proprietăți în România: cerințe legale, documente necesare, procesul pas cu pas și sfaturi practice pentru cumpărătorii la prima achiziție.",
      fr: "Tout ce que vous devez savoir sur l'achat d'une propriété en Roumanie : exigences légales, documents nécessaires, processus étape par étape et conseils pratiques.",
      de: "Alles, was Sie über den Immobilienkauf in Rumänien wissen müssen: rechtliche Anforderungen, erforderliche Dokumente, Schritt-für-Schritt-Prozess und praktische Tipps.",
    },
    content: {
      ro: `<h2>De ce să cumperi o proprietate în România?</h2>

<div class="article-stats-grid">
  <div class="article-stat"><div class="article-stat-value">2-4 luni</div><div class="article-stat-label">Durată medie a procesului</div></div>
  <div class="article-stat"><div class="article-stat-value">5-8%</div><div class="article-stat-label">Costuri suplimentare</div></div>
  <div class="article-stat"><div class="article-stat-value">15-20%</div><div class="article-stat-label">Avans standard recomandat</div></div>
  <div class="article-stat"><div class="article-stat-value">5-15%</div><div class="article-stat-label">Marjă de negociere</div></div>
</div>

<p>România oferă unele dintre cele mai accesibile prețuri imobiliare din Uniunea Europeană, cu o piață în creștere constantă. Transilvania, în special, combină prețuri competitive cu o calitate a vieții excelentă, infrastructură în dezvoltare și un patrimoniu cultural bogat.</p>

<p>Fie că ești la prima achiziție imobiliară, fie că ești un investitor cu experiență care privește spre piața românească, acest ghid îți oferă toate informațiile necesare pentru a naviga procesul cu succes — de la cerințele legale și documentele necesare, până la sfaturi practice de negociere și capcane de evitat.</p>

<figure class="article-figure"><img src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80" alt="Proprietate imobiliară modernă cu terasă" /><figcaption>Piața imobiliară din România oferă oportunități excelente pentru cumpărători, cu prețuri competitive la nivel european</figcaption></figure>

<h2>Cine poate cumpăra proprietăți în România?</h2>
<p>Cetățenii români și cetățenii UE/SEE pot achiziționa orice tip de proprietate, inclusiv terenuri. Cetățenii din afara UE pot cumpăra clădiri și apartamente, dar <strong>nu terenuri</strong> — cu excepția cazului în care au o companie înregistrată în România.</p>

<div class="article-callout article-callout-info">
  <div class="article-callout-title">💡 Bine de Știut</div>
  <p>Începând cu aderarea României la UE în 2007, cetățenii europeni beneficiază de <strong>aceleași drepturi ca cetățenii români</strong> în ceea ce privește achiziția de proprietăți imobiliare, inclusiv terenuri agricole (din 2014) și forestiere (din 2014). Nu este nevoie de permis de rezidență — pașaportul UE este suficient. Singura formalitate suplimentară este obținerea unui Număr de Identificare Fiscală (NIF) de la ANAF.</p>
</div>

<h3>Documente necesare pentru cumpărător</h3>

<div class="article-table-wrapper"><table class="article-table">
  <thead><tr><th>Document</th><th>Scop</th><th>De unde se obține</th></tr></thead>
  <tbody>
    <tr><td><strong>Carte de identitate / Pașaport</strong></td><td>Identificarea cumpărătorului la tranzacție</td><td>Serviciul de evidență a persoanelor / Pașapoarte</td></tr>
    <tr><td><strong>Certificat de căsătorie</strong></td><td>Acordul soțului/soției (dacă este cazul)</td><td>Starea civilă din cadrul primăriei</td></tr>
    <tr><td><strong>Cod Numeric Personal (CNP)</strong></td><td>Identificare fiscală (cetățeni români)</td><td>Cartea de identitate</td></tr>
    <tr><td><strong>NIF (pentru cetățeni UE)</strong></td><td>Identificare fiscală în România</td><td>ANAF — Agenția Națională de Administrare Fiscală</td></tr>
    <tr><td><strong>Dovada fondurilor</strong></td><td>Demonstrarea capacității financiare</td><td>Extras de cont bancar / aprobare credit ipotecar</td></tr>
    <tr><td><strong>Certificat fiscal</strong></td><td>Atestă absența datoriilor la stat</td><td>Primăria din domiciliul cumpărătorului</td></tr>
    <tr><td><strong>Certificat energetic</strong></td><td>Obligatoriu la vânzare (furnizat de vânzător)</td><td>Auditor energetic autorizat</td></tr>
  </tbody>
</table></div>

<h2>Procesul de cumpărare pas cu pas</h2>

<div class="article-steps">
  <div class="article-step"><div class="article-step-number">1</div><div class="article-step-content"><div class="article-step-title">Cercetarea pieței și selecția proprietății</div><div class="article-step-desc">Începe prin definirea bugetului tău, inclusiv costurile adiționale (notar, taxe, comision agenție). Folosește platforme precum Reveria pentru a descoperi proprietăți accesibile în Transilvania. Vizitează personal proprietățile care te interesează și verifică zona — transport, școli, magazine, spitale. Recomandăm să vizitezi cel puțin 5-10 proprietăți înainte de a lua o decizie finală.</div></div></div>
  <div class="article-step"><div class="article-step-number">2</div><div class="article-step-content"><div class="article-step-title">Verificarea juridică a proprietății</div><div class="article-step-desc">Aceasta este etapa cea mai importantă. Trebuie verificate: <strong>extrasul de carte funciară</strong> (confirmă proprietarul actual și eventualele sarcini — ipoteci, litigii), <strong>certificatul de urbanism</strong> (pentru construcții noi sau renovări majore), <strong>documentația cadastrală</strong> (suprafața reală vs. cea declarată), <strong>certificatul energetic</strong> (obligatoriu la vânzare) și <strong>situația juridică a terenului</strong> (dreptul de proprietate, servituți, restricții).</div></div></div>
  <div class="article-step"><div class="article-step-number">3</div><div class="article-step-content"><div class="article-step-title">Antecontractul de vânzare-cumpărare</div><div class="article-step-desc">Antecontractul (promisiunea de vânzare) este un acord preliminar care stabilește prețul convenit și modalitatea de plată, avansul (de obicei <strong>10-15% din prețul total</strong>), termenul limită pentru încheierea contractului final și penalitățile în caz de retragere. Se recomandă ca antecontractul să fie autentificat la notar, pentru protecție juridică maximă.</div></div></div>
  <div class="article-step"><div class="article-step-number">4</div><div class="article-step-content"><div class="article-step-title">Obținerea creditului ipotecar (dacă este cazul)</div><div class="article-step-desc">Dacă ai nevoie de finanțare, depune dosarul de credit la una sau mai multe bănci. Procesul durează de obicei <strong>2-4 săptămâni</strong>. Banca va evalua proprietatea prin intermediul unui evaluator autorizat și va solicita asigurare obligatorie pentru imobil și viață. Compară ofertele de la cel puțin 3 bănci pentru a obține cele mai bune condiții.</div></div></div>
  <div class="article-step"><div class="article-step-number">5</div><div class="article-step-content"><div class="article-step-title">Contractul de vânzare-cumpărare la notar</div><div class="article-step-desc">Contractul final se încheie în fața unui notar public. La semnare, se plătește restul de preț și se transferă proprietatea. Notarul se ocupă de verificarea identității părților, lectura integrală a contractului, colectarea taxelor și impozitelor, și înscrierea în cartea funciară (intabulare).</div></div></div>
  <div class="article-step"><div class="article-step-number">6</div><div class="article-step-content"><div class="article-step-title">Intabularea și predarea proprietății</div><div class="article-step-desc">După semnarea contractului, notarul depune cererea de intabulare la OCPI (Oficiul de Cadastru și Publicitate Imobiliară). Procesul durează <strong>5-15 zile lucrătoare</strong>. Între timp, primești proprietatea efectivă — chei, contoare, documente. Felicitări, ești oficial proprietar!</div></div></div>
</div>

<div class="article-callout article-callout-warning">
  <div class="article-callout-title">⚠️ Atenție la Verificarea Juridică</div>
  <p>Extrasul de carte funciară (extras CF) este <strong>cel mai important document</strong> pe care trebuie să-l verifici înainte de a semna orice. Acesta arată cine este proprietarul real, dacă există ipoteci, sechestre sau litigii pe imobil. Solicită un extras de carte funciară <strong>de informare</strong> actualizat — nu mai vechi de 30 de zile. Verifică și dacă suprafața din CF corespunde cu cea reală din teren sau din apartament. Orice neconcordanță poate genera probleme legale costisitoare ulterior.</p>
</div>

<figure class="article-figure"><img src="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&q=80" alt="Semnarea documentelor la notariat" /><figcaption>Contractul final se semnează la notariat, unde se verifică toate documentele și se transferă oficial proprietatea</figcaption></figure>

<h2>Sfaturi pentru cumpărătorii la prima achiziție</h2>
<ul>
  <li><strong>Nu te grăbi</strong> — vizitează cel puțin 5-10 proprietăți înainte de a lua o decizie. Compară prețurile, locațiile și starea imobilelor.</li>
  <li><strong>Angajează un avocat</strong> — costul este mic (500-1.500 EUR) comparativ cu riscurile pe care le previi. Un avocat specializat în drept imobiliar poate identifica probleme pe care un neprofesionist nu le observă.</li>
  <li><strong>Verifică vecinii și zona</strong> — vizitează proprietatea la ore diferite ale zilei și în zile diferite ale săptămânii, inclusiv seara și în weekend.</li>
  <li><strong>Planifică pentru costuri suplimentare</strong> — adaugă minim 5-8% din prețul proprietății pentru taxe notariale, intabulare, comision agenție și alte cheltuieli adiționale.</li>
  <li><strong>Verifică utilitățile</strong> — apă, canalizare, gaz, electricitate, internet. Asigură-te că toate sunt funcționale și transferabile pe numele tău.</li>
</ul>

<div class="article-callout article-callout-tip">
  <div class="article-callout-title">💚 Strategii de Negociere</div>
  <p>Prețurile afișate sunt aproape întotdeauna negociabile cu <strong>5-15%</strong>. Iată câteva strategii eficiente: cercetează prețurile comparabile din zonă pentru a avea argumente solide; menționează defectele obiective ale proprietății (necesitate de renovare, etaj, orientare); arată că ești un cumpărător serios cu finanțare deja aprobată; propune un termen scurt de finalizare — vânzătorii apreciază certitudinea; nu arăta prea mult entuziasm, chiar dacă proprietatea te atrage. De asemenea, dacă proprietatea este listată de mai mult de 60 de zile, vânzătorul este probabil mai dispus la negociere.</p>
</div>

<h2>Costurile tranzacției — la ce să te aștepți</h2>
<p>Pe lângă prețul proprietății, trebuie să bugetezi o serie de costuri suplimentare care pot totaliza <strong>5-8% din valoarea achiziției</strong>:</p>
<ul>
  <li><strong>Onorariu notar:</strong> 1-2% din valoarea proprietății (calculat progresiv, pe tranșe)</li>
  <li><strong>Impozit pe transferul proprietății:</strong> 1% (sub 450.000 lei) sau 3% (peste 450.000 lei)</li>
  <li><strong>Intabulare (înscrierea în cartea funciară):</strong> 200-500 lei</li>
  <li><strong>Comision agenție imobiliară:</strong> 1-3% (de obicei plătit de cumpărător)</li>
  <li><strong>Evaluare proprietate (dacă ai credit):</strong> 300-600 lei</li>
  <li><strong>Avocat (recomandat):</strong> 500-1.500 EUR</li>
  <li><strong>Asigurare obligatorie imobil:</strong> 100-300 EUR/an</li>
</ul>
<p>De exemplu, pentru un apartament de <strong>100.000 EUR</strong>, costurile suplimentare vor fi de aproximativ <strong>5.000-8.000 EUR</strong>. Planifică din timp aceste cheltuieli pentru a nu avea surprize neplăcute în ziua semnării contractului la notar.</p>

<h2>Timeline orientativă</h2>
<p>De la prima vizionare până la mutare, procesul durează de obicei <strong>2-4 luni</strong>:</p>
<ul>
  <li><strong>Căutare și vizionări:</strong> 2-6 săptămâni</li>
  <li><strong>Verificări juridice și antecontract:</strong> 1-2 săptămâni</li>
  <li><strong>Aprobare credit (dacă e cazul):</strong> 2-4 săptămâni</li>
  <li><strong>Contract final la notar:</strong> 1 zi</li>
  <li><strong>Intabulare:</strong> 1-3 săptămâni</li>
</ul>

<div class="article-highlight"><div class="article-highlight-title">🔑 Concluzii Cheie</div><ul>
  <li><strong>Bugetează inteligent</strong> — prețul de achiziție plus 5-8% costuri suplimentare (notar, taxe, intabulare, comision).</li>
  <li><strong>Verifică extrasul CF</strong> — este cel mai important document; cere unul actualizat, nu mai vechi de 30 de zile.</li>
  <li><strong>Negociază activ</strong> — prețurile afișate sunt negociabile cu 5-15%, mai ales pentru proprietățile listate de peste 60 de zile.</li>
  <li><strong>Angajează un avocat</strong> — 500-1.500 EUR este o investiție mică pentru protecție juridică maximă.</li>
  <li><strong>Cetățenii UE au drepturi egale</strong> — pot cumpăra orice tip de proprietate, inclusiv terenuri, fără restricții.</li>
  <li><strong>Planifică 2-4 luni</strong> — acesta este timpul mediu de la prima vizionare până la primirea cheilor.</li>
</ul></div>`,

      en: `<h2>Why Buy Property in Romania?</h2>
<p>Romania offers some of the most affordable property prices in the European Union, with a consistently growing market. Transylvania in particular combines competitive prices with an excellent quality of life, developing infrastructure, and rich cultural heritage.</p>

<h2>Who Can Buy Property in Romania?</h2>
<p>Romanian citizens and EU/EEA nationals can purchase any type of property, including land. Non-EU citizens can buy buildings and apartments but <strong>not land</strong> — unless they have a company registered in Romania.</p>

<h3>Required Documents for Buyers</h3>
<ul>
  <li><strong>ID card or passport</strong> — valid at the transaction date</li>
  <li><strong>Marriage certificate</strong> — if applicable (spouse must agree to the purchase)</li>
  <li><strong>Proof of funds</strong> — bank statement or mortgage pre-approval</li>
  <li><strong>Tax clearance certificate</strong> — proving no outstanding debts to the state</li>
</ul>

<h2>Step-by-Step Buying Process</h2>

<h3>1. Market Research and Property Selection</h3>
<p>Start by defining your budget, including additional costs (notary, taxes, agency commission). Use platforms like Reveria to discover affordable properties in Transylvania. Visit properties in person and check the area — transport, schools, shops, hospitals.</p>

<h3>2. Legal Due Diligence</h3>
<p>This is the most important step. You need to verify:</p>
<ul>
  <li><strong>Land registry extract</strong> — confirms current owner and any encumbrances</li>
  <li><strong>Urbanism certificate</strong> — for new constructions or major renovations</li>
  <li><strong>Cadastral documentation</strong> — actual vs. declared surface area</li>
  <li><strong>Energy performance certificate</strong> — mandatory for sales</li>
</ul>

<h3>3. Pre-sale Agreement (Antecontract)</h3>
<p>The pre-sale agreement is a preliminary contract establishing the price, deposit (typically <strong>10-15%</strong>), deadline, and penalties. It's recommended to have it notarized for maximum legal protection.</p>

<h3>4. Mortgage Approval (if applicable)</h3>
<p>If you need financing, submit your application to one or more banks. The process usually takes <strong>2-4 weeks</strong>. The bank will appraise the property and require mandatory insurance.</p>

<h3>5. Final Sale Contract at the Notary</h3>
<p>The final contract is concluded before a public notary. At signing, the remaining price is paid and ownership transfers. The notary handles identity verification, full contract reading, tax collection, and land registry inscription.</p>

<h3>6. Land Registry Inscription and Handover</h3>
<p>After signing, the notary files the registration request. The process takes <strong>5-15 business days</strong>. Meanwhile, you receive the property — keys, meters, documents.</p>

<h2>Tips for First-Time Buyers</h2>
<ul>
  <li><strong>Don't rush</strong> — visit at least 5-10 properties before deciding</li>
  <li><strong>Hire a lawyer</strong> — the cost is small (€500-1,500) compared to the risks</li>
  <li><strong>Negotiate</strong> — listed prices are usually negotiable by 5-15%</li>
  <li><strong>Plan for additional costs</strong> — add at least 5-8% of the price</li>
  <li><strong>Check utilities</strong> — water, sewage, gas, electricity, internet</li>
</ul>`,

      fr: `<h2>Pourquoi acheter en Roumanie ?</h2>
<p>La Roumanie offre certains des prix immobiliers les plus abordables de l'Union européenne. La Transylvanie combine des prix compétitifs avec une excellente qualité de vie et un riche patrimoine culturel.</p>

<h2>Qui peut acheter ?</h2>
<p>Les citoyens de l'UE/EEE peuvent acquérir tout type de propriété, y compris les terrains. Les citoyens hors UE peuvent acheter des bâtiments mais <strong>pas de terrains</strong>, sauf via une société enregistrée en Roumanie.</p>

<h3>Documents requis</h3>
<ul>
  <li><strong>Carte d'identité ou passeport</strong></li>
  <li><strong>Preuve de fonds</strong> — relevé bancaire ou pré-approbation hypothécaire</li>
  <li><strong>Certificat fiscal</strong></li>
</ul>

<h2>Processus d'achat étape par étape</h2>
<p>Le processus comprend la recherche de marché, la vérification juridique, l'avant-contrat (avec acompte de 10-15%), l'approbation hypothécaire si nécessaire, le contrat final chez le notaire, et l'inscription au registre foncier. Le tout prend généralement <strong>2-4 mois</strong>.</p>

<h2>Conseils pour les premiers acheteurs</h2>
<ul>
  <li>Visitez au moins 5-10 propriétés</li>
  <li>Engagez un avocat (500-1 500 €)</li>
  <li>Négociez — les prix affichés sont négociables de 5-15%</li>
  <li>Prévoyez 5-8% de frais supplémentaires</li>
</ul>`,

      de: `<h2>Warum in Rumänien kaufen?</h2>
<p>Rumänien bietet einige der günstigsten Immobilienpreise in der Europäischen Union. Siebenbürgen verbindet wettbewerbsfähige Preise mit hervorragender Lebensqualität und reichem kulturellem Erbe.</p>

<h2>Wer kann kaufen?</h2>
<p>EU/EWR-Bürger können jede Art von Immobilie erwerben, einschließlich Grundstücke. Nicht-EU-Bürger können Gebäude kaufen, aber <strong>keine Grundstücke</strong> — es sei denn, sie haben ein in Rumänien registriertes Unternehmen.</p>

<h3>Erforderliche Dokumente</h3>
<ul>
  <li><strong>Personalausweis oder Reisepass</strong></li>
  <li><strong>Finanzierungsnachweis</strong></li>
  <li><strong>Steuerliche Unbedenklichkeitsbescheinigung</strong></li>
</ul>

<h2>Kaufprozess Schritt für Schritt</h2>
<p>Der Prozess umfasst Marktforschung, rechtliche Prüfung, Vorvertrag (mit 10-15% Anzahlung), Hypothekengenehmigung falls nötig, Kaufvertrag beim Notar und Grundbucheintragung. Insgesamt dauert es in der Regel <strong>2-4 Monate</strong>.</p>

<h2>Tipps für Erstkäufer</h2>
<ul>
  <li>Besichtigen Sie mindestens 5-10 Immobilien</li>
  <li>Beauftragen Sie einen Anwalt (500-1.500 €)</li>
  <li>Verhandeln Sie — Listenpreise sind um 5-15% verhandelbar</li>
  <li>Planen Sie 5-8% Zusatzkosten ein</li>
</ul>`,
    },
    coverImage:
      "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&q=80",
    category: "guide",
    tags: [
      "cumpărare",
      "ghid",
      "documente",
      "notar",
      "prima-achiziție",
      "România",
    ],
    publishedAt: "2026-04-02T08:00:00.000Z",
    authorName: "Echipa Reveria",
    authorAvatar: null,
    readTimeMinutes: 12,
  },

  // ─── 2. Understanding Mortgages in Romania ───
  {
    slug: "intelegerea-creditelor-ipotecare-romania",
    title: {
      en: "Understanding Mortgages in Romania",
      ro: "Înțelegerea creditelor ipotecare în România",
      fr: "Comprendre les crédits hypothécaires en Roumanie",
      de: "Hypothekenkredite in Rumänien verstehen",
    },
    excerpt: {
      en: "A comprehensive guide to mortgage options in Romania: BNR regulations, fixed vs variable rates, the Noua Casă program, and what banks evaluate when approving your loan.",
      ro: "Un ghid complet despre opțiunile de creditare ipotecară în România: reglementările BNR, dobânzi fixe vs. variabile, programul Noua Casă și ce evaluează băncile când îți aprobă creditul.",
      fr: "Un guide complet sur les options hypothécaires en Roumanie : réglementations BNR, taux fixes vs variables, programme Noua Casă et critères d'évaluation des banques.",
      de: "Ein umfassender Leitfaden zu Hypothekenoptionen in Rumänien: BNR-Vorschriften, feste vs. variable Zinsen, das Noua-Casă-Programm und Bewertungskriterien der Banken.",
    },
    content: {
      ro: `<h2>Creditul ipotecar în România — ce trebuie să știi</h2>

<div class="article-stats-grid">
  <div class="article-stat"><div class="article-stat-value">40%</div><div class="article-stat-label">Limita DTI (grad maxim de îndatorare)</div></div>
  <div class="article-stat"><div class="article-stat-value">5%</div><div class="article-stat-label">Avans minim Noua Casă</div></div>
  <div class="article-stat"><div class="article-stat-value">15%</div><div class="article-stat-label">Avans minim standard</div></div>
  <div class="article-stat"><div class="article-stat-value">6-7%</div><div class="article-stat-label">Dobândă medie curentă</div></div>
</div>

<p>Creditul ipotecar este cel mai frecvent instrument de finanțare pentru achiziția unei locuințe. În România, piața creditelor ipotecare este reglementată de <strong>Banca Națională a României (BNR)</strong>, care impune reguli stricte pentru protecția consumatorilor și stabilitatea financiară. Înțelegerea mecanismelor de creditare este esențială pentru a lua decizia corectă — o alegere nepotrivită poate costa zeci de mii de euro pe durata creditului.</p>

<figure class="article-figure"><img src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80" alt="Documente financiare și bancnote pe un birou" /><figcaption>Înțelegerea opțiunilor de creditare te ajută să economisești mii de euro pe durata împrumutului</figcaption></figure>

<h2>Reglementările BNR privind creditele ipotecare</h2>
<p>BNR a introdus mai multe reglementări importante pe care trebuie să le cunoști înainte de a aplica pentru un credit ipotecar:</p>

<div class="article-callout article-callout-important">
  <div class="article-callout-title">🔴 Reglementare Critică BNR</div>
  <p>Rata maximă de îndatorare (DTI — Debt-to-Income) este de <strong>40% din venitul net lunar</strong>. Aceasta înseamnă că suma totală a tuturor ratelor tale (credit ipotecar, carduri de credit, credite de consum, leasing) nu poate depăși 40% din venitul tău net. De exemplu, dacă câștigi 5.000 lei net pe lună, rata maximă totală a tuturor creditelor tale este de 2.000 lei. Dacă ai deja un credit de consum cu rată de 500 lei, mai poți contracta un credit ipotecar cu rată maximă de 1.500 lei.</p>
</div>

<h3>Avansul minim</h3>
<ul>
  <li><strong>Credit standard în lei</strong>: minim 15% din valoarea proprietății</li>
  <li><strong>Credit în valută (EUR)</strong>: minim 25% din valoarea proprietății</li>
  <li><strong>Programul Noua Casă</strong>: minim 5% din valoarea proprietății</li>
</ul>

<h2>Dobânzi fixe vs. variabile</h2>

<p>Alegerea între dobândă fixă și variabilă este una dintre cele mai importante decizii pe care le vei lua. Fiecare opțiune are avantaje și dezavantaje semnificative, iar alegerea potrivită depinde de profilul tău de risc, orizontul de timp și condițiile economice.</p>

<div class="article-table-wrapper"><table class="article-table">
  <thead><tr><th>Criteriu</th><th>Dobândă Fixă</th><th>Dobândă Variabilă</th></tr></thead>
  <tbody>
    <tr><td><strong>Nivel curent</strong></td><td>6,5-8% pe an</td><td>IRCC + marjă = 5,5-7% pe an</td></tr>
    <tr><td><strong>Perioadă fixă</strong></td><td>5-10 ani (apoi devine variabilă)</td><td>Variază de la început trimestrial</td></tr>
    <tr><td><strong>Predictibilitate</strong></td><td>Rata lunară constantă pe perioada fixă</td><td>Rata se modifică la fiecare recalculare IRCC</td></tr>
    <tr><td><strong>Risc</strong></td><td>Scăzut pe termen scurt-mediu</td><td>Mediu-ridicat (depinde de evoluția IRCC)</td></tr>
    <tr><td><strong>Potrivită pentru</strong></td><td>Cumpărători conservatori, buget strict</td><td>Cumpărători care tolerează fluctuații</td></tr>
    <tr><td><strong>Cost total estimat</strong></td><td>De obicei mai mare pe termen lung</td><td>Poate fi mai mic, dar impredictibil</td></tr>
  </tbody>
</table></div>

<div class="article-pros-cons"><div class="article-pros"><div class="article-pros-title">✓ Avantaje Dobândă Fixă</div><ul><li>Rata lunară rămâne constantă — planificarea bugetului este simplă</li><li>Protecție completă împotriva creșterilor IRCC</li><li>Liniște sufletească pe termen de 5-10 ani</li><li>Ideală în perioade de dobânzi scăzute (le „blochezi")</li></ul></div><div class="article-cons"><div class="article-cons-title">✗ Dezavantaje Dobândă Fixă</div><ul><li>De obicei cu 1-2 puncte procentuale mai mare la contractare</li><li>Nu beneficiezi de scăderi ale IRCC</li><li>După perioada fixă, devine variabilă oricum</li><li>Cost total mai mare pe întreaga durată a creditului</li></ul></div></div>

<p>Pentru proprietăți accesibile (sub 200.000 EUR), dobânda fixă pe primii 5 ani oferă liniște sufletească. Pentru achiziții mai mari, analizează tendințele IRCC și discută cu un consultant financiar independent.</p>

<h2>Comparație dobânzi între bănci</h2>
<p>Iată o comparație orientativă a condițiilor oferite de principalele bănci din România pentru credite ipotecare în lei (valori indicative, se pot modifica):</p>

<div class="article-table-wrapper"><table class="article-table">
  <thead><tr><th>Bancă</th><th>Dobândă Fixă (5 ani)</th><th>Dobândă Variabilă</th><th>Avans Minim</th><th>Perioadă Max.</th></tr></thead>
  <tbody>
    <tr><td><strong>BCR</strong></td><td>6,90%</td><td>IRCC + 2,50%</td><td>15%</td><td>30 ani</td></tr>
    <tr><td><strong>BRD</strong></td><td>6,70%</td><td>IRCC + 2,30%</td><td>15%</td><td>30 ani</td></tr>
    <tr><td><strong>Banca Transilvania</strong></td><td>7,10%</td><td>IRCC + 2,70%</td><td>15%</td><td>30 ani</td></tr>
    <tr><td><strong>ING Bank</strong></td><td>6,50%</td><td>IRCC + 2,20%</td><td>15%</td><td>30 ani</td></tr>
    <tr><td><strong>Raiffeisen</strong></td><td>6,80%</td><td>IRCC + 2,40%</td><td>15%</td><td>30 ani</td></tr>
    <tr><td><strong>CEC Bank</strong></td><td>6,60%</td><td>IRCC + 2,10%</td><td>15%</td><td>35 ani</td></tr>
    <tr><td><strong>UniCredit</strong></td><td>6,90%</td><td>IRCC + 2,50%</td><td>15%</td><td>30 ani</td></tr>
  </tbody>
</table></div>

<figure class="article-figure"><img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80" alt="Planificare financiară cu grafice și calculator" /><figcaption>Compararea ofertelor de la mai multe bănci poate economisi mii de euro pe durata creditului</figcaption></figure>

<h2>Programul Noua Casă</h2>
<p>Noua Casă (fostul Prima Casă) este un program guvernamental care facilitează accesul la credite ipotecare prin garantarea parțială a creditului de către stat. Este cea mai populară opțiune pentru tinerii la prima achiziție imobiliară.</p>

<div class="article-callout article-callout-tip">
  <div class="article-callout-title">💚 Programul Noua Casă — O Oportunitate Excelentă</div>
  <p>Noua Casă este ideal pentru cumpărătorii la prima achiziție cu economii limitate. Cu doar <strong>5% avans</strong> (față de 15% standard), poți accesa o proprietate de până la 70.000 EUR (existentă) sau 140.000 EUR (construcție nouă). Dobânzile sunt mai avantajoase decât la creditele standard: IRCC + 2-2,5% (variabilă) sau 5-6% (fixă). Condiția principală: <strong>nu trebuie să deții altă locuință</strong> la momentul aplicării. Programul include asigurare obligatorie — imobil, viață și garanție FNGCIMM.</p>
</div>

<h2>Ce evaluează băncile?</h2>
<p>Când depui cererea de credit, banca analizează riguros mai mulți factori pentru a decide dacă aprobă sau respinge solicitarea ta:</p>
<ul>
  <li><strong>Venitul stabil</strong> — contract pe perioadă nedeterminată, minim 6 luni vechime la angajatorul curent. Veniturile din PFA sau SRL sunt acceptate, dar cu condiții suplimentare.</li>
  <li><strong>Istoricul de creditare</strong> — interogare la Biroul de Credit. Orice întârziere la plată din ultimii 4 ani poate afecta negativ scorul tău.</li>
  <li><strong>Gradul de îndatorare</strong> — sub 40% conform reglementărilor BNR, incluzând toate creditele active.</li>
  <li><strong>Evaluarea proprietății</strong> — un evaluator autorizat ANEVAR verifică valoarea de piață reală a imobilului.</li>
  <li><strong>Vârsta solicitantului</strong> — creditul trebuie rambursat de obicei înainte de 65-70 de ani, ceea ce limitează perioada maximă disponibilă.</li>
</ul>

<h2>Procesul de obținere a creditului ipotecar</h2>

<div class="article-steps">
  <div class="article-step"><div class="article-step-number">1</div><div class="article-step-content"><div class="article-step-title">Pre-calificarea și simularea</div><div class="article-step-desc">Înainte de a căuta proprietăți, du-te la 2-3 bănci pentru o pre-calificare. Aceasta îți arată suma maximă pe care o poți accesa, fără angajament. Folosește simulatoarele de credit de pe site-urile băncilor pentru a estima rata lunară.</div></div></div>
  <div class="article-step"><div class="article-step-number">2</div><div class="article-step-content"><div class="article-step-title">Pregătirea dosarului de credit</div><div class="article-step-desc">Adună toate documentele necesare: carte de identitate, adeverință de venit sau fluturași de salariu (ultimele 3-6 luni), extras de cont (ultimele 3-6 luni), contractul de muncă, antecontractul de vânzare-cumpărare și documentele proprietății (extras CF, certificat energetic).</div></div></div>
  <div class="article-step"><div class="article-step-number">3</div><div class="article-step-content"><div class="article-step-title">Depunerea cererii la bancă</div><div class="article-step-desc">Depune dosarul la banca aleasă (sau la mai multe, simultan). Banca verifică documentele, interogă Biroul de Credit și face o primă evaluare a eligibilității tale. Acest pas durează de obicei 3-5 zile lucrătoare.</div></div></div>
  <div class="article-step"><div class="article-step-number">4</div><div class="article-step-content"><div class="article-step-title">Evaluarea proprietății</div><div class="article-step-desc">Banca trimite un evaluator autorizat ANEVAR la proprietate. Evaluatorul stabilește valoarea de piață reală, care poate fi diferită de prețul cerut de vânzător. Banca finanțează în funcție de <strong>valoarea minimă</strong> dintre preț și evaluare. Costul evaluării: 300-600 lei.</div></div></div>
  <div class="article-step"><div class="article-step-number">5</div><div class="article-step-content"><div class="article-step-title">Aprobarea finală și semnarea</div><div class="article-step-desc">După aprobarea comitetului de credit (durează 1-2 săptămâni), primești oferta fermă cu toate condițiile. Ai 15 zile de reflecție obligatorii conform legii. Apoi semnezi contractul de credit și contractul de vânzare-cumpărare la notar, de obicei în aceeași zi.</div></div></div>
</div>

<h2>Documente necesare pentru credit ipotecar</h2>
<ul>
  <li><strong>Carte de identitate</strong> — copie și original</li>
  <li><strong>Adeverință de venit</strong> sau fluturași de salariu (ultimele 3-6 luni)</li>
  <li><strong>Extras de cont</strong> (ultimele 3-6 luni) — demonstrează fluxul financiar</li>
  <li><strong>Contractul de muncă</strong> — cu act adițional actualizat</li>
  <li><strong>Antecontractul de vânzare-cumpărare</strong> — semnat cu vânzătorul</li>
  <li><strong>Documentele proprietății</strong> — extras CF actualizat, certificat energetic, cadastru</li>
</ul>

<h2>Sfaturi pentru a obține cele mai bune condiții</h2>
<ul>
  <li><strong>Compară ofertele</strong> a cel puțin 3-4 bănci — diferențele pot fi semnificative pe termen lung</li>
  <li><strong>Negociază marja</strong> — băncile au flexibilitate, mai ales pentru clienți cu venituri bune și avans mai mare de 25%</li>
  <li><strong>Alege perioada potrivită</strong> — rate mai mici pe 30 de ani, dar cost total semnificativ mai mare; pe 15 ani economisești zeci de mii de euro</li>
  <li><strong>Fii atent la DAE</strong> (Dobânda Anuală Efectivă) — include toate costurile reale ale creditului, nu doar dobânda nominală</li>
  <li><strong>Rambursarea anticipată</strong> — verifică dacă există penalități (maxim 1% conform legii pentru dobândă variabilă, 0% pentru fixă după expirarea perioadei fixe)</li>
  <li><strong>Asigurarea de viață</strong> — compară ofertele, nu ești obligat să o iei de la bancă (poți economisi 30-50%)</li>
</ul>

<div class="article-highlight"><div class="article-highlight-title">🔑 Concluzii Cheie</div><ul>
  <li><strong>Respectă regula 40%</strong> — niciodată nu te îndatora peste 40% din venitul net; ideal este sub 30% pentru confort financiar.</li>
  <li><strong>Noua Casă merită considerat</strong> — cu doar 5% avans și dobânzi avantajoase, este ideal pentru prima achiziție sub 140.000 EUR.</li>
  <li><strong>Compară minim 3 bănci</strong> — diferența de marjă de 0,5% înseamnă mii de euro pe durata creditului.</li>
  <li><strong>Alege dobândă fixă dacă bugetul e strict</strong> — plătești puțin mai mult, dar ai certitudinea ratei pe 5-10 ani.</li>
  <li><strong>DAE este indicatorul real</strong> — nu te uita doar la dobânda nominală; DAE include toate costurile asociate creditului.</li>
  <li><strong>Procesul durează 3-6 săptămâni</strong> — de la depunerea dosarului până la semnarea contractului la notar.</li>
</ul></div>`,

      en: `<h2>Mortgages in Romania — What You Need to Know</h2>
<p>A mortgage is the most common financing tool for purchasing a home. In Romania, the mortgage market is regulated by the <strong>National Bank of Romania (BNR)</strong>, which imposes strict rules for consumer protection and financial stability.</p>

<h2>Key BNR Regulations</h2>

<h3>Maximum Debt-to-Income Ratio (DTI)</h3>
<p>The maximum DTI is <strong>40% of net monthly income</strong>. This means all your monthly payments (mortgage, credit cards, consumer loans) cannot exceed 40% of your net income. For example, if you earn 5,000 lei net, your maximum total payment is 2,000 lei.</p>

<h3>Minimum Down Payment</h3>
<ul>
  <li><strong>Standard mortgage</strong>: minimum 15% of property value</li>
  <li><strong>Foreign currency mortgage</strong>: minimum 25%</li>
  <li><strong>Noua Casă program</strong>: minimum 5%</li>
</ul>

<h2>Fixed vs Variable Interest Rates</h2>
<p><strong>Fixed rates</strong> remain unchanged for a set period (usually 5-10 years), offering predictability. <strong>Variable rates</strong> fluctuate based on the IRCC index (Reference Index for Consumer Loans) published quarterly by BNR: <strong>IRCC + bank's fixed margin</strong> (typically 1.5-3.5%).</p>

<h2>The Noua Casă Program</h2>
<p>Noua Casă (formerly Prima Casă) is a government program facilitating mortgage access through partial state guarantees:</p>
<ul>
  <li><strong>Maximum value</strong>: €70,000 for existing homes, €140,000 for new construction</li>
  <li><strong>Minimum deposit</strong>: 5%</li>
  <li><strong>Favorable interest</strong>: IRCC + 2-2.5% (variable) or 5-6% (fixed)</li>
  <li>You must not own another property at the time of application</li>
</ul>

<h2>What Banks Evaluate</h2>
<ul>
  <li><strong>Stable income</strong> — permanent contract, minimum 6 months tenure</li>
  <li><strong>Credit history</strong> — Credit Bureau check</li>
  <li><strong>DTI ratio</strong> — below 40% per BNR regulations</li>
  <li><strong>Property appraisal</strong> — authorized evaluator verifies market value</li>
</ul>

<h2>Tips for Getting the Best Terms</h2>
<ul>
  <li>Compare offers from at least 3-4 banks</li>
  <li>Negotiate the margin — banks have flexibility</li>
  <li>Pay attention to the APR (Annual Percentage Rate), not just the nominal rate</li>
  <li>Check early repayment penalties (max 1% by law)</li>
</ul>`,

      fr: `<h2>Les crédits hypothécaires en Roumanie</h2>
<p>Le marché hypothécaire roumain est réglementé par la <strong>Banque Nationale de Roumanie (BNR)</strong>. Le ratio d'endettement maximum est de <strong>40% du revenu net mensuel</strong>.</p>

<h3>Apport minimum</h3>
<ul>
  <li><strong>Crédit standard</strong> : minimum 15%</li>
  <li><strong>Programme Noua Casă</strong> : minimum 5%</li>
</ul>

<h2>Taux fixes vs variables</h2>
<p>Les <strong>taux fixes</strong> restent inchangés pendant 5-10 ans. Les <strong>taux variables</strong> suivent l'indice IRCC + marge fixe de la banque (1,5-3,5%).</p>

<h2>Le programme Noua Casă</h2>
<p>Programme gouvernemental avec garantie partielle de l'État : valeur max 70 000 € (existant) ou 140 000 € (neuf), apport de 5%, taux avantageux.</p>

<h2>Conseils</h2>
<ul>
  <li>Comparez au moins 3-4 banques</li>
  <li>Négociez la marge</li>
  <li>Vérifiez le TAEG, pas seulement le taux nominal</li>
</ul>`,

      de: `<h2>Hypothekenkredite in Rumänien</h2>
<p>Der rumänische Hypothekenmarkt wird von der <strong>Nationalbank Rumäniens (BNR)</strong> reguliert. Die maximale Schuldendienstquote beträgt <strong>40% des monatlichen Nettoeinkommens</strong>.</p>

<h3>Mindestanzahlung</h3>
<ul>
  <li><strong>Standardhypothek</strong>: mindestens 15%</li>
  <li><strong>Noua-Casă-Programm</strong>: mindestens 5%</li>
</ul>

<h2>Feste vs. variable Zinssätze</h2>
<p><strong>Festzinsen</strong> bleiben 5-10 Jahre unverändert. <strong>Variable Zinsen</strong> folgen dem IRCC-Index + feste Bankmarge (1,5-3,5%).</p>

<h2>Das Noua-Casă-Programm</h2>
<p>Staatsprogramm mit Teilgarantie: max. 70.000 € (Bestand) oder 140.000 € (Neubau), 5% Anzahlung, günstige Konditionen.</p>

<h2>Tipps</h2>
<ul>
  <li>Vergleichen Sie mindestens 3-4 Banken</li>
  <li>Verhandeln Sie die Marge</li>
  <li>Achten Sie auf den effektiven Jahreszins</li>
</ul>`,
    },
    coverImage:
      "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&q=80",
    category: "guide",
    tags: [
      "credit-ipotecar",
      "BNR",
      "dobândă",
      "Noua-Casă",
      "finanțare",
      "bănci",
    ],
    publishedAt: "2026-04-03T10:00:00.000Z",
    authorName: "Echipa Reveria",
    authorAvatar: null,
    readTimeMinutes: 10,
  },

  // ─── 3. Top Neighborhoods for Investment in Transylvania ───
  {
    slug: "top-cartiere-investitii-transilvania",
    title: {
      en: "Top Neighborhoods for Investment in Transylvania",
      ro: "Top cartiere pentru investiții în Transilvania",
      fr: "Meilleurs quartiers pour investir en Transylvanie",
      de: "Top-Viertel für Investitionen in Siebenbürgen",
    },
    excerpt: {
      en: "Discover the most promising neighborhoods for real estate investment in Transylvania: from Cluj-Napoca's tech-driven growth to Brașov's tourism appeal and Sibiu's cultural charm.",
      ro: "Descoperă cele mai promițătoare cartiere pentru investiții imobiliare în Transilvania: de la creșterea tech din Cluj-Napoca la atracția turistică a Brașovului și farmecul cultural al Sibiului.",
      fr: "Découvrez les quartiers les plus prometteurs pour l'investissement immobilier en Transylvanie : de la croissance tech de Cluj à l'attrait touristique de Brașov.",
      de: "Entdecken Sie die vielversprechendsten Viertel für Immobilieninvestitionen in Siebenbürgen: von Cluj-Napocas Tech-Wachstum bis zu Brașovs Tourismusattraktivität.",
    },
    content: {
      ro: `<h2>Transilvania — noua frontieră a investițiilor imobiliare</h2>

<div class="article-stats-grid">
  <div class="article-stat"><div class="article-stat-value">€1.800-2.400/m²</div><div class="article-stat-label">Cluj-Napoca — preț mediu</div></div>
  <div class="article-stat"><div class="article-stat-value">€1.400-2.500/m²</div><div class="article-stat-label">Brașov — preț mediu</div></div>
  <div class="article-stat"><div class="article-stat-value">€1.300-1.800/m²</div><div class="article-stat-label">Sibiu — preț mediu</div></div>
  <div class="article-stat"><div class="article-stat-value">€1.200-1.700/m²</div><div class="article-stat-label">Oradea — preț mediu</div></div>
  <div class="article-stat"><div class="article-stat-value">5-10%</div><div class="article-stat-label">Randament mediu închiriere</div></div>
</div>

<p>Transilvania a devenit una dintre cele mai atractive regiuni pentru investiții imobiliare din Europa Centrală și de Est. Combinația unică de orașe universitare, hub-uri IT, patrimoniu cultural și calitate a vieții excelentă atrage atât investitori locali, cât și internaționali. În ultimii 5 ani, prețurile proprietăților din principalele orașe transilvănene au crescut cu 30-60%, iar tendința este de continuare a acestei aprecieri.</p>

<div class="article-callout article-callout-info">
  <div class="article-callout-title">💡 De Ce Transilvania?</div>
  <p>Transilvania combină mai mulți factori unici care o fac atractivă pentru investitori: <strong>ecosistem IT puternic</strong> (Cluj-Napoca este al doilea hub tech din Europa de Est), <strong>turism în creștere</strong> (Brașov atrage peste 1 milion de turiști anual), <strong>universități de prestigiu</strong> (peste 150.000 de studenți în regiune), <strong>calitate a vieții superioară</strong> (aer curat, natură spectaculoasă, siguranță), și <strong>prețuri încă accesibile</strong> comparativ cu capitalele vest-europene — un apartament în Cluj costă de 3-4 ori mai puțin decât unul similar în Viena sau München.</p>
</div>

<figure class="article-figure"><img src="https://images.unsplash.com/photo-1587974928442-77dc3e0dba72?w=800&q=80" alt="Panoramă Cluj-Napoca cu clădiri istorice și moderne" /><figcaption>Cluj-Napoca — capitala neoficială a Transilvaniei și cel mai dinamic hub IT din România</figcaption></figure>

<h2>Cluj-Napoca — capitala neoficială a Transilvaniei</h2>
<p>Cu cel mai dinamic ecosistem IT din România și o comunitate universitară de peste 80.000 de studenți, Cluj-Napoca oferă randamente solide și apreciere constantă a proprietăților. Orașul găzduiește sediile unor companii precum Bosch, NTT Data, Endava și sute de startup-uri tech, ceea ce generează o cerere constantă de locuințe pentru profesioniști cu venituri peste medie.</p>

<h3>Bună Ziua</h3>
<p>Cartier rezidențial modern, dezvoltat masiv în ultimii 10 ani. Ideal pentru familii tinere și profesioniști IT. <strong>Preț mediu:</strong> 1.800-2.200 EUR/m². <strong>Randament închiriere:</strong> 5-6%. Acces rapid la Iulius Mall și centrul orașului prin transport public. Dezvoltări rezidențiale noi de calitate superioară și infrastructură verde în expansiune.</p>

<h3>Mărăști</h3>
<p>Unul dintre cele mai căutate cartiere, cu mix de blocuri vechi renovate și proiecte noi. Aproape de Universitatea Tehnică și parcul IQ. <strong>Preț mediu:</strong> 1.900-2.400 EUR/m². <strong>Randament închiriere:</strong> 5-7%, datorită cererii mari de la studenți și tineri profesioniști. Zona este bine deservită de transport public și are acces la multiple centre comerciale.</p>

<h3>Gheorgheni</h3>
<p>Cartier echilibrat, cu infrastructură matură — școli, magazine, transport. Ideal pentru investiții pe termen lung. <strong>Preț mediu:</strong> 1.700-2.100 EUR/m². Aproape de Iulius Town și VIVO. Comunitate stabilă, cu un mix de familii și tineri profesioniști.</p>

<h3>Florești (zona metropolitană)</h3>
<p>Deși tehnic în afara Clujului, Florești oferă cele mai accesibile prețuri din zona metropolitană. <strong>Preț mediu:</strong> 1.200-1.600 EUR/m². Potrivit pentru investitori cu buget limitat, dar atenție la infrastructura rutieră încă în dezvoltare. Proiectul de metrou Cluj-Florești ar putea transforma radical accesibilitatea acestei zone în următorii ani.</p>

<h2>Brașov — poarta Transilvaniei</h2>
<p>Brașov beneficiază de turism puternic, proximitatea stațiunilor montane și un centru istoric spectaculos. Este al doilea cel mai popular oraș pentru relocare din România, atrăgând profesioniști care lucrează remote și doresc o calitate a vieții superioară.</p>

<figure class="article-figure"><img src="https://images.unsplash.com/photo-1590846083693-f23fdede3a7e?w=800&q=80" alt="Panoramă Brașov cu Turnul Negru și Munții Carpați" /><figcaption>Brașov — un centru istoric spectaculos la poalele Munților Carpați, magnet pentru turiști și investitori</figcaption></figure>

<h3>Astra</h3>
<p>Cartier mixt, cu proiecte noi și clădiri renovate. Bună conectivitate și aproape de zona industrială. <strong>Preț mediu:</strong> 1.400-1.800 EUR/m². <strong>Randament:</strong> 5-6%, cu potențial de creștere datorită dezvoltărilor planificate. Zonă în plină expansiune cu proiecte rezidențiale noi.</p>

<h3>Centru Vechi și Schei</h3>
<p>Zone premium pentru chirii pe termen scurt (Airbnb). <strong>Preț mediu:</strong> 1.800-2.500 EUR/m². <strong>Randament Airbnb:</strong> 7-10% în sezon, datorită fluxului turistic constant. Cererea de Airbnb este consistentă pe tot parcursul anului, cu vârf în sezonul de iarnă (proximitatea Poiana Brașov) și vară.</p>

<h3>Tractorul</h3>
<p>Cartier în revitalizare cu prețuri încă accesibile. <strong>Preț mediu:</strong> 1.100-1.500 EUR/m². Potrivit pentru investitori care caută apreciere pe termen mediu-lung. Zona beneficiază de proiecte de regenerare urbană și o comunitate în creștere de tineri profesioniști.</p>

<h2>Tabel comparativ complet — cartiere și randamente</h2>

<div class="article-table-wrapper"><table class="article-table">
  <thead><tr><th>Cartier</th><th>Oraș</th><th>Preț/m² (EUR)</th><th>Randament (%)</th><th>Profil cumpărător</th></tr></thead>
  <tbody>
    <tr><td><strong>Bună Ziua</strong></td><td>Cluj-Napoca</td><td>1.800-2.200</td><td>5-6%</td><td>Familii tinere, profesioniști IT</td></tr>
    <tr><td><strong>Mărăști</strong></td><td>Cluj-Napoca</td><td>1.900-2.400</td><td>5-7%</td><td>Studenți, tineri profesioniști</td></tr>
    <tr><td><strong>Gheorgheni</strong></td><td>Cluj-Napoca</td><td>1.700-2.100</td><td>4-6%</td><td>Investitori pe termen lung</td></tr>
    <tr><td><strong>Florești</strong></td><td>Cluj (metropolitan)</td><td>1.200-1.600</td><td>5-6%</td><td>Buget limitat, prima achiziție</td></tr>
    <tr><td><strong>Astra</strong></td><td>Brașov</td><td>1.400-1.800</td><td>5-6%</td><td>Familii, profesioniști remote</td></tr>
    <tr><td><strong>Centru Vechi</strong></td><td>Brașov</td><td>1.800-2.500</td><td>7-10%</td><td>Investitori Airbnb, turism</td></tr>
    <tr><td><strong>Tractorul</strong></td><td>Brașov</td><td>1.100-1.500</td><td>5-6%</td><td>Investitori valoare, termen lung</td></tr>
    <tr><td><strong>Centru Istoric</strong></td><td>Sibiu</td><td>1.500-2.000</td><td>6-8%</td><td>Airbnb, expatriați</td></tr>
    <tr><td><strong>Ștrand</strong></td><td>Sibiu</td><td>1.200-1.600</td><td>5-6%</td><td>Familii, rezidențial accesibil</td></tr>
    <tr><td><strong>Centru</strong></td><td>Oradea</td><td>1.200-1.700</td><td>6-8%</td><td>Investitori în creștere urbană</td></tr>
  </tbody>
</table></div>

<h2>Sibiu — bijuteria culturală</h2>
<p>Capitală culturală europeană în 2007, Sibiu continuă să atragă prin festivaluri internaționale (FITS, festivalul de jazz), o comunitate expatriată în creștere și o calitate a vieții de top. <strong>Preț mediu oraș:</strong> 1.300-1.800 EUR/m². Zone de interes: Centrul Istoric (premium, Airbnb, 1.500-2.000 EUR/m²), Ștrand (rezidențial accesibil, 1.200-1.600 EUR/m²), Cisnădie (periferie, prețuri de pornire atractive). Sibiul oferă un echilibru excelent între calitatea vieții și randamentul investiției.</p>

<h2>Oradea — surpriza pieței</h2>
<p>Oradea a avut cea mai spectaculoasă transformare urbană din România. Investiții masive în reabilitare urbană, termalisme (Aquapark-ul și băile Felix), infrastructură modernă și revitalizarea centrului istoric art nouveau. <strong>Preț mediu:</strong> 1.200-1.700 EUR/m². <strong>Randament:</strong> 6-8%, datorită prețurilor încă accesibile și cererii în creștere rapidă. Oradea este considerată de mulți analiști drept „următorul Cluj" în termeni de apreciere a proprietăților.</p>

<div class="article-callout article-callout-tip">
  <div class="article-callout-title">💚 Cele Mai Bune Alegeri pentru ROI</div>
  <p>Dacă prioritatea ta este <strong>randamentul maxim</strong>, concentrează-te pe: <strong>Centru Vechi Brașov</strong> (7-10% randament Airbnb), <strong>Oradea centru</strong> (6-8% cu prețuri încă mici și potențial mare de apreciere) și <strong>Mărăști Cluj</strong> (5-7% cu cerere constantă de la studenți). Pentru <strong>apreciere maximă pe termen lung</strong>, privește spre cartierele noi din Cluj (Bună Ziua, Europa Unită) și zonele în revitalizare din Brașov (Tractorul, Bartolomeu).</p>
</div>

<h2>Cluj vs. Brașov — comparație pentru investitori</h2>

<div class="article-pros-cons"><div class="article-pros"><div class="article-pros-title">✓ Avantaje Cluj-Napoca</div><ul><li>Cel mai puternic ecosistem IT din România — cerere constantă de locuințe</li><li>Piață matură cu lichiditate ridicată — vinzi rapid când dorești</li><li>Apreciere constantă de 8-12% anual în ultimii 5 ani</li><li>Comunitate universitară de 80.000+ studenți — cerere garantată de chirii</li><li>Salarii medii cele mai mari din țară (după București) — chiriașii plătesc la timp</li></ul></div><div class="article-cons"><div class="article-cons-title">✓ Avantaje Brașov</div><ul><li>Prețuri cu 20-30% mai mici decât în Cluj — punct de intrare mai accesibil</li><li>Turism puternic tot anul — randamente Airbnb de 7-10%</li><li>Calitate a vieții superioară — munți, aer curat, natură la 15 minute</li><li>Creștere rapidă a sectorului remote work — profesioniști IT se relocă din București</li><li>Potențial de apreciere mai mare — piața nu este încă saturată</li></ul></div></div>

<h2>Concluzii și recomandări</h2>
<ul>
  <li><strong>Buget limitat (&lt;100.000 EUR)</strong>: Florești (Cluj metropolitan), Tractorul (Brașov), Oradea centru — prețuri de pornire de la 1.100 EUR/m²</li>
  <li><strong>Randament maxim chirii</strong>: Mărăști (Cluj, 5-7%), Centru Vechi (Brașov, 7-10% Airbnb), Oradea (6-8%)</li>
  <li><strong>Apreciere pe termen lung</strong>: Bună Ziua (Cluj), Astra (Brașov), Sibiu centru — zone cu potențial de dezvoltare mare</li>
  <li><strong>Chirii pe termen scurt (Airbnb)</strong>: Centru Vechi Brașov, Centru Istoric Sibiu — randamente premium din turism</li>
</ul>

<div class="article-highlight"><div class="article-highlight-title">🔑 Recomandări de Investiție</div><ul>
  <li><strong>Diversifică pe mai multe orașe</strong> — nu pune tot capitalul într-o singură locație; combinația Cluj + Brașov sau Cluj + Oradea oferă echilibru între stabilitate și creștere.</li>
  <li><strong>Prioritizează proximitatea transportului</strong> — apartamentele aproape de stații de autobuz sau viitoarele linii de metrou (Cluj) se apreciază semnificativ mai rapid.</li>
  <li><strong>Apartamentele cu 2 camere sunt cele mai lichide</strong> — se închiriază cel mai rapid și au cel mai mare bazin de potențiali cumpărători la revânzare.</li>
  <li><strong>Oradea este oportunitatea momentului</strong> — prețuri încă accesibile cu cel mai mare potențial de apreciere din regiune pe următorii 5 ani.</li>
  <li><strong>Airbnb în Brașov necesită management activ</strong> — randamentele de 7-10% sunt reale, dar implică efort de administrare sau costuri de property management (15-20% din venit).</li>
  <li><strong>Verifică întotdeauna planurile urbanistice</strong> — un proiect de infrastructură (drum, mall, spital) poate crește valoarea cu 15-25% în 2-3 ani.</li>
</ul></div>`,

      en: `<h2>Transylvania — The New Frontier for Property Investment</h2>
<p>Transylvania has become one of the most attractive regions for real estate investment in Central and Eastern Europe. The unique combination of university cities, IT hubs, cultural heritage, and excellent quality of life attracts both local and international investors.</p>

<h2>Cluj-Napoca — Transylvania's Unofficial Capital</h2>
<p>With Romania's most dynamic IT ecosystem and over 80,000 university students, Cluj-Napoca offers solid yields and consistent property appreciation.</p>

<h3>Bună Ziua</h3>
<p>Modern residential neighborhood developed over the last decade. Ideal for young families and IT professionals. <strong>Average price:</strong> €1,800-2,200/m². <strong>Rental yield:</strong> 5-6%.</p>

<h3>Mărăști</h3>
<p>One of the most sought-after areas, with a mix of renovated blocks and new projects. Near the Technical University. <strong>Average price:</strong> €1,900-2,400/m². <strong>Rental yield:</strong> 5-7%.</p>

<h3>Gheorgheni</h3>
<p>Balanced neighborhood with mature infrastructure. <strong>Average price:</strong> €1,700-2,100/m². Great for long-term investments.</p>

<h2>Brașov — Gateway to Transylvania</h2>

<h3>Astra</h3>
<p>Mixed area with new projects. <strong>Average price:</strong> €1,400-1,800/m². <strong>Yield:</strong> 5-6%.</p>

<h3>Old Town (Centru Vechi)</h3>
<p>Premium zone for short-term rentals (Airbnb). <strong>Average price:</strong> €1,800-2,500/m². <strong>Airbnb yield:</strong> 7-10% in season.</p>

<h2>Sibiu — The Cultural Jewel</h2>
<p>European Capital of Culture in 2007, Sibiu continues to attract with festivals and expat community. <strong>Average city price:</strong> €1,300-1,800/m².</p>

<h2>Oradea — The Market Surprise</h2>
<p>Oradea has seen Romania's most spectacular urban transformation. <strong>Average price:</strong> €1,200-1,700/m². <strong>Yield:</strong> 6-8%.</p>

<h2>Recommendations</h2>
<ul>
  <li><strong>Limited budget (&lt;€100,000)</strong>: Florești, Tractorul (Brașov), Oradea</li>
  <li><strong>Maximum yield</strong>: Mărăști (Cluj), Old Town (Brașov), Oradea</li>
  <li><strong>Long-term appreciation</strong>: Bună Ziua (Cluj), Astra (Brașov), Sibiu center</li>
</ul>`,

      fr: `<h2>La Transylvanie — nouvelle frontière de l'investissement</h2>
<p>La Transylvanie est devenue l'une des régions les plus attrayantes pour l'investissement immobilier en Europe centrale et orientale.</p>

<h2>Cluj-Napoca</h2>
<p>Hub IT majeur avec plus de 80 000 étudiants. Quartiers clés :</p>
<ul>
  <li><strong>Bună Ziua</strong> : 1 800-2 200 €/m², rendement 5-6%</li>
  <li><strong>Mărăști</strong> : 1 900-2 400 €/m², rendement 5-7%</li>
  <li><strong>Gheorgheni</strong> : 1 700-2 100 €/m%</li>
</ul>

<h2>Brașov</h2>
<ul>
  <li><strong>Astra</strong> : 1 400-1 800 €/m², rendement 5-6%</li>
  <li><strong>Centre historique</strong> : 1 800-2 500 €/m², rendement Airbnb 7-10%</li>
</ul>

<h2>Sibiu et Oradea</h2>
<p>Sibiu : 1 300-1 800 €/m². Oradea : 1 200-1 700 €/m², rendement 6-8%.</p>`,

      de: `<h2>Siebenbürgen — Die neue Investitionsgrenze</h2>
<p>Siebenbürgen ist zu einer der attraktivsten Regionen für Immobilieninvestitionen in Mittel- und Osteuropa geworden.</p>

<h2>Cluj-Napoca</h2>
<p>Wichtiger IT-Hub mit über 80.000 Studenten. Schlüsselviertel:</p>
<ul>
  <li><strong>Bună Ziua</strong>: 1.800-2.200 €/m², Rendite 5-6%</li>
  <li><strong>Mărăști</strong>: 1.900-2.400 €/m², Rendite 5-7%</li>
  <li><strong>Gheorgheni</strong>: 1.700-2.100 €/m²</li>
</ul>

<h2>Brașov</h2>
<ul>
  <li><strong>Astra</strong>: 1.400-1.800 €/m², Rendite 5-6%</li>
  <li><strong>Altstadt</strong>: 1.800-2.500 €/m², Airbnb-Rendite 7-10%</li>
</ul>

<h2>Sibiu und Oradea</h2>
<p>Sibiu: 1.300-1.800 €/m². Oradea: 1.200-1.700 €/m², Rendite 6-8%.</p>`,
    },
    coverImage:
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80",
    category: "guide",
    tags: [
      "investiții",
      "cartiere",
      "Cluj-Napoca",
      "Brașov",
      "Sibiu",
      "Oradea",
      "randament",
    ],
    publishedAt: "2026-04-05T09:00:00.000Z",
    authorName: "Echipa Reveria",
    authorAvatar: null,
    readTimeMinutes: 8,
  },

  // ─── 4. Hidden Costs When Buying Property ───
  {
    slug: "costuri-ascunse-achizitie-proprietate",
    title: {
      en: "Hidden Costs When Buying Property in Romania",
      ro: "Costuri ascunse la achiziția unei proprietăți în România",
      fr: "Coûts cachés lors de l'achat d'une propriété en Roumanie",
      de: "Versteckte Kosten beim Immobilienkauf in Rumänien",
    },
    excerpt: {
      en: "Beyond the purchase price: notary fees, land registry costs, agent commissions, renovation budgets, utility transfers, and insurance — everything you need to budget for.",
      ro: "Dincolo de prețul de achiziție: taxe notariale, costuri de intabulare, comisioane de agenție, bugete de renovare, transferuri de utilități și asigurări — tot ce trebuie să bugetezi.",
      fr: "Au-delà du prix d'achat : frais de notaire, cadastre, commissions d'agence, rénovation, transferts d'utilités et assurances — tout ce qu'il faut budgéter.",
      de: "Über den Kaufpreis hinaus: Notargebühren, Grundbuchkosten, Maklerprovisionen, Renovierungsbudgets, Versorgungsumstellungen und Versicherungen.",
    },
    content: {
      ro: `<h2>Costurile pe care nu le vezi la prima vedere</h2>

<div class="article-stats-grid"><div class="article-stat"><div class="article-stat-value">4-9%</div><div class="article-stat-label">Costuri totale adiționale</div></div><div class="article-stat"><div class="article-stat-value">~€1.500</div><div class="article-stat-label">Taxă notar (medie)</div></div><div class="article-stat"><div class="article-stat-value">2-3%</div><div class="article-stat-label">Comision agenție</div></div><div class="article-stat"><div class="article-stat-value">0,15%</div><div class="article-stat-label">Intabulare standard</div></div></div>

<p>Când îți planifici bugetul pentru o proprietate, prețul afișat este doar punctul de plecare. Costurile adiționale pot adăuga <strong>5-12% la prețul total</strong>, iar neplanificarea lor este una dintre cele mai frecvente greșeli ale cumpărătorilor. Mulți dintre cei care achiziționează pentru prima dată se concentrează exclusiv pe prețul proprietății, fără să ia în calcul taxele notariale, comisioanele de intermediere sau costurile de renovare — cheltuieli care, împreună, pot transforma o achiziție aparent accesibilă într-o povară financiară.</p>

<figure class="article-figure"><img src="https://images.unsplash.com/photo-1554224155-8d4c2b643db0?w=800&q=80" alt="Documente și acte pentru achiziția unei proprietăți" /><figcaption>Pregătirea documentelor și calcularea costurilor reale ale achiziției</figcaption></figure>

<div class="article-callout article-callout-warning"><div class="article-callout-title">⚠️ Atenție</div><p>Mulți cumpărători subestimează costurile adiționale cu 30-50%. Un buget incomplet poate duce la blocaje în tranzacție sau la imposibilitatea finalizării achiziției. Planifică întotdeauna un tampon de <strong>10-15%</strong> peste prețul proprietății.</p></div>

<h2>1. Taxele și onorariul notarial</h2>
<p>Contractul de vânzare-cumpărare se încheie obligatoriu la notar. Onorariul notarului este reglementat prin lege și se calculează progresiv, pe tranșe, în funcție de valoarea tranzacției. Aceasta înseamnă că fiecare tranșă de valoare are un procent diferit, iar costul final rezultă din însumarea calculelor pentru fiecare tranșă.</p>

<div class="article-callout article-callout-info"><div class="article-callout-title">ℹ️ Cum funcționează tranșele notariale (în RON)</div><p>Onorariul se calculează progresiv: până la 15.000 lei → 2,2% (minim 150 lei); 15.001-30.000 lei → 330 lei + 1,98% din diferență; 30.001-60.000 lei → 627 lei + 1,65% din diferență; 60.001-300.000 lei → 1.122,5 lei + 1,1% din diferență; peste 300.000 lei → 3.762,5 lei + 0,44% din diferență. La toate se adaugă <strong>TVA 19%</strong>. Calculul se face în lei, la cursul BNR din ziua tranzacției.</p></div>

<p>Pentru un apartament de 100.000 EUR (~500.000 lei), onorariul notarial este de aproximativ <strong>1.500-2.000 EUR</strong> (cu TVA). Pe lângă onorariul propriu-zis, se adaugă și taxele de autentificare și costul extraselor necesare.</p>

<h3>Impozitul pe transferul proprietății</h3>
<p>Se aplică un impozit de <strong>3%</strong> din valoarea proprietății dacă aceasta depășește 450.000 lei. Sub acest prag, impozitul este de <strong>1%</strong>. Există scutire pentru prima locuință sub un anumit prag, dar condițiile se schimbă frecvent, așa că verifică legislația în vigoare la momentul tranzacției.</p>

<h2>2. Intabularea (înscrierea în cartea funciară)</h2>
<p>După semnarea contractului, proprietatea trebuie înscrisă în cartea funciară la OCPI (Oficiul de Cadastru și Publicitate Imobiliară). Costul depinde de tipul operațiunii și urgența solicitată:</p>
<ul>
  <li><strong>Intabulare standard</strong>: 0,15% din valoarea proprietății (termen: 5-15 zile lucrătoare)</li>
  <li><strong>Intabulare urgentă</strong> (1 zi lucrătoare): 0,50% din valoarea proprietății</li>
  <li><strong>Extras de carte funciară</strong>: 20-50 lei per exemplar</li>
</ul>
<p>Pentru 100.000 EUR, intabularea standard costă aproximativ <strong>150 EUR</strong>. Deși pare o sumă mică, este un pas obligatoriu fără de care nu devii proprietar legal al imobilului.</p>

<h2>3. Comisioanele de agenție</h2>
<p>Dacă tranzacția este intermediată de o agenție imobiliară, comisionul este de obicei:</p>
<ul>
  <li><strong>Cumpărător</strong>: 1-3% din prețul de vânzare (plus TVA)</li>
  <li><strong>Vânzător</strong>: 2-3% din prețul de vânzare (plus TVA)</li>
</ul>
<p>Unele agenții percep comision fix, iar altele negociază procente diferite în funcție de valoarea proprietății. Este important de menționat că, în România, nu există o reglementare strictă a comisioanelor — ele se negociază liber.</p>

<div class="article-callout article-callout-tip"><div class="article-callout-title">💡 Sfat practic</div><p>Comisionul agenției este <strong>negociabil</strong>. Dacă tranzacția este de valoare mare (peste 150.000 EUR), poți solicita un procent mai mic sau un comision plafonat. De asemenea, verifică ce servicii sunt incluse — unele agenții oferă asistență juridică inclusă în comision. La Reveria, conectăm cumpărătorii direct cu proprietățile, reducând semnificativ costurile de intermediere.</p></div>

<h2>4. Costuri legate de credit ipotecar</h2>
<p>Dacă achiziționezi cu credit ipotecar, bugetul tău trebuie să includă o serie de costuri suplimentare pe care băncile le percep pentru procesarea și administrarea creditului:</p>
<ul>
  <li><strong>Comision de analiză dosar</strong>: 0-0,5% din valoarea creditului (unele bănci l-au eliminat)</li>
  <li><strong>Evaluarea proprietății</strong>: 200-500 EUR (realizată de un evaluator autorizat ANEVAR)</li>
  <li><strong>Asigurare imobil</strong>: 100-300 EUR/an (obligatorie pe toată durata creditului)</li>
  <li><strong>Asigurare de viață</strong>: 0,1-0,3% din soldul creditului/an (de obicei obligatorie)</li>
  <li><strong>Comision FNGCIMM</strong> (pentru Noua Casă): 0,35-0,45%/an din soldul garanției</li>
</ul>
<p>Pe durata întregului credit, aceste costuri se acumulează semnificativ. De exemplu, asigurarea imobilului și cea de viață pot totaliza 3.000-5.000 EUR pe 30 de ani.</p>

<h2>5. Renovare și amenajare</h2>

<figure class="article-figure"><img src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80" alt="Lucrări de renovare într-un apartament" /><figcaption>Renovarea completă a unui apartament poate costa între 250-500 EUR/m²</figcaption></figure>

<p>Nu subestima costurile de renovare, chiar și pentru proprietăți noi. Apartamentele livrate la stadiul de „semifinisat" necesită investiții substanțiale pentru a deveni locuibile, iar cele vechi pot ascunde surprize neplăcute — instalații electrice depășite, țevi uzate sau probleme structurale.</p>
<ul>
  <li><strong>Apartament nou (semifinisat)</strong>: 150-350 EUR/m² pentru finisaje complete (pardoseală, zugrăveli, faianță, obiecte sanitare)</li>
  <li><strong>Apartament vechi (renovare completă)</strong>: 250-500 EUR/m² (include schimbarea instalațiilor)</li>
  <li><strong>Mobilier și electrocasnice</strong>: 5.000-15.000 EUR pentru un apartament cu 2 camere</li>
  <li><strong>Bucătărie pe comandă</strong>: 3.000-8.000 EUR (fără electrocasnice)</li>
</ul>
<p>Pentru un apartament de 60 m² semifinisat, costul total al finisajelor și mobilării poate ajunge la <strong>15.000-30.000 EUR</strong> — o sumă pe care mulți cumpărători o ignoră complet în calculul inițial.</p>

<h2>6. Transferul utilităților</h2>
<p>Odată ce ești proprietar, trebuie să transferi sau să închei contracte noi pentru utilități. Deși costurile individuale sunt mici, ele se adună:</p>
<ul>
  <li><strong>Contract nou electricitate</strong>: 50-200 lei (plus eventualul contor inteligent)</li>
  <li><strong>Contract nou gaz</strong>: 50-150 lei</li>
  <li><strong>Branșament apă/canalizare</strong>: gratuit la transfer, 500-2.000 lei pentru branșament nou</li>
  <li><strong>Internet/TV</strong>: gratuit (contract nou la orice furnizor)</li>
</ul>

<h2>7. Asigurarea obligatorie a locuinței (PAD)</h2>
<p>Polița PAD (asigurare obligatorie împotriva dezastrelor naturale — cutremure, inundații, alunecări de teren) costă <strong>20 EUR/an</strong> pentru apartamente și <strong>10-20 EUR/an</strong> pentru case. Este obligatorie prin lege, iar lipsa poliței poate atrage amenzi de până la 500 lei.</p>

<h2>Tabel recapitulativ — costuri adiționale</h2>

<div class="article-table-wrapper"><table class="article-table"><thead><tr><th>Tip cost</th><th>Procent / Sumă</th><th>Exemplu: €100.000</th><th>Exemplu: €200.000</th></tr></thead><tbody><tr><td>Onorariu notar + taxe</td><td>1,5-2%</td><td>1.500-2.000 €</td><td>2.500-3.500 €</td></tr><tr><td>Impozit transfer proprietate</td><td>1-3%</td><td>1.000-3.000 €</td><td>2.000-6.000 €</td></tr><tr><td>Intabulare (standard)</td><td>0,15%</td><td>150 €</td><td>300 €</td></tr><tr><td>Comision agenție (cumpărător)</td><td>1-3%</td><td>1.000-3.000 €</td><td>2.000-6.000 €</td></tr><tr><td>Evaluare + dosar credit</td><td>sumă fixă</td><td>300-700 €</td><td>300-700 €</td></tr><tr><td>Asigurări (primul an)</td><td>variabil</td><td>200-500 €</td><td>300-800 €</td></tr><tr><td><strong>TOTAL costuri adiționale</strong></td><td><strong>4-9%</strong></td><td><strong>4.150-9.350 €</strong></td><td><strong>7.400-17.300 €</strong></td></tr></tbody></table></div>

<p>Observă cum, la o proprietate de 200.000 EUR, costurile adiționale pot depăși <strong>17.000 EUR</strong> — o sumă echivalentă cu avansul minim cerut de majoritatea băncilor. De aceea, planificarea detaliată a bugetului nu este opțională, ci esențială.</p>

<div class="article-highlight"><div class="article-highlight-title">🔑 Concluzii Cheie</div><ul><li>Costurile adiționale totale variază între <strong>4% și 9%</strong> din prețul proprietății, fără a include renovarea</li><li>Onorariul notarial și impozitul de transfer reprezintă cele mai mari cheltuieli fixe: <strong>2.500-5.000 EUR</strong> la €100.000</li><li>Bugetează întotdeauna un <strong>tampon de 10-15%</strong> peste prețul afișat al proprietății</li><li>Comisionul agenției este <strong>negociabil</strong> — nu accepta prima ofertă fără discuție</li><li>Renovarea poate adăuga <strong>15.000-30.000 EUR</strong> pentru un apartament mediu — include-o în calculele tale</li><li>Compară ofertele de credit ipotecar la minimum <strong>3-4 bănci</strong> pentru a obține cele mai bune condiții</li></ul></div>`,

      en: `<h2>Costs You Don't See at First Glance</h2>
<p>When planning your property budget, the listed price is just the starting point. Additional costs can add <strong>5-12% to the total price</strong>, and not planning for them is one of the most common buyer mistakes.</p>

<h2>1. Notary Fees and Taxes</h2>
<p>The sale contract must be concluded at a notary. The notary fee is calculated progressively based on transaction value. For a €100,000 apartment, expect approximately <strong>€1,500-2,000</strong> (including VAT). Additionally, a property transfer tax of <strong>1-3%</strong> applies depending on value.</p>

<h2>2. Land Registry (Intabulare)</h2>
<p>Registration costs about <strong>0.15%</strong> of property value (standard) or 0.50% for urgent processing. For €100,000, that's roughly <strong>€150</strong>.</p>

<h2>3. Agency Commissions</h2>
<p>If using an agent: buyer commission is typically <strong>1-3%</strong>, seller commission <strong>2-3%</strong> (plus VAT). At Reveria, we connect buyers directly with properties, significantly reducing intermediation costs.</p>

<h2>4. Mortgage-Related Costs</h2>
<ul>
  <li><strong>Processing fee</strong>: 0-0.5% of loan value</li>
  <li><strong>Property appraisal</strong>: €200-500</li>
  <li><strong>Property insurance</strong>: €100-300/year</li>
  <li><strong>Life insurance</strong>: 0.1-0.3% of outstanding balance/year</li>
</ul>

<h2>5. Renovation and Furnishing</h2>
<ul>
  <li><strong>New apartment (semi-finished)</strong>: €150-350/m² for complete finishes</li>
  <li><strong>Old apartment (full renovation)</strong>: €250-500/m²</li>
  <li><strong>Furniture and appliances</strong>: €5,000-15,000</li>
</ul>

<h2>6. Utility Transfers</h2>
<p>Electricity, gas, water contract transfers: €50-200 total. Mandatory home insurance (PAD): €10-20/year.</p>

<h2>Summary — €100,000 Property</h2>
<p><strong>Total additional costs: approximately €4,150-9,350 (4-9%)</strong></p>`,

      fr: `<h2>Les coûts cachés de l'achat immobilier</h2>
<p>Les coûts supplémentaires peuvent ajouter <strong>5-12%</strong> au prix total.</p>
<ul>
  <li><strong>Frais de notaire</strong> : ~1 500-2 000 € pour un bien à 100 000 €</li>
  <li><strong>Taxe de transfert</strong> : 1-3%</li>
  <li><strong>Inscription cadastrale</strong> : 0,15%</li>
  <li><strong>Commission d'agence</strong> : 1-3% (acheteur)</li>
  <li><strong>Évaluation + frais de dossier</strong> : 300-700 €</li>
  <li><strong>Rénovation</strong> : 150-500 €/m²</li>
</ul>
<p><strong>Total : environ 4 150-9 350 € (4-9%)</strong></p>`,

      de: `<h2>Versteckte Kosten beim Immobilienkauf</h2>
<p>Zusatzkosten können <strong>5-12%</strong> zum Gesamtpreis hinzufügen.</p>
<ul>
  <li><strong>Notargebühren</strong>: ~1.500-2.000 € bei 100.000 €</li>
  <li><strong>Übertragungssteuer</strong>: 1-3%</li>
  <li><strong>Grundbucheintragung</strong>: 0,15%</li>
  <li><strong>Maklerprovision</strong>: 1-3% (Käufer)</li>
  <li><strong>Bewertung + Bearbeitungsgebühren</strong>: 300-700 €</li>
  <li><strong>Renovierung</strong>: 150-500 €/m²</li>
</ul>
<p><strong>Gesamt: ca. 4.150-9.350 € (4-9%)</strong></p>`,
    },
    coverImage:
      "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1200&q=80",
    category: "guide",
    tags: [
      "costuri",
      "taxe",
      "notar",
      "intabulare",
      "comision",
      "renovare",
      "buget",
    ],
    publishedAt: "2026-04-06T11:00:00.000Z",
    authorName: "Echipa Reveria",
    authorAvatar: null,
    readTimeMinutes: 7,
  },

  // ─── 5. Transylvania Real Estate Market Report 2026 ───
  {
    slug: "piata-imobiliara-transilvania-raport-2026",
    title: {
      en: "Transylvania Real Estate Market Report 2026",
      ro: "Raport piața imobiliară Transilvania 2026",
      fr: "Rapport du marché immobilier de Transylvanie 2026",
      de: "Immobilienmarktbericht Siebenbürgen 2026",
    },
    excerpt: {
      en: "In-depth analysis of the Transylvanian property market: average prices per m² by city, key trends, demand drivers, forecasts, and city-by-city comparisons for 2026.",
      ro: "Analiză aprofundată a pieței imobiliare transilvănene: prețuri medii pe m² pe oraș, tendințe cheie, factori de cerere, previziuni și comparații între orașe pentru 2026.",
      fr: "Analyse approfondie du marché immobilier transylvain : prix moyens par m² par ville, tendances clés, facteurs de demande et prévisions pour 2026.",
      de: "Tiefgehende Analyse des siebenbürgischen Immobilienmarkts: Durchschnittspreise pro m² nach Stadt, Schlüsseltrends, Nachfragetreiber und Prognosen für 2026.",
    },
    content: {
      ro: `<h2>Rezumat executiv</h2>

<div class="article-stats-grid"><div class="article-stat"><div class="article-stat-value">5-8%</div><div class="article-stat-label">Creștere anuală medie</div></div><div class="article-stat"><div class="article-stat-value">€1.200-2.200/m²</div><div class="article-stat-label">Interval de prețuri</div></div><div class="article-stat"><div class="article-stat-value">65%</div><div class="article-stat-label">Segment accesibil</div></div><div class="article-stat"><div class="article-stat-value">55%</div><div class="article-stat-label">Construcții noi</div></div></div>

<p>Piața imobiliară din Transilvania continuă să crească în 2026, deși într-un ritm mai moderat comparativ cu anii anteriori. Prețurile medii au crescut cu <strong>5-8%</strong> în comparație cu 2025, susținute de cererea solidă din sectoarele IT, turism și relocare internă. Orașele principale mențin un echilibru sănătos între ofertă și cerere, iar segmentul proprietăților accesibile (sub 150.000 EUR) rămâne cel mai dinamic.</p>

<p>Acest raport analizează în detaliu evoluția pieței în cele cinci orașe majore ale Transilvaniei, identificând tendințele cheie, factorii de creștere și riscurile potențiale pentru investitori și cumpărători. Datele sunt bazate pe tranzacțiile din trimestrul I 2026 și pe proiecțiile noastre pentru restul anului.</p>

<figure class="article-figure"><img src="https://images.unsplash.com/photo-1587974928442-77dc3e0dba72?w=800&q=80" alt="Panoramă urbană Cluj-Napoca" /><figcaption>Cluj-Napoca rămâne motorul pieței imobiliare din Transilvania, cu prețuri de 2.100-2.600 EUR/m² pentru apartamente noi</figcaption></figure>

<h2>Prețuri medii pe m² — trimestrul I 2026</h2>

<p>Tabelul următor oferă o comparație clară între cele cinci orașe principale din Transilvania, permițându-ți să identifici rapid unde se găsesc cele mai bune oportunități în funcție de bugetul tău și de obiectivele de investiție.</p>

<div class="article-table-wrapper"><table class="article-table"><thead><tr><th>Oraș</th><th>Apt. noi (€/m²)</th><th>Apt. vechi (€/m²)</th><th>Case (€/m²)</th><th>Creștere anuală</th></tr></thead><tbody><tr><td><strong>Cluj-Napoca</strong></td><td>2.100-2.600</td><td>1.700-2.200</td><td>1.500-2.000</td><td>+6-8%</td></tr><tr><td><strong>Brașov</strong></td><td>1.600-2.100</td><td>1.300-1.800</td><td>1.200-1.700</td><td>+5-7%</td></tr><tr><td><strong>Sibiu</strong></td><td>1.500-1.900</td><td>1.100-1.500</td><td>1.000-1.500</td><td>+4-6%</td></tr><tr><td><strong>Oradea</strong></td><td>1.400-1.800</td><td>1.000-1.400</td><td>900-1.300</td><td>+7-10%</td></tr><tr><td><strong>Târgu Mureș</strong></td><td>1.200-1.600</td><td>800-1.200</td><td>700-1.100</td><td>+3-5%</td></tr></tbody></table></div>

<h3>Cluj-Napoca — lider de piață cu potențial de randament</h3>
<p>Cluj-Napoca rămâne cel mai scump oraș din Transilvania, dar și cel cu cel mai mare potențial de randament. Cererea este susținută de sectorul IT (peste 30.000 de angajați), universitățile (80.000+ studenți) și relocarea din alte orașe. Cartierele cu cea mai mare cerere sunt Mărăști, Gheorgheni, Europa și Buna Ziua, iar zona Florești continuă să atragă cumpărători prin prețuri mai accesibile.</p>

<h3>Brașov — turism și calitate a vieții</h3>
<p>Brașov beneficiază de turismul constant (Poiana Brașov, Bran, centru istoric), de populația în creștere și de proiectele de infrastructură (autostrada A3 spre București). Orașul atrage tot mai mulți cumpărători din București care caută un stil de viață mai liniștit, fără a renunța la facilitățile urbane.</p>

<h3>Sibiu — stabilitate și industrie</h3>
<p>Sibiu are o piață stabilă, susținută de industria auto (Continental, Mercedes-Benz supplier park), turism cultural și calitatea vieții. Aeroportul internațional și autostrada A1 îmbunătățesc conectivitatea. Prețurile cresc mai lent, dar constant, ceea ce face din Sibiu o alegere sigură pentru investiții pe termen lung.</p>

<h3>Oradea — star-ul emergent</h3>
<p>Oradea înregistrează cea mai rapidă creștere procentuală din regiune, datorită transformării urbane masive, proximității față de Ungaria (piață de muncă transfrontalieră) și investițiilor în turism termal. Orașul a devenit un exemplu de regenerare urbană, cu prețuri încă accesibile dar în creștere rapidă.</p>

<h3>Târgu Mureș — accesibilitate maximă</h3>
<p>Piață mai lentă, dar cu cele mai accesibile prețuri din orașele mari ale Transilvaniei. Potențial de creștere legat de autostradă și dezvoltarea industrială. Pentru cumpărătorii cu bugete sub 80.000 EUR, Târgu Mureș oferă opțiuni care nu mai există în alte orașe transilvănene.</p>

<div class="article-callout article-callout-info"><div class="article-callout-title">ℹ️ Ce alimentează cererea?</div><p>Doi factori majori susțin piața imobiliară transilvăneană: <strong>sectorul IT</strong>, care asigură venituri peste medie și stabilitate financiară pentru cumpărători, și <strong>munca la distanță</strong>, care permite angajaților din București și din alte orașe să se mute în Transilvania fără a-și schimba locul de muncă. Aproximativ <strong>15%</strong> din cumpărătorii din Cluj și Brașov provin din alte regiuni ale țării.</p></div>

<h2>Tendințe principale în 2026</h2>

<h3>1. Creșterea cererii pentru proprietăți accesibile</h3>
<p>Segmentul 50.000-150.000 EUR domină tranzacțiile, reprezentând <strong>65% din totalul vânzărilor</strong>. Cumpărătorii caută valoare — apartamente cu 2-3 camere în cartiere bine conectate, la prețuri sub media orașului. Acest segment este alimentat atât de programul Noua Casă, cât și de cumpărătorii la prima achiziție cu venituri medii.</p>

<h3>2. Preferința pentru apartamente noi vs. vechi</h3>
<p>Apartamentele noi (din ansambluri rezidențiale) reprezintă <strong>55%</strong> din tranzacții, în creștere de la 48% în 2024. Motivele: eficiență energetică superioară, parcări incluse, facilități moderne (lifturi, zone verzi, locuri de joacă) și costuri de întreținere mai mici pe termen lung.</p>

<figure class="article-figure"><img src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80" alt="Construcții noi în Transilvania" /><figcaption>Ansamblurile rezidențiale noi reprezintă 55% din tranzacțiile din 2026</figcaption></figure>

<h3>3. Impactul muncii la distanță</h3>
<p>Tendința de lucru hibrid/remote continuă să alimenteze relocarea din București către orașele din Transilvania. Aproximativ <strong>15%</strong> din cumpărătorii din Cluj și Brașov provin din alte regiuni. Acest fenomen a crescut cererea pentru apartamente cu spații de lucru dedicate și case cu grădini.</p>

<h3>4. Sustenabilitatea devine factor de decizie</h3>
<p>Proprietățile cu certificat energetic A sau B se vând cu <strong>8-12% mai rapid</strong> și la prețuri cu <strong>5-10% mai mari</strong>. Pompele de căldură, panourile solare și izolația termică devin argumente de vânzare majore. Noile reglementări europene privind eficiența energetică accelerează această tendință.</p>

<div class="article-callout article-callout-warning"><div class="article-callout-title">⚠️ Factori de risc</div><p>Piața nu este fără riscuri. <strong>Dobânzile IRCC</strong> pot crește, reducând accesibilitatea creditelor ipotecare. <strong>Supraoferta</strong> în zone precum Florești (Cluj) și unele cartiere din Brașov poate duce la stagnarea sau scăderea prețurilor locale. <strong>Inflația costurilor de construcție</strong> (materialele și manopera au crescut cu 15-20% în ultimii 2 ani) pune presiune pe dezvoltatori și poate reduce ritmul livrărilor.</p></div>

<h2>Investiții în 2026 — oportunități vs. riscuri</h2>

<div class="article-pros-cons"><div class="article-pros"><div class="article-pros-title">✓ Oportunități de investiție</div><ul><li>Cerere solidă susținută de sectorul IT și relocare</li><li>Randamente de închiriere de 5-7% în Cluj și Brașov</li><li>Prețuri încă accesibile în Oradea și Târgu Mureș</li><li>Infrastructură în dezvoltare (autostrăzi, aeroporturi)</li><li>Turism în creștere — potențial Airbnb în Brașov și Sibiu</li><li>Programul Noua Casă stimulează cererea din segmentul accesibil</li></ul></div><div class="article-cons"><div class="article-cons-title">✗ Riscuri de luat în calcul</div><ul><li>Dobânzile IRCC pot crește, reducând cererea de credite</li><li>Supraofertă în anumite cartiere (Florești, zone periurbane)</li><li>Costurile de construcție în creștere cu 15-20%</li><li>Reglementări fiscale incerte — posibile noi taxe pe proprietăți</li><li>Riscul de „bulă" în segmentul premium din Cluj-Napoca</li><li>Volatilitatea pieței de închiriere pe termen scurt (Airbnb)</li></ul></div></div>

<h2>Previziuni pentru restul anului 2026</h2>
<p>Estimăm o <strong>creștere moderată de 4-7%</strong> a prețurilor în restul anului, cu diferențe semnificative între orașe. Cluj-Napoca va menține ritmul, Oradea va accelera, iar Sibiu și Brașov vor avea o creștere mai lentă dar stabilă. Segmentul accesibil (proprietăți sub 200.000 EUR) va rămâne cel mai activ, susținut de programele guvernamentale și de cererea reală de locuire.</p>

<div class="article-highlight"><div class="article-highlight-title">🔑 Previziuni Cheie 2026</div><ul><li>Creștere medie a prețurilor de <strong>4-7%</strong> la nivel regional, cu variații importante între orașe</li><li>Cluj-Napoca va depăși <strong>2.500 EUR/m²</strong> ca medie pentru apartamente noi</li><li>Oradea va continua să fie <strong>cel mai dinamic</strong> oraș, cu creșteri de până la 10%</li><li>Segmentul <strong>50.000-150.000 EUR</strong> va reprezenta peste 60% din tranzacții</li><li>Cererea pentru proprietăți sustenabile (certificat A/B) va crește cu <strong>20-25%</strong></li><li>Randamentele de închiriere se vor menține la <strong>5-7%</strong> în orașele principale</li></ul></div>`,

      en: `<h2>Executive Summary</h2>
<p>The Transylvanian real estate market continues to grow in 2026, though at a more moderate pace. Average prices increased by <strong>5-8%</strong> compared to 2025, supported by solid demand from IT, tourism, and internal relocation. The affordable property segment (under €150,000) remains the most dynamic.</p>

<h2>Average Prices per m² — Q1 2026</h2>

<h3>Cluj-Napoca</h3>
<ul>
  <li><strong>New apartments</strong>: €2,100-2,600/m²</li>
  <li><strong>Older apartments</strong>: €1,700-2,200/m²</li>
  <li><strong>Houses</strong>: €1,500-2,000/m² (plus land)</li>
  <li><strong>Annual growth</strong>: +6-8%</li>
</ul>
<p>Cluj-Napoca remains Transylvania's most expensive city but also offers the highest yield potential, driven by 30,000+ IT employees and 80,000+ students.</p>

<h3>Brașov</h3>
<ul>
  <li><strong>New apartments</strong>: €1,600-2,100/m²</li>
  <li><strong>Older apartments</strong>: €1,300-1,800/m²</li>
  <li><strong>Annual growth</strong>: +5-7%</li>
</ul>

<h3>Sibiu</h3>
<ul>
  <li><strong>New apartments</strong>: €1,500-1,900/m²</li>
  <li><strong>Older apartments</strong>: €1,100-1,500/m²</li>
  <li><strong>Annual growth</strong>: +4-6%</li>
</ul>

<h3>Oradea</h3>
<ul>
  <li><strong>New apartments</strong>: €1,400-1,800/m²</li>
  <li><strong>Older apartments</strong>: €1,000-1,400/m²</li>
  <li><strong>Annual growth</strong>: +7-10% (fastest in the region)</li>
</ul>

<h2>Key Trends in 2026</h2>
<ul>
  <li><strong>Affordable segment dominates</strong>: €50,000-150,000 represents 65% of all sales</li>
  <li><strong>New construction preference</strong>: 55% of transactions are in new developments</li>
  <li><strong>Remote work effect</strong>: ~15% of buyers in Cluj and Brașov relocate from other regions</li>
  <li><strong>Sustainability matters</strong>: A/B energy certificates sell 8-12% faster at 5-10% premium</li>
</ul>

<h2>Forecast for 2026</h2>
<p>We estimate <strong>moderate growth of 4-7%</strong> for the remainder of the year, with the affordable segment remaining most active.</p>`,

      fr: `<h2>Résumé</h2>
<p>Le marché immobilier transylvain croît de <strong>5-8%</strong> en 2026. Le segment abordable (moins de 150 000 €) reste le plus dynamique.</p>

<h2>Prix moyens par m² — T1 2026</h2>
<ul>
  <li><strong>Cluj-Napoca</strong> : 2 100-2 600 €/m² (neuf), croissance +6-8%</li>
  <li><strong>Brașov</strong> : 1 600-2 100 €/m² (neuf), croissance +5-7%</li>
  <li><strong>Sibiu</strong> : 1 500-1 900 €/m² (neuf), croissance +4-6%</li>
  <li><strong>Oradea</strong> : 1 400-1 800 €/m² (neuf), croissance +7-10%</li>
</ul>

<h2>Tendances clés</h2>
<p>65% des ventes dans le segment 50 000-150 000 €. Le télétravail alimente la relocalisation vers la Transylvanie. Prévision : croissance modérée de 4-7% pour le reste de 2026.</p>`,

      de: `<h2>Zusammenfassung</h2>
<p>Der siebenbürgische Immobilienmarkt wächst 2026 um <strong>5-8%</strong>. Das erschwingliche Segment (unter 150.000 €) bleibt am dynamischsten.</p>

<h2>Durchschnittspreise pro m² — Q1 2026</h2>
<ul>
  <li><strong>Cluj-Napoca</strong>: 2.100-2.600 €/m² (Neubau), Wachstum +6-8%</li>
  <li><strong>Brașov</strong>: 1.600-2.100 €/m² (Neubau), Wachstum +5-7%</li>
  <li><strong>Sibiu</strong>: 1.500-1.900 €/m² (Neubau), Wachstum +4-6%</li>
  <li><strong>Oradea</strong>: 1.400-1.800 €/m² (Neubau), Wachstum +7-10%</li>
</ul>

<h2>Wichtige Trends</h2>
<p>65% der Verkäufe im Segment 50.000-150.000 €. Homeoffice treibt Umzüge nach Siebenbürgen. Prognose: moderates Wachstum von 4-7% für den Rest des Jahres 2026.</p>`,
    },
    coverImage:
      "https://images.unsplash.com/photo-1460317442991-0ec209397118?w=1200&q=80",
    category: "market-report",
    tags: [
      "raport",
      "piață",
      "prețuri",
      "tendințe",
      "Transilvania",
      "2026",
      "previziuni",
    ],
    publishedAt: "2026-04-08T07:00:00.000Z",
    authorName: "Echipa Reveria",
    authorAvatar: null,
    readTimeMinutes: 15,
  },

  // ─── 6. Noua Casă / Prima Casă Guide ───
  {
    slug: "ghid-prima-casa-noua-casa",
    title: {
      en: "Noua Casă (Prima Casă) Guide: Everything You Need to Know",
      ro: "Ghid Noua Casă (Prima Casă): tot ce trebuie să știi",
      fr: "Guide Noua Casă (Prima Casă) : tout ce qu'il faut savoir",
      de: "Noua Casă (Prima Casă) Leitfaden: Alles, was Sie wissen müssen",
    },
    excerpt: {
      en: "Complete guide to Romania's Noua Casă program: eligibility criteria, maximum amounts, interest rates, required documents, application process, and practical advantages and limitations.",
      ro: "Ghid complet despre programul Noua Casă: criterii de eligibilitate, sume maxime, dobânzi, documente necesare, procesul de aplicare și avantajele și limitările practice.",
      fr: "Guide complet du programme Noua Casă : critères d'éligibilité, montants maximums, taux d'intérêt, documents requis et processus de demande.",
      de: "Vollständiger Leitfaden zum Noua-Casă-Programm: Zulassungskriterien, Höchstbeträge, Zinssätze, erforderliche Dokumente und Antragsprozess.",
    },
    content: {
      ro: `<h2>Ce este programul Noua Casă?</h2>

<div class="article-stats-grid"><div class="article-stat"><div class="article-stat-value">5%</div><div class="article-stat-label">Avans minim</div></div><div class="article-stat"><div class="article-stat-value">70k/140k EUR</div><div class="article-stat-label">Plafoane garantate</div></div><div class="article-stat"><div class="article-stat-value">30 ani</div><div class="article-stat-label">Durată maximă credit</div></div><div class="article-stat"><div class="article-stat-value">40%</div><div class="article-stat-label">Grad max. îndatorare (DTI)</div></div></div>

<p>Noua Casă (fostul „Prima Casă") este un program guvernamental lansat inițial în 2009 și redenumit în 2020. Scopul său este de a facilita accesul la locuință pentru persoanele care nu dețin deja o proprietate, prin garantarea parțială a creditului ipotecar de către stat, prin intermediul <strong>FNGCIMM</strong> (Fondul Național de Garantare a Creditelor pentru Întreprinderile Mici și Mijlocii). De la lansare, programul a ajutat sute de mii de familii din România să își cumpere prima locuință, fiind unul dintre cele mai de succes programe sociale din domeniul imobiliar.</p>

<figure class="article-figure"><img src="https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80" alt="Familie fericită în fața casei noi" /><figcaption>Programul Noua Casă face posibilă achiziția primei locuințe cu un avans de doar 5%</figcaption></figure>

<div class="article-callout article-callout-info"><div class="article-callout-title">ℹ️ Ce este Noua Casă și cine poate aplica?</div><p>Programul Noua Casă este destinat persoanelor care <strong>nu dețin o locuință</strong> în proprietate (nici solicitantul, nici soțul/soția). Nu trebuie să fi beneficiat anterior de Prima Casă sau Noua Casă, trebuie să ai <strong>venituri suficiente</strong> pentru un grad de îndatorare maxim de 40%, un <strong>istoric de credit curat</strong> (fără restanțe active) și <strong>cetățenie română sau rezidență permanentă</strong>. Cetățenii străini cu rezidență permanentă în România pot aplica de asemenea.</p></div>

<h2>Ce poți cumpăra cu Noua Casă?</h2>
<p>Programul acoperă două categorii de locuințe, cu plafoane diferite de garantare:</p>

<h3>Locuințe existente (second-hand)</h3>
<ul>
  <li><strong>Valoare maximă garantată</strong>: 70.000 EUR (sau echivalent lei la cursul BNR)</li>
  <li>Include apartamente și case</li>
  <li>Proprietatea trebuie să fie locuibilă și intabulată în cartea funciară</li>
</ul>

<h3>Locuințe noi (de la dezvoltator)</h3>
<ul>
  <li><strong>Valoare maximă garantată</strong>: 140.000 EUR (sau echivalent lei)</li>
  <li>Include și construcția individuală cu proiect aprobat</li>
  <li>Dezvoltatorul trebuie să fie autorizat și proiectul să aibă toate avizele necesare</li>
</ul>

<h2>Condiții financiare</h2>
<h3>Avansul minim</h3>
<p>Doar <strong>5% din valoarea proprietății</strong> — comparativ cu 15% la creditele standard. Aceasta este cel mai mare avantaj al programului. De exemplu, pentru un apartament de 100.000 EUR, avansul minim este de doar 5.000 EUR, față de 15.000 EUR la un credit ipotecar obișnuit.</p>

<h3>Dobânda</h3>
<ul>
  <li><strong>Variabilă</strong>: IRCC + 2-2,5% (marjă plafonată de stat — nu poate fi crescută unilateral de bancă)</li>
  <li><strong>Fixă</strong>: 5-6% pe primii 5 ani, apoi variabilă</li>
</ul>
<p>Dobânzile sunt de obicei mai avantajoase decât la creditele ipotecare standard, datorită garanției statului care reduce riscul pentru bancă.</p>

<h3>Perioada de rambursare</h3>
<p>Maxim <strong>30 de ani</strong>, cu condiția ca la finalul creditului solicitantul să nu depășească 70 de ani.</p>

<h2>Noua Casă vs. credit ipotecar standard</h2>

<div class="article-table-wrapper"><table class="article-table"><thead><tr><th>Criteriu</th><th>Noua Casă</th><th>Credit ipotecar standard</th></tr></thead><tbody><tr><td><strong>Avans minim</strong></td><td>5%</td><td>15-25%</td></tr><tr><td><strong>Dobândă variabilă</strong></td><td>IRCC + 2-2,5% (plafonată)</td><td>IRCC + 2-4% (negociabilă)</td></tr><tr><td><strong>Dobândă fixă</strong></td><td>5-6% (5 ani)</td><td>5-8% (5-10 ani)</td></tr><tr><td><strong>Garanția statului</strong></td><td>Da (până la 50%)</td><td>Nu</td></tr><tr><td><strong>Plafon valoare</strong></td><td>70.000/140.000 EUR</td><td>Fără limită</td></tr><tr><td><strong>Flexibilitate vânzare</strong></td><td>Restricționată</td><td>Liberă (cu acordul băncii)</td></tr><tr><td><strong>Asigurări suplimentare</strong></td><td>Obligatorii (FNGCIMM 0,35-0,45%/an)</td><td>Opționale parțial</td></tr><tr><td><strong>Utilizare</strong></td><td>O singură dată</td><td>Nelimitată</td></tr></tbody></table></div>

<p>Noua Casă este ideal pentru cumpărătorii la prima achiziție cu economii limitate. Dacă ai un avans de peste 15% și venituri solide, un credit standard poate oferi mai multă flexibilitate și uneori dobânzi competitive.</p>

<h2>Documente necesare</h2>
<p>Pregătirea dosarului complet din timp accelerează semnificativ procesul de aprobare. Iată lista completă:</p>
<ul>
  <li>Carte de identitate (ambii soți, dacă e cazul)</li>
  <li>Certificat de căsătorie (dacă e cazul)</li>
  <li>Adeverință de venit (ultimele 3 luni) — semnată și ștampilată de angajator</li>
  <li>Extras de cont (ultimele 3-6 luni) — demonstrând venitul net</li>
  <li>Declarație pe propria răspundere că nu deții altă locuință</li>
  <li>Antecontractul de vânzare-cumpărare — cu clauză suspensivă</li>
  <li>Documentele proprietății (extras CF actualizat, certificat energetic, releveu cadastral)</li>
</ul>

<h2>Procesul de aplicare pas cu pas</h2>

<div class="article-steps"><div class="article-step"><div class="article-step-number">1</div><div class="article-step-content"><div class="article-step-title">Găsește proprietatea potrivită</div><div class="article-step-desc">Asigură-te că proprietatea se încadrează în plafonul Noua Casă: până la 70.000 EUR pentru locuințe existente sau 140.000 EUR pentru locuințe noi. Verifică dacă are carte funciară actualizată și certificat energetic valid.</div></div></div><div class="article-step"><div class="article-step-number">2</div><div class="article-step-content"><div class="article-step-title">Semnează antecontractul</div><div class="article-step-desc">Încheie un antecontract de vânzare-cumpărare cu vânzătorul. Este esențial să incluzi o <strong>clauză suspensivă</strong> care condiționează tranzacția de aprobarea creditului Noua Casă.</div></div></div><div class="article-step"><div class="article-step-number">3</div><div class="article-step-content"><div class="article-step-title">Depune dosarul la bancă</div><div class="article-step-desc">Completează formularul de cerere de credit și atașează toate documentele necesare. Compară ofertele la minimum 2-3 bănci partenere ale programului Noua Casă.</div></div></div><div class="article-step"><div class="article-step-number">4</div><div class="article-step-content"><div class="article-step-title">Evaluarea proprietății</div><div class="article-step-desc">Banca trimite un evaluator autorizat ANEVAR pentru a stabili valoarea de piață a proprietății. Costul evaluării (200-500 EUR) este suportat de tine.</div></div></div><div class="article-step"><div class="article-step-number">5</div><div class="article-step-content"><div class="article-step-title">Analiza și aprobarea</div><div class="article-step-desc">Banca și FNGCIMM analizează dosarul în paralel. Procesul durează de obicei <strong>10-20 de zile lucrătoare</strong>. În perioadele aglomerate, poate ajunge la 30 de zile.</div></div></div><div class="article-step"><div class="article-step-number">6</div><div class="article-step-content"><div class="article-step-title">Semnarea contractului de credit</div><div class="article-step-desc">După aprobare, te prezinți la sediul băncii pentru a semna contractul de credit ipotecar. Citește cu atenție toate clauzele, în special pe cele referitoare la dobândă și penalități.</div></div></div><div class="article-step"><div class="article-step-number">7</div><div class="article-step-content"><div class="article-step-title">Contract vânzare-cumpărare la notar</div><div class="article-step-desc">Semnezi contractul de vânzare-cumpărare în formă autentică la notar. Banca virează suma direct în contul vânzătorului. Plătești onorariul notarial și taxele aferente.</div></div></div><div class="article-step"><div class="article-step-number">8</div><div class="article-step-content"><div class="article-step-title">Intabulare și ipotecă</div><div class="article-step-desc">Proprietatea este intabulată pe numele tău, cu ipotecă în favoarea statului (FNGCIMM) și a băncii. Ipoteca se radiază automat la finalizarea rambursării creditului.</div></div></div></div>

<figure class="article-figure"><img src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80" alt="Întâlnire la bancă pentru credit ipotecar" /><figcaption>Procesul de aprobare durează de obicei 10-20 de zile lucrătoare</figcaption></figure>

<div class="article-callout article-callout-warning"><div class="article-callout-title">⚠️ Limitări ale plafonului în orașe scumpe</div><p>Plafonul de <strong>70.000 EUR</strong> pentru locuințe second-hand este insuficient în orașe precum Cluj-Napoca, unde prețul mediu al unui apartament cu 2 camere depășește 100.000 EUR. Chiar și plafonul de <strong>140.000 EUR</strong> pentru locuințe noi poate fi restrictiv în cartierele centrale ale orașelor mari. În aceste cazuri, diferența trebuie acoperită din surse proprii sau printr-un credit suplimentar.</p></div>

<h2>Avantaje și dezavantaje</h2>

<div class="article-pros-cons"><div class="article-pros"><div class="article-pros-title">✓ Avantaje</div><ul><li><strong>Avans minim de doar 5%</strong> — cel mai mic din piața bancară românească</li><li><strong>Dobânzi plafonate de stat</strong> — marje mai mici și mai stabile decât la creditele standard</li><li><strong>Garanția statului</strong> — până la 50% din valoarea creditului, ceea ce reduce riscul pentru bancă</li><li><strong>Accesibilitate ridicată</strong> — permite accesul la locuință pentru familii cu venituri modeste</li><li><strong>Proces simplificat</strong> — documentația este standardizată la nivel național</li></ul></div><div class="article-cons"><div class="article-cons-title">✗ Dezavantaje</div><ul><li><strong>Plafonul de 70.000/140.000 EUR</strong> — limitează opțiunile în orașe scumpe precum Cluj-Napoca</li><li><strong>Vânzarea restricționată</strong> — necesită rambursarea integrală a creditului sau transferul garanției</li><li><strong>Asigurări obligatorii suplimentare</strong> — imobil, viață, comision FNGCIMM (0,35-0,45%/an)</li><li><strong>Utilizare unică</strong> — nu poți beneficia de program a doua oară, indiferent de circumstanțe</li><li><strong>Ipotecă în favoarea statului</strong> — restricții la modificări majore și la închirierea proprietății</li></ul></div></div>

<div class="article-callout article-callout-tip"><div class="article-callout-title">💡 Sfat important: clauza suspensivă</div><p>Întotdeauna include o <strong>clauză suspensivă</strong> în antecontractul de vânzare-cumpărare. Aceasta te protejează în cazul în care creditul Noua Casă nu este aprobat — vei putea recupera avansul plătit fără penalități. Fără această clauză, riști să pierzi avansul dacă banca sau FNGCIMM resping dosarul.</p></div>

<div class="article-highlight"><div class="article-highlight-title">🔑 Concluzii Cheie</div><ul><li>Noua Casă este <strong>cea mai accesibilă</strong> opțiune pentru prima locuință, cu avans de doar 5%</li><li>Plafonul de <strong>70.000 EUR</strong> (second-hand) sau <strong>140.000 EUR</strong> (nou) determină tipul de proprietate pe care o poți achiziționa</li><li>Dobânzile sunt <strong>plafonate de stat</strong>, oferind predictibilitate pe termen lung</li><li>Include întotdeauna o <strong>clauză suspensivă</strong> în antecontract pentru a-ți proteja avansul</li><li>Compară ofertele la <strong>minimum 3 bănci</strong> partenere ale programului</li><li>Dacă ai un avans de peste 15%, analizează și opțiunea unui <strong>credit ipotecar standard</strong> care poate oferi mai multă flexibilitate</li></ul></div>`,

      en: `<h2>What is the Noua Casă Program?</h2>
<p>Noua Casă (formerly "Prima Casă") is a Romanian government program launched in 2009 and rebranded in 2020. It facilitates homeownership for people who don't already own property, through partial state guarantee of the mortgage via <strong>FNGCIMM</strong>.</p>

<h2>Eligibility Criteria</h2>
<ul>
  <li>You (and your spouse) must not own any property at the time of application</li>
  <li>You haven't previously used Prima Casă or Noua Casă</li>
  <li>Sufficient income to meet the 40% DTI requirement</li>
  <li>Clean credit history</li>
  <li>Romanian citizenship or permanent residence</li>
</ul>

<h2>What Can You Buy?</h2>
<ul>
  <li><strong>Existing homes</strong>: max guaranteed value of €70,000</li>
  <li><strong>New construction</strong>: max guaranteed value of €140,000</li>
</ul>

<h2>Financial Conditions</h2>
<ul>
  <li><strong>Minimum down payment</strong>: only 5% (vs. 15% standard)</li>
  <li><strong>Variable rate</strong>: IRCC + 2-2.5% (state-capped margin)</li>
  <li><strong>Fixed rate</strong>: 5-6% for first 5 years</li>
  <li><strong>Maximum term</strong>: 30 years</li>
</ul>

<h2>Application Process</h2>
<ol>
  <li>Find a qualifying property</li>
  <li>Sign pre-sale agreement with suspensive clause</li>
  <li>Submit application to bank with required documents</li>
  <li>Property appraisal by authorized evaluator</li>
  <li>Bank and FNGCIMM analysis (10-20 days)</li>
  <li>Sign loan contract, then final sale at notary</li>
</ol>

<h2>Advantages and Limitations</h2>
<p><strong>Advantages:</strong> 5% minimum deposit, capped interest rates, state guarantee up to 50%. <strong>Limitations:</strong> €70,000/140,000 cap limits options in expensive cities, mandatory additional insurance, one-time use only, restrictions on reselling.</p>`,

      fr: `<h2>Qu'est-ce que le programme Noua Casă ?</h2>
<p>Noua Casă (anciennement « Prima Casă ») est un programme gouvernemental facilitant l'accès au logement par une garantie partielle de l'État.</p>

<h3>Critères d'éligibilité</h3>
<ul>
  <li>Ne pas posséder de logement</li>
  <li>Ne pas avoir utilisé le programme auparavant</li>
  <li>Revenu suffisant (DTI max 40%)</li>
</ul>

<h3>Conditions financières</h3>
<ul>
  <li>Apport minimum : 5%</li>
  <li>Valeur max : 70 000 € (existant) / 140 000 € (neuf)</li>
  <li>Taux : IRCC + 2-2,5% (variable) ou 5-6% (fixe)</li>
  <li>Durée max : 30 ans</li>
</ul>

<p><strong>Avantages :</strong> apport minimal, taux plafonnés. <strong>Limites :</strong> plafond de valeur, assurances obligatoires supplémentaires, utilisation unique.</p>`,

      de: `<h2>Was ist das Noua-Casă-Programm?</h2>
<p>Noua Casă (ehemals „Prima Casă") ist ein Regierungsprogramm, das den Zugang zu Wohneigentum durch teilstaatliche Garantie erleichtert.</p>

<h3>Zulassungskriterien</h3>
<ul>
  <li>Kein bestehendes Wohneigentum</li>
  <li>Keine vorherige Programmnutzung</li>
  <li>Ausreichendes Einkommen (DTI max. 40%)</li>
</ul>

<h3>Finanzielle Bedingungen</h3>
<ul>
  <li>Mindestanzahlung: 5%</li>
  <li>Maximalwert: 70.000 € (Bestand) / 140.000 € (Neubau)</li>
  <li>Zinssatz: IRCC + 2-2,5% (variabel) oder 5-6% (fest)</li>
  <li>Maximale Laufzeit: 30 Jahre</li>
</ul>

<p><strong>Vorteile:</strong> minimale Anzahlung, gedeckelte Zinsen. <strong>Einschränkungen:</strong> Wertgrenze, zusätzliche Pflichtversicherungen, einmalige Nutzung.</p>`,
    },
    coverImage:
      "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=1200&q=80",
    category: "guide",
    tags: [
      "Noua-Casă",
      "Prima-Casă",
      "credit",
      "avans",
      "guvern",
      "FNGCIMM",
      "prima-locuință",
    ],
    publishedAt: "2026-04-10T08:30:00.000Z",
    authorName: "Echipa Reveria",
    authorAvatar: null,
    readTimeMinutes: 9,
  },

  // ─── 7. Apartment vs House: What to Choose ───
  {
    slug: "apartament-vs-casa-ce-sa-alegi",
    title: {
      en: "Apartment vs House: Which Should You Choose?",
      ro: "Apartament vs. casă: ce să alegi?",
      fr: "Appartement vs maison : que choisir ?",
      de: "Wohnung vs. Haus: Was sollten Sie wählen?",
    },
    excerpt: {
      en: "A practical comparison between buying an apartment or a house in Transylvania: costs, lifestyle, maintenance, resale value, and which option is best for different life situations.",
      ro: "O comparație practică între cumpărarea unui apartament sau a unei case în Transilvania: costuri, stil de viață, întreținere, valoare de revânzare și care opțiune este mai bună pentru diferite situații de viață.",
      fr: "Une comparaison pratique entre l'achat d'un appartement ou d'une maison en Transylvanie : coûts, style de vie, entretien et valeur de revente.",
      de: "Ein praktischer Vergleich zwischen dem Kauf einer Wohnung oder eines Hauses in Siebenbürgen: Kosten, Lebensstil, Wartung und Wiederverkaufswert.",
    },
    content: {
      ro: `<h2>Apartament sau casă — alegerea fundamentală a vieții tale</h2>
<p>Decizia între un apartament și o casă este mult mai mult decât o simplă tranzacție imobiliară. Este o alegere de stil de viață care îți va influența rutina zilnică, finanțele, relațiile de familie și chiar starea de spirit pentru următorii 10, 20 sau 30 de ani. Pe Reveria, această întrebare apare în mod constant în rândul cumpărătorilor din Transilvania, iar răspunsul nu este niciodată simplu. Depinde de bugetul tău real, de etapa vieții în care te afli, de planurile tale de familie și de viziunea ta pe termen lung.</p>

<div class="article-stats-grid">
  <div class="article-stat">
    <div class="article-stat-value">€60k – €120k</div>
    <div class="article-stat-label">Apartament mediu în Transilvania</div>
  </div>
  <div class="article-stat">
    <div class="article-stat-value">€100k – €300k</div>
    <div class="article-stat-label">Casă medie în Transilvania</div>
  </div>
  <div class="article-stat">
    <div class="article-stat-value">500 – 1.300 lei/lună</div>
    <div class="article-stat-label">Întreținere apartament</div>
  </div>
  <div class="article-stat">
    <div class="article-stat-value">800 – 2.100 lei/lună</div>
    <div class="article-stat-label">Întreținere casă</div>
  </div>
</div>

<figure class="article-figure">
  <img src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80" alt="Apartament modern cu living luminos, mobilier contemporan și ferestre mari" />
  <figcaption>Apartamentele moderne din Transilvania oferă un echilibru excelent între confort, locație centrală și costuri previzibile — ideale pentru tineri profesioniști și cupluri.</figcaption>
</figure>

<div class="article-callout article-callout-info">
  <div class="article-callout-title">💡 O alegere fundamentală de stil de viață</div>
  <p>Conform datelor Reveria din primul trimestru 2026, <strong>62% dintre cumpărătorii sub 35 de ani</strong> aleg apartamente, în timp ce <strong>74% dintre familiile cu copii</strong> preferă casele. Nu este vorba doar de bani — este vorba de cum vrei să trăiești. Apartamentul înseamnă proximitate urbană, comoditate și predictibilitate financiară. Casa înseamnă spațiu, independență și libertate, dar cu responsabilități semnificativ mai mari. Ambele au argumente puternice — cheia este să înțelegi care se potrivește <strong>situației tale concrete</strong>, nu unui ideal abstract.</p>
</div>

<h2>Comparație completă — apartament versus casă în 2026</h2>
<p>Am sintetizat cele mai importante criterii de decizie într-un tabel comparativ cuprinzător, bazat pe datele reale din piața transilvăneană. Aceste cifre reflectă medii pentru principalele orașe din regiune — Cluj-Napoca, Brașov, Sibiu, Târgu Mureș și Alba Iulia — și sunt actualizate pentru primul trimestru al anului 2026.</p>

<div class="article-table-wrapper">
  <table class="article-table">
    <thead>
      <tr>
        <th>Criteriu</th>
        <th>Apartament</th>
        <th>Casă</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Preț mediu de achiziție</strong></td>
        <td>€60.000 – €120.000</td>
        <td class="table-highlight">€100.000 – €300.000</td>
      </tr>
      <tr>
        <td><strong>Întreținere lunară</strong></td>
        <td>500 – 1.300 lei</td>
        <td class="table-highlight">800 – 2.100 lei</td>
      </tr>
      <tr>
        <td><strong>Intimitate</strong></td>
        <td>Medie — vecini la pereți comuni</td>
        <td class="table-highlight">Ridicată — spațiu propriu, fără vecini direcți</td>
      </tr>
      <tr>
        <td><strong>Spațiu locuibil</strong></td>
        <td>40 – 90 m² (tipic 50-70 m²)</td>
        <td class="table-highlight">80 – 250 m² + curte 200-1.000 m²</td>
      </tr>
      <tr>
        <td><strong>Parcare</strong></td>
        <td>Inclus în proiecte noi; dificil în zone vechi</td>
        <td class="table-highlight">Garaj propriu + spațiu nelimitat</td>
      </tr>
      <tr>
        <td><strong>Grădină / curte</strong></td>
        <td>Nu — doar balcon sau terasă</td>
        <td class="table-highlight">Da — curte privată, grădinărit, loc de joacă</td>
      </tr>
      <tr>
        <td><strong>Timp de revânzare</strong></td>
        <td class="table-highlight">30 – 60 zile (lichiditate excelentă)</td>
        <td>3 – 6 luni (cerere mai restrânsă)</td>
      </tr>
      <tr>
        <td><strong>Impozit anual</strong></td>
        <td class="table-highlight">50 – 300 lei</td>
        <td>200 – 1.500 lei (clădire + teren)</td>
      </tr>
    </tbody>
  </table>
</div>

<p>Diferențele sunt clare și semnificative. La nivel financiar pur, apartamentul câștigă aproape întotdeauna pe termen scurt și mediu. Însă casa oferă o calitate a vieții pe care nicio cifră nu o poate cuantifica complet — aerul curat, curtea proprie, liniștea și libertatea de a-ți modifica spațiul după bunul plac. Prețul unui apartament include de obicei un loc de parcare (în proiectele noi) și acces la facilități comune. La case, prețul include terenul, dar poate varia enorm — o casă la periferia Clujului poate costa de 2-3 ori mai mult decât una similară lângă Târgu Mureș sau Alba Iulia.</p>

<div class="article-callout article-callout-tip">
  <div class="article-callout-title">💰 Ce se potrivește la fiecare etapă a vieții</div>
  <p><strong>20-30 de ani</strong> (carieră, mobilitate): apartamentul este alegerea optimă — costuri reduse, locație centrală, flexibilitate de vânzare/închiriere dacă te muți. <strong>30-40 de ani</strong> (familie în formare): casa devine atractivă dacă ai copii sau plănuiești, mai ales cu tendința de work-from-home post-pandemie. <strong>40+ ani</strong> (stabilitate): depinde de preferințe — unii revin la apartamente pentru comoditate, alții investesc în casa „de o viață". <strong>Investiție</strong>: apartamentul câștigă cu randament din chirii de 4-7%, versus 2-4% pentru case.</p>
</div>

<figure class="article-figure">
  <img src="https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80" alt="Casă modernă cu grădină verde, terasă din lemn și priveliște spre dealuri" />
  <figcaption>O casă în zona metropolitană a Brașovului — spațiu generos, grădină privată și priveliște spre munți, dar cu costuri de întreținere semnificativ mai mari și responsabilitate totală pentru mentenanță.</figcaption>
</figure>

<h2>Avantaje și dezavantaje — o analiză sinceră</h2>
<p>Dincolo de cifre, alegerea între apartament și casă este profund legată de stilul de viață pe care ți-l dorești. Am sintetizat experiențele a sute de cumpărători din Transilvania pentru a oferi o perspectivă cât mai echilibrată și onestă asupra fiecărei opțiuni.</p>

<div class="article-pros-cons">
  <div class="article-pros">
    <div class="article-pros-title">✓ Avantaje apartament</div>
    <ul>
      <li><strong>Locație centrală</strong> — acces rapid la servicii, transport public, școli, magazine și viață socială</li>
      <li><strong>Costuri previzibile</strong> — întreținerea și utilitățile sunt mai mici și mai ușor de estimat lunar</li>
      <li><strong>Securitate sporită</strong> — interfon, camere de supraveghere, vecini, acces controlat</li>
      <li><strong>Zero responsabilitate exterioară</strong> — asociația gestionează fațada, acoperișul, scara, curtea</li>
      <li><strong>Lichiditate excelentă</strong> — se vinde rapid (30-60 zile) în piața actuală</li>
      <li><strong>Randament superior din chirii</strong> — 4-7% anual, cerere constantă în orașele universitare</li>
      <li><strong>Ideal pentru tineri profesioniști</strong> — cupluri fără copii, persoane mobile, investitori</li>
    </ul>
  </div>
  <div class="article-cons">
    <div class="article-cons-title">✗ Dezavantaje apartament</div>
    <ul>
      <li><strong>Spațiu limitat</strong> — 50-70 m² standard, insuficient pentru familii cu 2+ copii</li>
      <li><strong>Zgomot</strong> — vecini la pereți comuni, trafic urban, lipsa izolării fonice adecvate în blocurile vechi</li>
      <li><strong>Fără grădină sau curte</strong> — doar balcon sau terasă, fără contact direct cu natura</li>
      <li><strong>Dependență de asociație</strong> — decizii colective, fond de reparații partajat, conflicte posibile</li>
      <li><strong>Parcare problematică</strong> — în zone centrale, un loc de parcare poate costa 10.000-25.000 EUR separat</li>
      <li><strong>Restricții de modificare</strong> — nu poți schimba fațada, structura sau adăuga extensii</li>
    </ul>
  </div>
</div>

<div class="article-callout article-callout-warning">
  <div class="article-callout-title">⚠️ Costurile ascunse ale unei case — ce nu-ți spune nimeni</div>
  <p>Majoritatea cumpărătorilor subestimează dramatic costurile reale ale deținerii unei case. Pe lângă prețul de achiziție, bugetează: <strong>amenajarea grădinii</strong> (2.000-8.000 EUR — gazon, plante, sistem de irigație, alei); <strong>reparații acoperiș</strong> (3.000-15.000 EUR la fiecare 15-25 de ani); <strong>înlocuirea centralei termice</strong> (2.000-5.000 EUR la fiecare 10-15 ani); <strong>reparații fațadă și izolație</strong> (5.000-15.000 EUR); <strong>gard și poartă</strong> (1.500-5.000 EUR); <strong>deszăpezire iarnă</strong> (echipament sau serviciu recurent). Un fond de urgență de minim <strong>5.000 EUR</strong> este esențial — la apartament, aceste costuri sunt distribuite între toți proprietarii prin fondul de reparații al asociației.</p>
</div>

<h2>Costuri lunare detaliate — unde se duc banii tăi</h2>
<p>Costurile lunare sunt un factor decisiv pe termen lung și pot face diferența între confort financiar și stres. Un apartament este mai ieftin de întreținut, dar o casă îți oferă control total asupra cheltuielilor. Iată o defalcare detaliată pe categorii:</p>

<div class="article-table-wrapper">
  <table class="article-table">
    <thead>
      <tr>
        <th>Categorie de cost</th>
        <th>Apartament (lei/lună)</th>
        <th>Casă (lei/lună)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Întreținere / asociație</td>
        <td>200 – 600</td>
        <td>N/A</td>
      </tr>
      <tr>
        <td>Utilități (gaz, electricitate, apă, internet)</td>
        <td>300 – 700</td>
        <td class="table-highlight">500 – 1.200</td>
      </tr>
      <tr>
        <td>Întreținere curte / exterior</td>
        <td>N/A</td>
        <td>100 – 400</td>
      </tr>
      <tr>
        <td>Fond reparații / mentenanță</td>
        <td>Inclus în întreținere</td>
        <td>200 – 500</td>
      </tr>
      <tr>
        <td><strong>Total estimat</strong></td>
        <td><strong>500 – 1.300</strong></td>
        <td class="table-highlight"><strong>800 – 2.100</strong></td>
      </tr>
    </tbody>
  </table>
</div>

<p>Pe 10 ani, diferența cumulată este semnificativă: o casă cu costuri lunare medii de 1.500 lei versus un apartament cu 900 lei înseamnă o diferență de <strong>72.000 lei (aproximativ 14.500 EUR)</strong> în plus pentru casă. Aceasta este doar diferența la întreținere — fără a include reparațiile capitale (acoperiș, centrală, fațadă) care pot adăuga încă 10.000-20.000 EUR pe un orizont de 10 ani.</p>

<h2>Valoarea de revânzare și potențialul investițional</h2>
<p><strong>Apartamentele</strong> din zone centrale se vând mai rapid (30-60 de zile în medie) și au lichiditate mai mare. Randamentul din închiriere este de obicei între <strong>4% și 7% anual</strong>, iar cererea de chiriași este constantă, mai ales în orașele universitare precum Cluj-Napoca, unde rata de ocupare depășește 95% pe tot parcursul anului.</p>
<p><strong>Casele</strong> necesită de obicei 3-6 luni pentru vânzare, dar pot avea apreciere mai mare pe termen lung, mai ales dacă zona se dezvoltă. Randamentul din închiriere este mai scăzut (2-4%), dar aprecierea capitalului poate compensa pe orizonturi de 10+ ani. Casele din zonele metropolitane ale Clujului sau Brașovului au avut o apreciere medie de 8-12% pe an în ultimii 5 ani, față de 5-8% pentru apartamente.</p>

<h2>Impozitul pe proprietate — diferențe importante</h2>
<p>Impozitul anual este calculat diferit pentru apartamente și case, iar diferența poate fi substanțială. La case trebuie să plătești separat impozitul pe clădire și impozitul pe teren, ceea ce cumulat poate fi de 3-5 ori mai mare decât impozitul unui apartament echivalent ca suprafață. Impozitul pentru un apartament de 60 m² variază între 50 și 300 lei pe an, în funcție de suprafață, zonă și materialul de construcție. Pentru o casă de 120 m² cu un teren de 500 m², impozitul total (clădire + teren) poate ajunge la 200-1.500 lei pe an.</p>

<h2>Cum să iei decizia corectă — ghid pas cu pas</h2>
<p>Dacă încă nu te-ai hotărât, urmează acești pași sistematici pentru a lua cea mai bună decizie. Evită să te grăbești — o achiziție imobiliară este cel mai probabil cea mai mare investiție din viața ta:</p>

<div class="article-steps">
  <div class="article-step">
    <div class="article-step-number">1</div>
    <div class="article-step-content">
      <div class="article-step-title">Stabilește-ți bugetul total real</div>
      <div class="article-step-desc">Include nu doar prețul de achiziție, ci și costurile notariale (1-2%), comisionul agenției (2-3%), evaluarea bancară, asigurarea și eventualele renovări. Adaugă minimum 5-8% din prețul proprietății pentru aceste cheltuieli suplimentare. La case, bugetează suplimentar 2.000-5.000 EUR pentru amenajarea curții, gard și conectare utilități.</div>
    </div>
  </div>
  <div class="article-step">
    <div class="article-step-number">2</div>
    <div class="article-step-content">
      <div class="article-step-title">Evaluează-ți stilul de viață pe 5-10 ani</div>
      <div class="article-step-desc">Gândește-te unde vei fi peste 5 ani. Plănuiești copii? Vrei să lucrezi de acasă? Ai nevoie de acces rapid la centrul orașului? Ai animale de companie sau pasiuni care necesită spațiu (grădinărit, atelier, garaj)? Răspunsurile la aceste întrebări îți vor clarifica mult decizia.</div>
    </div>
  </div>
  <div class="article-step">
    <div class="article-step-number">3</div>
    <div class="article-step-content">
      <div class="article-step-title">Calculează costul total de proprietate pe 10 ani</div>
      <div class="article-step-desc">Nu te uita doar la rata creditului. Adaugă utilitățile, întreținerea, reparațiile neprevăzute, impozitele și asigurarea. O casă poate costa cu 3.000-9.000 lei/an mai mult decât un apartament echivalent — pe 10 ani, aceasta înseamnă 30.000-90.000 lei diferență (6.000-18.000 EUR).</div>
    </div>
  </div>
  <div class="article-step">
    <div class="article-step-number">4</div>
    <div class="article-step-content">
      <div class="article-step-title">Vizitează ambele tipuri de proprietăți</div>
      <div class="article-step-desc">Chiar dacă ești convins de o opțiune, vizitează minim 3-4 proprietăți din fiecare categorie. Multe percepții se schimbă când vezi realitatea — un apartament modern de 80 m² poate fi mai spațios decât te aștepți, iar o casă poate necesita mai multă muncă decât îți imaginezi.</div>
    </div>
  </div>
  <div class="article-step">
    <div class="article-step-number">5</div>
    <div class="article-step-content">
      <div class="article-step-title">Verifică zona și infrastructura</div>
      <div class="article-step-desc">Vizitează zona la ore diferite (dimineața, seara, weekend). Verifică accesul la transport public, școli, magazine, spitale. La case, verifică drumul de acces, canalizarea, alimentarea cu apă și gazele naturale. Verifică și planurile urbanistice — să nu apară o autostradă sau un bloc în fața casei tale.</div>
    </div>
  </div>
</div>

<h2>Verdictul nostru</h2>
<p>Nu există un răspuns universal. Alegerea corectă depinde de circumstanțele tale unice. Totuși, pe baza datelor noastre și a feedback-ului de la mii de cumpărători din Transilvania, putem oferi câteva recomandări clare bazate pe profilul tău.</p>

<p>Alege <strong>apartament</strong> dacă prioritizezi locația centrală, costurile reduse și comoditatea, dacă ești la început de carieră sau cauți o investiție cu randament bun din închiriere. Apartamentul este ideal pentru stilul de viață urban, dinamic, în care timpul tău contează mai mult decât spațiul. Alege <strong>casă</strong> dacă prioritizezi spațiul, intimitatea și ești pregătit pentru costuri și responsabilități mai mari, dacă ai familie cu copii sau lucrezi predominant de acasă. Casa este investiția în calitatea vieții — dar necesită și un buget de mentenanță consistent.</p>

<p>Dacă bugetul tău este sub 100.000 EUR, un apartament bine situat va fi aproape întotdeauna alegerea mai înțeleaptă din punct de vedere financiar. Peste acest prag, decizia devine mai nuanțată și depinde mult de prioritățile tale personale.</p>

<div class="article-highlight">
  <div class="article-highlight-title">🔑 Concluzii Cheie</div>
  <ul>
    <li><strong>Buget sub 100.000 EUR</strong> → alege un apartament bine situat — este cea mai înțeleaptă alegere financiară la acest nivel de buget</li>
    <li><strong>Familie cu copii</strong> → casa oferă spațiu, curte și liniște esențiale, dar pregătește-te pentru costuri cu 40-60% mai mari lunar</li>
    <li><strong>Investiție</strong> → apartamentele au lichiditate mai mare și randament din chirii superior (4-7% vs. 2-4% pentru case)</li>
    <li><strong>Tânăr profesionist</strong> → apartamentul central îți oferă flexibilitate, proximitate și valoare de revânzare rapidă</li>
    <li><strong>Work-from-home</strong> → casa devine foarte atractivă — birou separat, liniște, grădină pentru pauze</li>
    <li><strong>Termen lung (10+ ani)</strong> → casele din zone în dezvoltare pot avea apreciere de capital superioară (8-12% anual)</li>
    <li>Calculează mereu <strong>costul total de proprietate</strong> (TCO), nu doar prețul de achiziție — diferența pe 10 ani poate fi de 15.000-40.000 EUR</li>
    <li>Vizitează minimum 5-10 proprietăți din ambele categorii și compară <strong>experiența reală</strong>, nu doar cifrele de pe hârtie</li>
  </ul>
</div>`,

      en: `<h2>The Classic Dilemma: Apartment or House?</h2>
<p>This is one of the most common questions Reveria buyers ask. The answer depends on your financial situation, lifestyle, family plans, and long-term goals.</p>

<h2>Purchase Cost</h2>
<p><strong>Apartments</strong> in Transylvanian cities: 2-room from €60,000-130,000, 3-room from €80,000-180,000. <strong>Houses</strong> (3-4 rooms + land): €100,000-250,000, varying significantly by location.</p>

<h2>Monthly Maintenance Costs</h2>
<p><strong>Apartment:</strong> ~€100-270/month total (association fees + utilities). <strong>House:</strong> ~€160-440/month total (higher utilities + yard + ongoing repairs).</p>

<h2>Lifestyle</h2>
<p><strong>Apartment suits:</strong> young professionals, central location lovers, hands-off maintenance. <strong>House suits:</strong> families with children, remote workers needing space, privacy seekers, garden enthusiasts.</p>

<h2>Resale Value</h2>
<p>Apartments in central areas sell faster (30-60 days) with higher liquidity. Houses take 3-6 months but may appreciate more long-term as areas develop.</p>

<h2>Our Verdict</h2>
<p>Choose an <strong>apartment</strong> if you prioritize location, lower costs, and convenience. Choose a <strong>house</strong> if you prioritize space and privacy and are ready for higher costs. Under €100,000 budget, a well-located apartment is almost always the wiser financial choice.</p>`,

      fr: `<h2>Appartement ou maison ?</h2>
<p>La réponse dépend de votre situation financière, style de vie et projets familiaux.</p>

<h3>Coûts d'achat</h3>
<p><strong>Appartement</strong> : 60 000-180 000 € (2-3 pièces). <strong>Maison</strong> : 100 000-250 000 € (terrain inclus).</p>

<h3>Entretien mensuel</h3>
<p>Appartement : ~100-270 €/mois. Maison : ~160-440 €/mois.</p>

<h3>Style de vie</h3>
<p>Appartement pour jeunes professionnels, emplacement central. Maison pour familles, espace, intimité.</p>

<h3>Verdict</h3>
<p>Budget inférieur à 100 000 € : l'appartement bien situé est presque toujours le choix le plus judicieux financièrement.</p>`,

      de: `<h2>Wohnung oder Haus?</h2>
<p>Die Antwort hängt von Ihrer finanziellen Situation, Ihrem Lebensstil und Ihren Familienplänen ab.</p>

<h3>Kaufkosten</h3>
<p><strong>Wohnung</strong>: 60.000-180.000 € (2-3 Zimmer). <strong>Haus</strong>: 100.000-250.000 € (inkl. Grundstück).</p>

<h3>Monatliche Unterhaltskosten</h3>
<p>Wohnung: ~100-270 €/Monat. Haus: ~160-440 €/Monat.</p>

<h3>Lebensstil</h3>
<p>Wohnung für junge Berufstätige, zentrale Lage. Haus für Familien, Platz, Privatsphäre.</p>

<h3>Fazit</h3>
<p>Bei einem Budget unter 100.000 € ist eine gut gelegene Wohnung fast immer die klügere finanzielle Wahl.</p>`,
    },
    coverImage:
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80",
    category: "guide",
    tags: [
      "apartament",
      "casă",
      "comparație",
      "costuri",
      "stil-de-viață",
      "întreținere",
    ],
    publishedAt: "2026-04-12T09:00:00.000Z",
    authorName: "Echipa Reveria",
    authorAvatar: null,
    readTimeMinutes: 6,
  },

  // ─── 8. Tax Guide for Property Owners in Romania ───
  {
    slug: "ghid-impozite-proprietari-romania",
    title: {
      en: "Tax Guide for Property Owners in Romania",
      ro: "Ghid impozite pentru proprietarii de imobile în România",
      fr: "Guide fiscal pour les propriétaires immobiliers en Roumanie",
      de: "Steuerleitfaden für Immobilienbesitzer in Rumänien",
    },
    excerpt: {
      en: "Everything property owners need to know about taxes in Romania: property tax calculation, rental income tax (10%), capital gains, annual obligations, and tax optimization strategies.",
      ro: "Tot ce trebuie să știe proprietarii despre impozite în România: calculul impozitului pe proprietate, impozitul pe chirii (10%), câștigurile de capital, obligații anuale și strategii de optimizare fiscală.",
      fr: "Tout ce que les propriétaires doivent savoir sur les impôts en Roumanie : taxe foncière, impôt sur les revenus locatifs (10%), plus-values et stratégies d'optimisation fiscale.",
      de: "Alles, was Immobilienbesitzer über Steuern in Rumänien wissen müssen: Grundsteuerberechnung, Mieteinkommensteuer (10%), Kapitalgewinne und Steueroptimierungsstrategien.",
    },
    content: {
      ro: `<h2>Ghid complet: obligațiile fiscale ale proprietarilor de imobile în România</h2>
<p>Fie că ai un singur apartament sau un portofoliu de proprietăți, înțelegerea obligațiilor fiscale este esențială pentru a evita surprizele neplăcute. România are un sistem fiscal relativ simplu pentru proprietarii de imobile, dar nerespectarea termenelor poate duce la penalități semnificative — majorări de întârziere de <strong>1% pe lună</strong> și amenzi de până la 500 lei. Acest ghid acoperă exhaustiv toate tipurile de impozite, termenele limită, strategiile de optimizare și cele mai frecvente greșeli pe care le fac proprietarii.</p>

<div class="article-stats-grid">
  <div class="article-stat">
    <div class="article-stat-value">0,08% – 0,2%</div>
    <div class="article-stat-label">Impozit pe proprietate (anual)</div>
  </div>
  <div class="article-stat">
    <div class="article-stat-value">10% (8% efectiv)</div>
    <div class="article-stat-label">Impozit pe venitul din chirii</div>
  </div>
  <div class="article-stat">
    <div class="article-stat-value">1% – 3%</div>
    <div class="article-stat-label">Impozit pe câștigul de capital</div>
  </div>
  <div class="article-stat">
    <div class="article-stat-value">5% / 9% / 19%</div>
    <div class="article-stat-label">TVA proprietăți noi</div>
  </div>
</div>

<figure class="article-figure">
  <img src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80" alt="Documente fiscale, calculator și pixuri pe un birou de lemn" />
  <figcaption>Înțelegerea sistemului fiscal imobiliar din România — un ghid complet și actualizat pentru proprietarii de apartamente și case din Transilvania.</figcaption>
</figure>

<div class="article-callout article-callout-important">
  <div class="article-callout-title">🔴 Obligații ANAF — termene și consecințe</div>
  <p>Acest ghid reflectă legislația fiscală în vigoare din <strong>ianuarie 2026</strong>, conform Codului Fiscal actualizat. Cele mai importante termene sunt: <strong>31 martie</strong> (impozit pe proprietate — prima tranșă sau plata integrală cu reducere 10%), <strong>25 mai</strong> (Declarația unică pentru veniturile din chirii) și <strong>30 septembrie</strong> (a doua tranșă impozit). Nerespectarea acestor termene atrage majorări de <strong>1% pe lună de întârziere</strong> și amenzi de 50-500 lei. Verifică mereu pe <strong>anaf.ro</strong> pentru ultimele actualizări legislative.</p>
</div>

<h2>Toate impozitele proprietarilor — tabel comparativ complet</h2>
<p>Ca proprietar de imobil în România, poți avea mai multe obligații fiscale simultane, în funcție de câte proprietăți deții și dacă obții venituri din chirii sau din vânzarea lor. Iată un tabel centralizator cu toate tipurile de impozite relevante:</p>

<div class="article-table-wrapper">
  <table class="article-table">
    <thead>
      <tr>
        <th>Tip impozit</th>
        <th>Cotă</th>
        <th>Baza de calcul</th>
        <th>Termen plată</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Impozit pe clădiri</strong></td>
        <td>0,08% – 0,2%</td>
        <td>Valoarea impozabilă a clădirii</td>
        <td>31 martie (tranșa I) / 30 septembrie (tranșa II)</td>
      </tr>
      <tr>
        <td><strong>Impozit pe teren</strong></td>
        <td>Variabil (zona + categorie)</td>
        <td>Suprafața și categoria terenului</td>
        <td>31 martie / 30 septembrie</td>
      </tr>
      <tr>
        <td><strong>Impozit pe chirii</strong></td>
        <td class="table-highlight">10% (efectiv 8%)</td>
        <td>Venitul net (brut – 20% deducere forfetară)</td>
        <td>25 mai (Declarația unică)</td>
      </tr>
      <tr>
        <td><strong>CASS (sănătate)</strong></td>
        <td>10%</td>
        <td>Plafonul de 6 salarii minime (fix ~2.000 lei/an)</td>
        <td>25 mai</td>
      </tr>
      <tr>
        <td><strong>Impozit la vânzare (sub 3 ani)</strong></td>
        <td class="table-highlight">3%</td>
        <td>Prețul total de vânzare</td>
        <td>Se reține de notar la tranzacție</td>
      </tr>
      <tr>
        <td><strong>Impozit la vânzare (peste 3 ani)</strong></td>
        <td>1%</td>
        <td>Prețul total de vânzare</td>
        <td>Se reține de notar la tranzacție</td>
      </tr>
      <tr>
        <td><strong>TVA (proprietăți noi)</strong></td>
        <td>5% / 9% / 19%</td>
        <td>Prețul de achiziție de la dezvoltator</td>
        <td>La achiziție</td>
      </tr>
    </tbody>
  </table>
</div>

<div class="article-callout article-callout-info">
  <div class="article-callout-title">💡 Optimizarea impozitului pe chirii — deducerea forfetară de 20%</div>
  <p>Sistemul fiscal românesc oferă un beneficiu important pentru proprietarii care închiriază: o <strong>deducere forfetară de 20%</strong> din venitul brut, fără a fi necesară justificarea cheltuielilor cu facturi. Aceasta înseamnă că din fiecare 1.000 lei chirie încasată, doar 800 lei sunt impozabili. Impozitul de 10% se aplică pe cei 800 lei, rezultând un impozit efectiv de doar <strong>8% din venitul brut</strong>. Este una dintre cele mai avantajoase cote efective din Europa pentru venitul din chirii. De exemplu, o chirie lunară de 2.000 lei generează un impozit anual de doar <strong>1.920 lei</strong> (24.000 × 80% × 10%).</p>
</div>

<figure class="article-figure">
  <img src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80" alt="Contabil analizând documente financiare pe un birou cu laptop" />
  <figcaption>Consultarea unui contabil specializat este recomandată pentru proprietarii cu 2+ proprietăți sau venituri anuale din chirii peste 30.000 lei.</figcaption>
</figure>

<h2>1. Impozitul pe proprietate (clădiri)</h2>
<p>Impozitul pe clădiri se plătește anual și se calculează diferit pentru persoane fizice și juridice. Este cel mai comun impozit cu care se confruntă proprietarii. Cota de impozitare este stabilită de fiecare primărie, de obicei între <strong>0,08% și 0,2%</strong> din valoarea impozabilă. De exemplu, un apartament de 60 m² într-un bloc din zona B a Clujului are un impozit anual de aproximativ <strong>100-250 lei</strong>.</p>

<div class="article-callout article-callout-warning">
  <div class="article-callout-title">⚠️ Penalități pentru plata cu întârziere</div>
  <p>Nerespectarea termenelor de plată a impozitului pe proprietate atrage consecințe financiare serioase: <strong>majorări de întârziere de 1% pe lună</strong> (12% pe an!) pentru sumele neplătite, plus <strong>amenzi de 50-500 lei</strong> pentru nedepunerea declarațiilor. Dacă deții proprietăți multiple și nu plătești la timp, penalitățile se cumulează rapid. Un impozit inițial de 500 lei poate deveni 680 lei după doar un an de întârziere (500 + 60 majorare + 50 amendă minimă + taxe executare). ANAF poate iniția <strong>executarea silită</strong> după 90 de zile de la scadență.</p>
</div>

<h2>2. Declararea veniturilor din chirii — pas cu pas</h2>
<p>Dacă închiriezi o proprietate, venitul din chirii este impozabil. Iată pașii completi pe care trebuie să-i urmezi pentru a fi în conformitate cu legislația fiscală:</p>

<div class="article-steps">
  <div class="article-step">
    <div class="article-step-number">1</div>
    <div class="article-step-content">
      <div class="article-step-title">Înregistrează contractul de închiriere la ANAF</div>
      <div class="article-step-desc">Orice contract de închiriere trebuie înregistrat la administrația fiscală locală în termen de <strong>30 de zile</strong> de la data încheierii. Neînregistrarea atrage o amendă de 1-5% din chiria anuală. Poți face înregistrarea online pe anaf.ro sau la ghișeu cu formularul standard.</div>
    </div>
  </div>
  <div class="article-step">
    <div class="article-step-number">2</div>
    <div class="article-step-content">
      <div class="article-step-title">Calculează venitul brut anual</div>
      <div class="article-step-desc">Adună toate chiriile încasate pe parcursul anului, indiferent dacă au fost plătite în cont bancar sau cash. De exemplu, o chirie de 1.500 lei/lună × 12 luni = <strong>18.000 lei venit brut anual</strong>. Include și eventualele plăți restante recuperate din anul precedent.</div>
    </div>
  </div>
  <div class="article-step">
    <div class="article-step-number">3</div>
    <div class="article-step-content">
      <div class="article-step-title">Aplică deducerea forfetară de 20%</div>
      <div class="article-step-desc">Din venitul brut se scad automat 20% ca cheltuieli forfetare — nu trebuie să justifici cu facturi. Din 18.000 lei, venitul net impozabil = <strong>14.400 lei</strong>. Aceasta acoperă uzura proprietății, reparații minore și alte cheltuieli curente.</div>
    </div>
  </div>
  <div class="article-step">
    <div class="article-step-number">4</div>
    <div class="article-step-content">
      <div class="article-step-title">Calculează impozitul pe venit (10%)</div>
      <div class="article-step-desc">Impozitul pe venit = 10% × 14.400 lei = <strong>1.440 lei</strong>. Efectiv, aceasta înseamnă un impozit de <strong>8% din venitul brut</strong>. Este una dintre cele mai mici cote efective din Europa pentru venitul din chirii.</div>
    </div>
  </div>
  <div class="article-step">
    <div class="article-step-number">5</div>
    <div class="article-step-content">
      <div class="article-step-title">Verifică dacă datorezi CASS (contribuția de sănătate)</div>
      <div class="article-step-desc">Dacă venitul anual din chirii depășește 6 salarii minime brute (~20.000 lei în 2026), datorezi și CASS de 10% din plafonul de 6 salarii minime — un cost fix de <strong>~2.000 lei/an</strong>, indiferent cât de mult depășești pragul. Sub acest prag, nu datorezi CASS.</div>
    </div>
  </div>
  <div class="article-step">
    <div class="article-step-number">6</div>
    <div class="article-step-content">
      <div class="article-step-title">Depune Declarația unică (formularul 212) până la 25 mai</div>
      <div class="article-step-desc">Completează și depune formularul 212 online pe <strong>anaf.ro</strong> sau la ghișeul ANAF. Declarația include atât venitul estimat pentru anul curent, cât și regularizarea anului precedent. Plata impozitului și a CASS se face tot până la 25 mai.</div>
    </div>
  </div>
</div>

<h2>3. Impozit pe proprietăți multiple — supraimpozitare 150%/300%</h2>
<p>Dacă deții mai mult de o proprietate rezidențială ca persoană fizică, impozitul pe clădiri crește dramatic. Această supraimpozitare este menită să descurajeze acumularea de proprietăți neproductive și poate transforma o investiție aparent profitabilă într-una costisitoare fiscal:</p>

<div class="article-table-wrapper">
  <table class="article-table">
    <thead>
      <tr>
        <th>Proprietate</th>
        <th>Impozit anual (apartament 65 m², zona B)</th>
        <th>Majorare</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Prima proprietate</strong></td>
        <td>180 lei</td>
        <td>Fără majorare</td>
      </tr>
      <tr>
        <td><strong>A doua proprietate</strong></td>
        <td class="table-highlight">450 lei</td>
        <td class="table-highlight">+150% (de 2,5× mai mult)</td>
      </tr>
      <tr>
        <td><strong>A treia și următoarele</strong></td>
        <td class="table-highlight">720 lei</td>
        <td class="table-highlight">+300% (de 4× mai mult)</td>
      </tr>
      <tr>
        <td><strong>Total pentru 3 proprietăți identice</strong></td>
        <td class="table-highlight"><strong>1.350 lei/an</strong></td>
        <td>Față de 540 lei fără majorare</td>
      </tr>
    </tbody>
  </table>
</div>

<h2>4. Impozitul pe câștigul de capital (la vânzare)</h2>
<p>Când vinzi o proprietate, câștigul de capital este impozabil. Impozitul se calculează direct din prețul de vânzare (nu din profit), dar cota depinde de durata deținerii. Atenție: impozitul se reține de notar la momentul tranzacției, deci nu trebuie să-l plătești separat.</p>

<h2>5. TVA la proprietăți noi</h2>
<p>Proprietățile noi (vândute pentru prima dată de un dezvoltator) sunt supuse TVA-ului. Cota depinde de suprafață, preț și numărul achiziției. Diferența între 5% și 19% la o proprietate de 100.000 EUR este de <strong>14.000 EUR</strong> — o sumă enormă care merită să fie planificată cu atenție.</p>

<div class="article-callout article-callout-tip">
  <div class="article-callout-title">💰 Strategii legale de optimizare fiscală</div>
  <p>Există mai multe modalități legale de a-ți reduce obligațiile fiscale: <strong>1)</strong> Plătește impozitul pe proprietate integral până la 31 martie pentru reducerea de 10%. <strong>2)</strong> Păstrează toate chitanțele de renovare — pot fi utile la justificarea valorii la revânzare. <strong>3)</strong> Vinde proprietatea după minim 3 ani de deținere — impozitul scade de la 3% la 1%. <strong>4)</strong> Pentru 3+ proprietăți, consideră un <strong>SRL imobiliar</strong> — impozit pe profit doar 1% (microîntreprindere) versus 8% efectiv pe persoană fizică, fără supraimpozitare pe proprietăți multiple, cu posibilitatea deducerii cheltuielilor reale de renovare și reparații. <strong>5)</strong> Folosește TVA-ul de 5% la prima achiziție de locuință nouă sub 120 m² și 600.000 lei.</p>
</div>

<h2>Persoană fizică vs. SRL imobiliar — comparație detaliată</h2>
<p>Pentru portofolii mari de proprietăți, un SRL poate fi semnificativ mai eficient fiscal. Iată comparația completă care arată de ce proprietarii cu 3+ imobile ar trebui să considere serios această opțiune:</p>

<div class="article-table-wrapper">
  <table class="article-table">
    <thead>
      <tr>
        <th>Criteriu</th>
        <th>Persoană fizică</th>
        <th>SRL (microîntreprindere)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Impozit pe venit din chirii</td>
        <td>~8% efectiv</td>
        <td class="table-highlight">1% (impozit micro)</td>
      </tr>
      <tr>
        <td>Supraimpozitare proprietăți multiple</td>
        <td>150% / 300% majorare</td>
        <td class="table-highlight">Nu se aplică</td>
      </tr>
      <tr>
        <td>Deducerea cheltuielilor reale</td>
        <td>Nu (doar forfetarul de 20%)</td>
        <td class="table-highlight">Da (renovări, reparații, dobânzi credit)</td>
      </tr>
      <tr>
        <td>Costuri administrative</td>
        <td>Minime</td>
        <td>300-600 lei/lună (contabilitate)</td>
      </tr>
      <tr>
        <td>Recomandat de la</td>
        <td>1-2 proprietăți</td>
        <td class="table-highlight">3+ proprietăți</td>
      </tr>
    </tbody>
  </table>
</div>

<h2>Calendar fiscal complet pentru proprietari — 2026</h2>
<p>Setează aceste date în calendar pentru a nu rata niciun termen important. Recomandăm crearea unui reminder cu 15 zile înainte de fiecare termen limită:</p>

<div class="article-steps">
  <div class="article-step">
    <div class="article-step-number">31 Ian</div>
    <div class="article-step-content">
      <div class="article-step-title">Declarația de impunere pentru proprietăți noi</div>
      <div class="article-step-desc">Dacă ai cumpărat, construit sau moștenit o proprietate în anul precedent, depune declarația la primărie în maximum 30 de zile, dar nu mai târziu de 31 ianuarie. Formularul se completează la ghișeul primăriei sau online unde este disponibil.</div>
    </div>
  </div>
  <div class="article-step">
    <div class="article-step-number">31 Mar</div>
    <div class="article-step-content">
      <div class="article-step-title">Prima tranșă impozit pe proprietate și teren + bonus plată integrală</div>
      <div class="article-step-desc">Plătește 50% din impozitul anual. <strong>Bonus:</strong> dacă plătești integral (100%) până la această dată, primești <strong>reducere de 10%</strong>. Plata se face la primărie, online (ghiseul.ro) sau prin virament bancar. Setează un reminder pentru 15 martie.</div>
    </div>
  </div>
  <div class="article-step">
    <div class="article-step-number">25 Mai</div>
    <div class="article-step-content">
      <div class="article-step-title">Declarația unică (formularul 212) — chirii și CASS</div>
      <div class="article-step-desc">Declară veniturile din chirii ale anului precedent, estimarea pentru anul curent și regularizarea CASS. Plata impozitului pe venit (10% din net) și a CASS (dacă se aplică) se face tot până la această dată. Depunere exclusiv online pe <strong>anaf.ro</strong> — autentificare cu certificat digital sau cont SPV.</div>
    </div>
  </div>
  <div class="article-step">
    <div class="article-step-number">30 Sep</div>
    <div class="article-step-content">
      <div class="article-step-title">A doua tranșă impozit pe proprietate și teren</div>
      <div class="article-step-desc">Plătește restul de 50% din impozitul anual (dacă nu ai plătit integral în martie). <strong>Atenție:</strong> după această dată, sumele neplătite generează majorări de <strong>1% pe lună de întârziere</strong>. ANAF poate iniția executare silită după 90 de zile de la scadență.</div>
    </div>
  </div>
</div>

<div class="article-highlight">
  <div class="article-highlight-title">🔑 Calendar fiscal și concluzii cheie</div>
  <ul>
    <li><strong>31 ianuarie</strong> — declarație la primărie pentru proprietăți noi (cumpărate, construite sau moștenite în anul precedent)</li>
    <li><strong>31 martie</strong> — prima tranșă impozit proprietate + <strong>reducere 10% dacă plătești integral</strong></li>
    <li><strong>25 mai</strong> — Declarația unică (formularul 212) pentru veniturile din chirii + plata impozitului și CASS</li>
    <li><strong>30 septembrie</strong> — a doua tranșă impozit proprietate (dacă nu ai plătit integral în martie)</li>
    <li><strong>Impozitul pe proprietate</strong> este modest (100-300 lei/an pentru un apartament), dar crește dramatic la proprietăți multiple (majorare 150-300%)</li>
    <li><strong>Venitul din chirii</strong> se impozitează efectiv cu doar 8% din brut — una dintre cele mai mici cote din Europa</li>
    <li><strong>CASS</strong> se aplică dacă venitul anual din chirii depășește ~20.000 lei — cost fix de ~2.000 lei/an</li>
    <li><strong>La vânzare</strong>, deține proprietatea minim 3 ani pentru a plăti doar 1% în loc de 3% impozit pe prețul de vânzare</li>
    <li>Pentru <strong>3+ proprietăți</strong>, un SRL imobiliar poate reduce semnificativ povara fiscală (1% vs. 8%)</li>
    <li><strong>Consultă un contabil</strong> specializat dacă ai venituri din chirii peste 30.000 lei/an sau portofoliu de proprietăți</li>
  </ul>
</div>`,

      en: `<h2>Tax Obligations as a Property Owner in Romania</h2>
<p>Whether you own a single apartment or a portfolio of properties, understanding your tax obligations is essential. Romania has a relatively straightforward tax system for property owners, but missing deadlines can lead to significant penalties.</p>

<h2>1. Property Tax (Buildings)</h2>
<p>Annual property tax is set by each municipality, typically <strong>0.08-0.2%</strong> of taxable value. A 60m² apartment in Cluj's zone B costs approximately <strong>€20-50/year</strong>. Multiple property surcharges: 150% for the second property, 300% for the third and beyond.</p>
<p>Payment deadlines: March 31 (first installment, with 10% discount for full payment) and September 30.</p>

<h2>2. Rental Income Tax</h2>
<p>Rental income is taxed at <strong>10%</strong> of net income (gross minus 20% flat-rate expenses), effectively <strong>8% of gross rental income</strong>. If annual rental income exceeds 6 gross minimum wages (~€4,000), you also owe health insurance (CASS) of 10% on the cap amount — a fixed cost of ~€400/year.</p>
<p>File the Single Declaration by May 25 of the following year.</p>

<h2>3. Capital Gains Tax (Sale)</h2>
<ul>
  <li><strong>Under 3 years ownership</strong>: 3% of sale price</li>
  <li><strong>Over 3 years ownership</strong>: 1% of sale price</li>
</ul>
<p>Note: calculated on the full sale price, not just the profit.</p>

<h2>4. VAT on New Properties</h2>
<ul>
  <li><strong>5% VAT</strong>: homes under 120m², price under ~€120,000, first purchase</li>
  <li><strong>9% VAT</strong>: same conditions, second purchase</li>
  <li><strong>19% VAT</strong>: all other cases</li>
</ul>

<h2>Tax Optimization Tips</h2>
<ul>
  <li>Pay property tax in full by March 31 for 10% discount</li>
  <li>Keep renovation receipts for expense declarations</li>
  <li>Consult an accountant for portfolios with 2+ properties</li>
  <li>Consider an LLC for large portfolios — may be more tax-efficient</li>
</ul>`,

      fr: `<h2>Obligations fiscales des propriétaires en Roumanie</h2>

<h3>Taxe foncière</h3>
<p>Taux : 0,08-0,2% de la valeur imposable. Paiement en deux tranches : 31 mars et 30 septembre. Réduction de 10% si paiement intégral avant le 31 mars.</p>

<h3>Impôt sur les revenus locatifs</h3>
<p>Taux effectif : <strong>8% du revenu locatif brut</strong> (10% sur le net après déduction forfaitaire de 20%). CASS supplémentaire si revenu annuel &gt; 6 SMIC bruts.</p>

<h3>Plus-value immobilière</h3>
<ul>
  <li>Moins de 3 ans : 3% du prix de vente</li>
  <li>Plus de 3 ans : 1% du prix de vente</li>
</ul>

<h3>Optimisation</h3>
<p>Payez avant le 31 mars pour 10% de réduction. Consultez un comptable pour les portefeuilles importants.</p>`,

      de: `<h2>Steuerpflichten für Immobilienbesitzer in Rumänien</h2>

<h3>Grundsteuer</h3>
<p>Steuersatz: 0,08-0,2% des steuerpflichtigen Werts. Zahlung in zwei Raten: 31. März und 30. September. 10% Rabatt bei vollständiger Zahlung bis 31. März.</p>

<h3>Mieteinkommensteuer</h3>
<p>Effektiver Steuersatz: <strong>8% der Bruttomieteinnahmen</strong> (10% auf Nettoeinkommen nach 20% Pauschalabzug). Zusätzliche Krankenversicherung (CASS) wenn Jahresmieteinkommen &gt; 6 Bruttomindestlöhne.</p>

<h3>Kapitalertragssteuer</h3>
<ul>
  <li>Unter 3 Jahre Besitz: 3% des Verkaufspreises</li>
  <li>Über 3 Jahre Besitz: 1% des Verkaufspreises</li>
</ul>

<h3>Optimierung</h3>
<p>Zahlen Sie vor dem 31. März für 10% Rabatt. Konsultieren Sie einen Steuerberater bei größeren Portfolios.</p>`,
    },
    coverImage:
      "https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=1200&q=80",
    category: "guide",
    tags: [
      "impozite",
      "taxe",
      "chirii",
      "câștig-capital",
      "TVA",
      "fiscal",
      "proprietari",
    ],
    publishedAt: "2026-04-14T10:00:00.000Z",
    authorName: "Echipa Reveria",
    authorAvatar: null,
    readTimeMinutes: 8,
  },
];
