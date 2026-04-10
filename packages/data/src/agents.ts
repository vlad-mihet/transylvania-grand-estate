import { Agent } from "@tge/types";

export interface AgentWithCity extends Agent {
  city: string;
}

export const agents: AgentWithCity[] = [
  // ─── Cluj-Napoca (3 agents for 8 properties) ──────────
  {
    id: "agent-001",
    slug: "elena-popescu",
    firstName: "Elena",
    lastName: "Popescu",
    email: "elena.popescu@tge.ro",
    phone: "+40 745 100 201",
    city: "cluj-napoca",
    bio: {
      en: "With over 12 years of experience in luxury real estate, Elena specializes in historic estates and premium villas across Cluj-Napoca. Her deep market knowledge and eye for exceptional properties make her the go-to agent for discerning buyers in Transylvania's vibrant capital.",
      ro: "Cu peste 12 ani de experiență în imobiliarele de lux, Elena este specializată în domenii istorice și vile premium din Cluj-Napoca. Cunoașterea profundă a pieței și ochiul pentru proprietăți excepționale o fac agentul de referință pentru cumpărătorii exigenți din capitala vibrantă a Transilvaniei.",
    },
    active: true,
  },
  {
    id: "agent-002",
    slug: "andrei-moldovan",
    firstName: "Andrei",
    lastName: "Moldovan",
    email: "andrei.moldovan@tge.ro",
    phone: "+40 745 100 202",
    city: "cluj-napoca",
    bio: {
      en: "Andrei brings a background in architecture and urban planning to his role as a luxury property consultant in Cluj-Napoca. His passion for modern developments and penthouses helps clients find homes that combine cutting-edge design with lasting value.",
      ro: "Andrei aduce un background în arhitectură și urbanism în rolul său de consultant imobiliar de lux în Cluj-Napoca. Pasiunea sa pentru dezvoltările moderne și penthouse-uri ajută clienții să găsească locuințe care combină designul de avangardă cu valoare durabilă.",
    },
    active: true,
  },
  {
    id: "agent-003",
    slug: "catalina-rus",
    firstName: "Cătălina",
    lastName: "Rus",
    email: "catalina.rus@tge.ro",
    phone: "+40 745 100 203",
    city: "cluj-napoca",
    bio: {
      en: "Cătălina has spent eight years cultivating relationships with Cluj-Napoca's most exclusive developers and buyers. Her background in interior design gives clients a unique perspective on each property's potential, from contemporary apartments to sprawling family estates.",
      ro: "Cătălina a petrecut opt ani cultivând relații cu cei mai exclusiviști dezvoltatori și cumpărători din Cluj-Napoca. Background-ul ei în design interior oferă clienților o perspectivă unică asupra potențialului fiecărei proprietăți, de la apartamente contemporane la domenii familiale spațioase.",
    },
    active: true,
  },

  // ─── Timișoara (2 agents for 6 properties) ─────────────
  {
    id: "agent-004",
    slug: "radu-stanescu",
    firstName: "Radu",
    lastName: "Stănescu",
    email: "radu.stanescu@tge.ro",
    phone: "+40 745 100 204",
    city: "timisoara",
    bio: {
      en: "A Timișoara native with a decade of experience in premium real estate, Radu excels at matching clients with properties that reflect their lifestyle. From Art Nouveau townhouses to modern waterfront residences, he knows every corner of the city's luxury market.",
      ro: "Originar din Timișoara, cu un deceniu de experiență în imobiliare premium, Radu excelează în a conecta clienții cu proprietăți care reflectă stilul lor de viață. De la case Art Nouveau la reședințe moderne pe malul apei, cunoaște fiecare colț al pieței de lux din oraș.",
    },
    active: true,
  },
  {
    id: "agent-005",
    slug: "diana-crisan",
    firstName: "Diana",
    lastName: "Crișan",
    email: "diana.crisan@tge.ro",
    phone: "+40 745 100 205",
    city: "timisoara",
    bio: {
      en: "Diana joined the Timișoara team after five years with a leading European brokerage. She specializes in investment properties and new developments, guiding both local and international clients through the booming western Transylvania market.",
      ro: "Diana s-a alăturat echipei din Timișoara după cinci ani la o agenție europeană de top. Este specializată în proprietăți de investiții și dezvoltări noi, ghidând clienții locali și internaționali prin piața în expansiune din vestul Transilvaniei.",
    },
    active: true,
  },

  // ─── Brașov (2 agents for 6 properties) ────────────────
  {
    id: "agent-006",
    slug: "maria-ionescu",
    firstName: "Maria",
    lastName: "Ionescu",
    email: "maria.ionescu@tge.ro",
    phone: "+40 745 100 206",
    city: "brasov",
    bio: {
      en: "Maria is renowned for her personalized approach to real estate in the Brașov region. With fluency in four languages and intimate knowledge of the Carpathian foothills market, she makes luxury property investment effortless for international buyers seeking mountain retreats.",
      ro: "Maria este renumită pentru abordarea personalizată în imobiliare din zona Brașov. Cu fluență în patru limbi și cunoaștere intimă a pieței de la poalele Carpaților, face investițiile imobiliare de lux fără efort pentru cumpărătorii internaționali care caută refugii montane.",
    },
    active: true,
  },
  {
    id: "agent-007",
    slug: "victor-luca",
    firstName: "Victor",
    lastName: "Luca",
    email: "victor.luca@tge.ro",
    phone: "+40 745 100 207",
    city: "brasov",
    bio: {
      en: "Victor grew up in the shadow of the Carpathians and turned his love for the region into a career in luxury real estate. He specializes in chalets, mountain estates, and restored heritage properties around Brașov, Poiana Brașov, and the surrounding valleys.",
      ro: "Victor a crescut la poalele Carpaților și și-a transformat dragostea pentru regiune într-o carieră în imobiliare de lux. Este specializat în cabane, domenii montane și proprietăți restaurate din jurul Brașovului, Poiana Brașov și văile înconjurătoare.",
    },
    active: true,
  },

  // ─── Oradea (1 agent for 2 properties) ─────────────────
  {
    id: "agent-008",
    slug: "ioana-nagy",
    firstName: "Ioana",
    lastName: "Nagy",
    email: "ioana.nagy@tge.ro",
    phone: "+40 745 100 208",
    city: "oradea",
    bio: {
      en: "Ioana is the sole luxury specialist in our Oradea office, bringing seven years of expertise in the city's flourishing Art Nouveau property scene. Her bilingual Hungarian-Romanian background gives her a unique edge in this culturally rich border city.",
      ro: "Ioana este singurul specialist de lux din biroul nostru din Oradea, aducând șapte ani de expertiză în scena proprietăților Art Nouveau în plină dezvoltare a orașului. Background-ul ei bilingv maghiar-român îi oferă un avantaj unic în acest oraș de la graniță, bogat cultural.",
    },
    active: true,
  },

  // ─── Sibiu (1 agent for 2 properties) ──────────────────
  {
    id: "agent-009",
    slug: "stefan-bratu",
    firstName: "Ștefan",
    lastName: "Bratu",
    email: "stefan.bratu@tge.ro",
    phone: "+40 745 100 209",
    city: "sibiu",
    bio: {
      en: "Ștefan covers the Sibiu market with a focus on heritage properties and countryside estates. A former cultural heritage consultant, he brings rare insight into the restoration potential and historical significance of properties in one of Romania's most charming medieval cities.",
      ro: "Ștefan acoperă piața din Sibiu cu accent pe proprietăți de patrimoniu și domenii rurale. Fost consultant de patrimoniu cultural, aduce o perspectivă rară asupra potențialului de restaurare și semnificației istorice a proprietăților din unul dintre cele mai fermecătoare orașe medievale din România.",
    },
    active: true,
  },
];
