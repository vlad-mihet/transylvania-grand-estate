-- Idempotent data migration: backfill the Revery city catalogue from
-- packages/data/src/cities.ts. Production currently has the original nine
-- Transylvania/Mures rows; this inserts the broader Romanian city set without
-- overwriting admin-managed records.
--
-- Safe to re-run: city slug is unique and the insert uses ON CONFLICT DO
-- NOTHING. Public Revery hides Reghin and Tarnaveni in API scope; the rows
-- remain available to admin so existing listings/neighborhoods are preserved.

CREATE TEMP TABLE "_revery_city_backfill_source" (
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" JSONB NOT NULL,
  "image" TEXT NOT NULL,
  "property_count" INTEGER NOT NULL,
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "county_slug" TEXT NOT NULL
) ON COMMIT DROP;

INSERT INTO "_revery_city_backfill_source" (
  "name", "slug", "description", "image", "property_count",
  "latitude", "longitude", "county_slug"
)
VALUES
  ('Cluj-Napoca', 'cluj-napoca', '{"en":"Romania''s vibrant tech hub and cultural capital of Transylvania, known for its historic architecture and modern lifestyle.","ro":"Centrul tehnologic vibrant al României și capitala culturală a Transilvaniei, cunoscut pentru arhitectura istorică și stilul de viață modern."}'::jsonb, '/images/cities/cluj-napoca.jpg', 2, 46.7712, 23.6236, 'cluj'),
  ('Oradea', 'oradea', '{"en":"The Art Nouveau jewel of Romania, featuring stunning Habsburg-era architecture and thermal spa culture.","ro":"Bijuteria Art Nouveau a României, cu o arhitectură uimitoare din era habsburgică și cultură termală."}'::jsonb, '/images/cities/oradea.jpg', 2, 47.0465, 21.9189, 'bihor'),
  ('Timișoara', 'timisoara', '{"en":"European Capital of Culture 2023, a cosmopolitan city blending Baroque heritage with contemporary innovation.","ro":"Capitala Europeană a Culturii 2023, un oraș cosmopolit care îmbină moștenirea barocă cu inovația contemporană."}'::jsonb, '/images/cities/timisoara.jpg', 2, 45.7489, 21.2087, 'timis'),
  ('Brașov', 'brasov', '{"en":"Nestled at the foot of the Carpathian Mountains, offering alpine luxury living with medieval charm.","ro":"Așezat la poalele Munților Carpați, oferind un trai de lux alpin cu farmec medieval."}'::jsonb, '/images/cities/brasov.jpg', 2, 45.6427, 25.5887, 'brasov'),
  ('Sibiu', 'sibiu', '{"en":"A medieval gem with cobblestone streets, fortified churches, and a thriving cultural scene.","ro":"O bijuterie medievală cu străzi pavate, biserici fortificate și o scenă culturală înfloritoare."}'::jsonb, '/images/cities/sibiu.jpg', 2, 45.7983, 24.1256, 'sibiu'),
  ('Târgu Mureș', 'targu-mures', '{"en":"A multicultural Transylvanian city famed for its Secession-era Palace of Culture and the rose-lined central square — an emerging residential market anchored by medical, tech, and manufacturing employers.","ro":"Un oraș transilvănean multicultural, renumit pentru Palatul Culturii în stil Secession și Piața Trandafirilor — o piață rezidențială în creștere, susținută de angajatori din medicină, tehnologie și industrie."}'::jsonb, '/images/cities/targu-mures.jpg', 0, 46.5455, 24.5625, 'mures'),
  ('Sighișoara', 'sighisoara', '{"en":"A living medieval citadel and UNESCO World Heritage Site — birthplace of Vlad the Impaler and Transylvania''s most iconic fortified town, where painted Saxon houses cluster beneath the clock tower.","ro":"O cetate medievală vie și sit UNESCO — locul de naștere al lui Vlad Țepeș și cel mai emblematic oraș fortificat al Transilvaniei, cu case săsești colorate adunate la poalele Turnului cu Ceas."}'::jsonb, '/images/cities/sighisoara.jpg', 0, 46.2182, 24.7935, 'mures'),
  ('Reghin', 'reghin', '{"en":"Transylvania''s violin-making capital, home to the Gliga workshops that ship instruments worldwide — a compact Mureș-county town set between Saxon heritage churches and the forested foothills of the Călimani.","ro":"Capitala lutieriei transilvane, unde atelierele Gliga livrează viori în toată lumea — un oraș compact din județul Mureș, așezat între bisericile săsești istorice și pădurile Călimanilor."}'::jsonb, '/images/cities/reghin.jpg', 0, 46.7765, 24.7069, 'mures'),
  ('Târnăveni', 'tarnaveni', '{"en":"An industrial-era Mureș-county town on the banks of the Târnava Mică — a working-class market anchored by chemistry plants, a grand Art Deco town hall, and access to the Târnave wine region.","ro":"Un oraș mureșean cu tradiție industrială, pe malurile Târnavei Mici — o piață muncitorească cu fabrici de chimie, o primărie impunătoare în stil Art Deco și acces către podgoria Târnavelor."}'::jsonb, '/images/cities/tarnaveni.jpg', 0, 46.3327, 24.2868, 'mures'),
  ('București', 'bucuresti', '{"en":"Romania''s capital and largest metropolis — a Belle Époque boulevard city layered with Communist-era monumentalism, a thriving startup scene, and the country''s deepest property market.","ro":"Capitala României și cea mai mare metropolă a țării — un oraș de bulevarde Belle Époque peste care s-au așezat monumentalismul comunist, o scenă antreprenorială efervescentă și cea mai adâncă piață imobiliară din România."}'::jsonb, '/images/cities/placeholder.jpg', 0, 44.4268, 26.1025, 'bucuresti'),
  ('Alba Iulia', 'alba-iulia', '{"en":"Transylvania''s historic capital and the site of Romania''s Great Union in 1918 — a Vauban-style star fortress reshaped into an elegant, cobbled cultural district.","ro":"Capitala istorică a Transilvaniei și locul Marii Uniri din 1918 — o cetate bastionară în stil Vauban transformată într-un cartier cultural elegant, cu străzi pavate."}'::jsonb, '/images/cities/placeholder.jpg', 0, 46.0710, 23.5700, 'alba'),
  ('Alexandria', 'alexandria', '{"en":"A 19th-century planned town on the Wallachian plain — Teleorman''s grid-laid county seat, a quiet agricultural centre between Bucharest and the Danube.","ro":"Un oraș planificat din secolul XIX, pe câmpia munteană — reședința cu trama stradală rectangulară a Teleormanului, un centru agricol liniștit între București și Dunăre."}'::jsonb, '/images/cities/placeholder.jpg', 0, 43.9710, 25.3324, 'teleorman'),
  ('Arad', 'arad', '{"en":"A Mureș-crossing border city whose Secessionist downtown, wide avenues and cross-Hungarian trade ties make it one of western Romania''s most liveable second cities.","ro":"Un oraș de frontieră pe Mureș, al cărui centru secesionist, bulevardele largi și legăturile comerciale cu Ungaria îl fac unul dintre cele mai plăcute orașe secundare din vestul României."}'::jsonb, '/images/cities/placeholder.jpg', 0, 46.1866, 21.3123, 'arad'),
  ('Bacău', 'bacau', '{"en":"A Moldavian hub on the Bistrița river, balancing Soviet-era housing estates with a revived historic centre and proximity to the Nemira mountains.","ro":"Un centru moldovenesc pe râul Bistrița, în care blocurile din epoca comunistă conviețuiesc cu un centru istoric revitalizat și cu accesul rapid către munții Nemira."}'::jsonb, '/images/cities/placeholder.jpg', 0, 46.5670, 26.9146, 'bacau'),
  ('Baia Mare', 'baia-mare', '{"en":"Maramureș''s capital — a mining town set against the Gutâi mountains, with Stephen''s Tower, a revived Old Town square and easy reach of the region''s wooden churches.","ro":"Capitala Maramureșului — un oraș minier la poalele Gutâiului, cu Turnul Ștefan, o piață a Cetății readusă la viață și acces facil către bisericile de lemn ale regiunii."}'::jsonb, '/images/cities/placeholder.jpg', 0, 47.6593, 23.5685, 'maramures'),
  ('Bistrița', 'bistrita', '{"en":"A Saxon-founded Transylvanian town whose Evangelical tower and arcaded main square still frame a compact, walkable historic core at the edge of the Bârgău foothills.","ro":"Un oraș transilvănean de origine săsească, unde turnul bisericii evanghelice și piața centrală cu arcade conturează un centru istoric compact, la marginea Bârgaielor."}'::jsonb, '/images/cities/placeholder.jpg', 0, 47.1333, 24.5000, 'bistrita-nasaud'),
  ('Botoșani', 'botosani', '{"en":"Northern Moldavia''s cultural hometown — the region that gave Romania Eminescu, Enescu and Iorga, centred on a merchant quarter of 19th-century town houses.","ro":"Orașul cultural al Moldovei de nord — regiunea care i-a dat României pe Eminescu, Enescu și Iorga, structurată în jurul unui cartier negustoresc de case boierești din secolul XIX."}'::jsonb, '/images/cities/placeholder.jpg', 0, 47.7472, 26.6692, 'botosani'),
  ('Brăila', 'braila', '{"en":"A Danube port with a distinctive trident street plan radiating from the riverfront — a multicultural merchant city of 19th-century eclectic façades and Greek, Armenian and Lipovan heritage.","ro":"Un port dunărean cu un plan stradal unic, în evantai pornind de la faleză — un oraș negustoresc multicultural, cu fațade eclectice din secolul XIX și moștenire grecească, armenească și lipovenească."}'::jsonb, '/images/cities/placeholder.jpg', 0, 45.2692, 27.9574, 'braila'),
  ('Buftea', 'buftea', '{"en":"Ilfov''s county seat on the lake-and-forest belt north of Bucharest — home to MediaPro Studios and a popular commuter and weekend-house district for the capital.","ro":"Reședința județului Ilfov, pe centura de lacuri și păduri din nordul Bucureștiului — acasă la MediaPro Studios și un cartier-dormitor și de case de weekend foarte căutat de bucureșteni."}'::jsonb, '/images/cities/placeholder.jpg', 0, 44.5625, 25.9489, 'ilfov'),
  ('Buzău', 'buzau', '{"en":"A crossroads between Muntenia and Moldavia, doorway to the Buzău Carpathians, mud volcanoes and the Bisoca wine country — a compact regional capital with a revived riverfront.","ro":"O răscruce între Muntenia și Moldova, poartă către Carpații Buzăului, Vulcanii Noroioși și podgoria Bisoca — o capitală regională compactă, cu faleza pe Buzău în revitalizare."}'::jsonb, '/images/cities/placeholder.jpg', 0, 45.1503, 26.8248, 'buzau'),
  ('Călărași', 'calarasi', '{"en":"A Danube-and-Borcea river town on the Bărăgan plain, built around an 18th-century merchant harbour and a bird-filled flood-plain that still defines its skyline.","ro":"Un oraș pe Dunăre și Borcea, în plină câmpie a Bărăganului, clădit în jurul unui port negustoresc din secolul XVIII și al unei lunci pline de păsări care încă îi definește orizontul."}'::jsonb, '/images/cities/placeholder.jpg', 0, 44.2058, 27.3306, 'calarasi'),
  ('Constanța', 'constanta', '{"en":"Romania''s Black Sea capital and ancient Tomis — a port city of Roman ruins, an Art Nouveau Casino, the Mamaia beachfront and the country''s busiest summer property market.","ro":"Capitala românească a Mării Negre și anticul Tomis — un oraș port cu ruine romane, Cazinoul Art Nouveau, litoralul Mamaia și cea mai efervescentă piață imobiliară estivală din țară."}'::jsonb, '/images/cities/placeholder.jpg', 0, 44.1598, 28.6348, 'constanta'),
  ('Craiova', 'craiova', '{"en":"Oltenia''s capital and Romania''s sixth-largest city — home to the Ford Otosan plant, Brâncuși''s early works and a restored pedestrian centre that''s drawn real investment back to the south.","ro":"Capitala Olteniei și al șaselea oraș al României — acasă la uzina Ford Otosan, la lucrările timpurii ale lui Brâncuși și la un centru pietonal restaurat care a readus investiția serioasă în sud."}'::jsonb, '/images/cities/placeholder.jpg', 0, 44.3302, 23.7949, 'dolj'),
  ('Deva', 'deva', '{"en":"The Hunedoara-county seat overlooked by its hilltop fortress, with the Corvin Castle at Hunedoara a short drive away — a compact Transylvanian city on the Mureș plain.","ro":"Reședința județului Hunedoara, vegheată de cetatea de pe deal, cu Castelul Corvinilor din Hunedoara la câțiva kilometri — un oraș transilvănean compact, pe câmpia Mureșului."}'::jsonb, '/images/cities/placeholder.jpg', 0, 45.8797, 22.9147, 'hunedoara'),
  ('Drobeta-Turnu Severin', 'drobeta-turnu-severin', '{"en":"A Danube city at the gates of the Iron Gates — where the ruins of Trajan''s Bridge, a Roman castrum and a 19th-century boulevard town share a single riverfront.","ro":"Un oraș dunărean la porțile Porților de Fier — acolo unde ruinele podului lui Traian, un castru roman și un oraș boieresc de secol XIX împart aceeași faleză."}'::jsonb, '/images/cities/placeholder.jpg', 0, 44.6269, 22.6590, 'mehedinti'),
  ('Focșani', 'focsani', '{"en":"The town that sealed the 1859 Union of the Romanian Principalities — Vrancea''s county seat, set at the edge of the Odobești–Panciu–Cotești wine country.","ro":"Orașul care a consfințit Unirea Principatelor de la 1859 — reședința județului Vrancea, așezată la marginea podgoriei Odobești–Panciu–Cotești."}'::jsonb, '/images/cities/placeholder.jpg', 0, 45.6966, 27.1834, 'vrancea'),
  ('Galați', 'galati', '{"en":"A Danube port-and-shipyard city at the confluence of three rivers, with a long waterfront promenade and a revitalising historic downtown of Art Deco façades.","ro":"Un oraș port și șantier naval la confluența a trei râuri, cu o faleză lungă pe Dunăre și un centru istoric în curs de revitalizare, cu fațade Art Deco."}'::jsonb, '/images/cities/placeholder.jpg', 0, 45.4353, 28.0080, 'galati'),
  ('Giurgiu', 'giurgiu', '{"en":"A Danube border town twinned with Ruse across the Friendship Bridge — a quiet riverfront city defined by its Clock Tower, grain-trading past and direct link to Bulgaria.","ro":"Un oraș de graniță pe Dunăre, înfrățit cu Ruse peste Podul Prieteniei — un oraș fluvial liniștit, definit de Turnul Ceasornic, de trecutul de târg cerealier și de legătura directă cu Bulgaria."}'::jsonb, '/images/cities/placeholder.jpg', 0, 43.9037, 25.9699, 'giurgiu'),
  ('Iași', 'iasi', '{"en":"Moldavia''s historic capital and Romania''s oldest university city — a town of Belle Époque boulevards, the Palace of Culture, thirty-odd monasteries and a booming IT economy.","ro":"Capitala istorică a Moldovei și cel mai vechi oraș universitar al României — un oraș de bulevarde Belle Époque, cu Palatul Culturii, peste treizeci de mănăstiri și o economie IT în plină creștere."}'::jsonb, '/images/cities/placeholder.jpg', 0, 47.1585, 27.6014, 'iasi'),
  ('Miercurea Ciuc', 'miercurea-ciuc', '{"en":"Harghita''s Szekely heartland capital — a cold-winter mountain town known for the Mikó Citadel, a century-old brewery and its hockey culture.","ro":"Capitala secuiască a Harghitei — un oraș montan cu ierni aspre, cunoscut pentru Cetatea Mikó, o berărie veche de peste un secol și o cultură puternică a hocheiului."}'::jsonb, '/images/cities/placeholder.jpg', 0, 46.3615, 25.8023, 'harghita'),
  ('Piatra Neamț', 'piatra-neamt', '{"en":"A Carpathian resort city in the Bistrița valley, set beneath the Ceahlău massif — one of Moldavia''s most scenic regional capitals, with a cable-car leaving right from the town centre.","ro":"Un oraș de stațiune carpatină pe valea Bistriței, la poalele masivului Ceahlău — una dintre cele mai pitorești capitale regionale ale Moldovei, cu o telegondolă care pleacă chiar din centru."}'::jsonb, '/images/cities/placeholder.jpg', 0, 46.9275, 26.3707, 'neamt'),
  ('Pitești', 'pitesti', '{"en":"Argeș-county seat anchored by the Dacia–Renault plant in nearby Mioveni — an industrial middle-class city known for its parks, tulip festival and compact pedestrian centre.","ro":"Reședința județului Argeș, susținută de uzina Dacia–Renault din Mioveni — un oraș industrial de clasă mijlocie, cunoscut pentru parcuri, Simfonia Lalelelor și centrul pietonal compact."}'::jsonb, '/images/cities/placeholder.jpg', 0, 44.8565, 24.8692, 'arges'),
  ('Ploiești', 'ploiesti', '{"en":"Romania''s oil capital, built around 19th-century refineries and a downtown of merchant arcades — a dense Prahova-county city thirty minutes from Bucharest on the A3.","ro":"Capitala petrolieră a României, construită în jurul rafinăriilor din secolul XIX și al unui centru cu pasaje negustorești — un oraș prahovean dens, la treizeci de minute de București pe A3."}'::jsonb, '/images/cities/placeholder.jpg', 0, 44.9419, 26.0225, 'prahova'),
  ('Râmnicu Vâlcea', 'ramnicu-valcea', '{"en":"An Olt-valley Vâlcea-county seat circled by salt mines and Horezu pottery villages — a compact, green southern-Carpathian city at the feet of the Southern Carpathians.","ro":"Reședința județului Vâlcea, pe valea Oltului, înconjurată de mine de sare și de satele ceramice din Horezu — un oraș sudic compact și verde, la poalele Carpaților Meridionali."}'::jsonb, '/images/cities/placeholder.jpg', 0, 45.1028, 24.3750, 'valcea'),
  ('Reșița', 'resita', '{"en":"The Banat''s historic steel-making town, cradled by forested mountains — heavy-industry heritage reinvented around open-air museums, cycling trails and the Secu lakes.","ro":"Orașul siderurgic istoric al Banatului, înconjurat de munți împăduriți — o moștenire industrială reinventată în jurul muzeelor în aer liber, al traseelor de ciclism și al lacurilor Secu."}'::jsonb, '/images/cities/placeholder.jpg', 0, 45.2976, 21.8870, 'caras-severin'),
  ('Satu Mare', 'satu-mare', '{"en":"A Someș-river city on the Hungarian border — compact, bilingual, and built around an Art Nouveau theatre and a 19th-century Administrative Palace tower.","ro":"Un oraș pe Someș, la granița cu Ungaria — compact, bilingv, construit în jurul teatrului Art Nouveau și al turnului Palatului Administrativ din secolul XIX."}'::jsonb, '/images/cities/placeholder.jpg', 0, 47.7921, 22.8875, 'satu-mare'),
  ('Sfântu Gheorghe', 'sfantu-gheorghe', '{"en":"The heart of Covasna''s Szekely community — a bilingual Transylvanian town of mineral-water springs, a lively theatre scene and stately 1900s civic architecture.","ro":"Inima comunității secuiești din Covasna — un oraș transilvănean bilingv, cu izvoare de apă minerală, o scenă teatrală activă și arhitectură civică impozantă din anii 1900."}'::jsonb, '/images/cities/placeholder.jpg', 0, 45.8639, 25.7896, 'covasna'),
  ('Slatina', 'slatina', '{"en":"Olt-county seat on the banks of the Olt river — a modern industrial town anchored by the Alro aluminium smelter and a compact, pedestrianised historic centre.","ro":"Reședința județului Olt, pe malurile Oltului — un oraș industrial modern, ancorat în combinatul de aluminiu Alro, cu un centru istoric compact și pietonal."}'::jsonb, '/images/cities/placeholder.jpg', 0, 44.4304, 24.3647, 'olt'),
  ('Slobozia', 'slobozia', '{"en":"Ialomița''s county seat on the Bărăgan plain — a modern agro-industrial town with a surprising full-scale replica of the Eiffel Tower on its skyline.","ro":"Reședința județului Ialomița, în plin Bărăgan — un oraș agroindustrial modern cu o surprinzătoare replică la scară reală a Turnului Eiffel în peisajul urban."}'::jsonb, '/images/cities/placeholder.jpg', 0, 44.5643, 27.3781, 'ialomita'),
  ('Suceava', 'suceava', '{"en":"Stephen the Great''s old Moldavian capital and the gateway to Bukovina''s painted monasteries — a mid-sized city whose fortress ruins still preside over the Siret valley.","ro":"Fosta capitală a Moldovei lui Ștefan cel Mare și poarta spre mănăstirile pictate ale Bucovinei — un oraș mediu ale cărui ruine de cetate veghează încă valea Siretului."}'::jsonb, '/images/cities/placeholder.jpg', 0, 47.6514, 26.2556, 'suceava'),
  ('Târgoviște', 'targoviste', '{"en":"A former Wallachian capital presided over by the Chindia Tower and the princely court ruins — a small, history-dense city between the Carpathians and the Bucharest commuter belt.","ro":"Fostă capitală a Țării Românești, dominată de Turnul Chindiei și de ruinele Curții Domnești — un oraș mic, dens în istorie, între Carpați și coroana de navetă a Bucureștiului."}'::jsonb, '/images/cities/placeholder.jpg', 0, 44.9252, 25.4568, 'dambovita'),
  ('Târgu Jiu', 'targu-jiu', '{"en":"Oltenia''s cultural capital, shaped by Brâncuși''s Endless Column, Gate of the Kiss and Table of Silence — a green city between the Jiu valley and the Southern Carpathians.","ro":"Capitala culturală a Olteniei, modelată de Coloana Infinitului, Poarta Sărutului și Masa Tăcerii ale lui Brâncuși — un oraș verde, între valea Jiului și Carpații Meridionali."}'::jsonb, '/images/cities/placeholder.jpg', 0, 45.0355, 23.2731, 'gorj'),
  ('Tulcea', 'tulcea', '{"en":"The gateway city to the Danube Delta UNESCO biosphere — a hillside port at the head of the delta, where the last stretch of the Danube fans out into the Black Sea.","ro":"Orașul-poartă al Deltei Dunării, sit UNESCO — un port așezat pe coline la vărsarea Dunării, acolo unde fluviul se desface în evantai către Marea Neagră."}'::jsonb, '/images/cities/placeholder.jpg', 0, 45.1812, 28.8050, 'tulcea'),
  ('Vaslui', 'vaslui', '{"en":"A Moldavian market town in Stephen the Great''s historical heartland — site of the 1475 Battle of Podul Înalt and today a quiet county seat at the centre of a largely rural region.","ro":"Un târg moldovenesc în inima ținutului lui Ștefan cel Mare — locul bătăliei de la Podul Înalt din 1475, astăzi o reședință liniștită de județ, în mijlocul unei regiuni preponderent rurale."}'::jsonb, '/images/cities/placeholder.jpg', 0, 46.6407, 27.7276, 'vaslui'),
  ('Zalău', 'zalau', '{"en":"A Sălaj mountain-foot town near the Roman frontier city of Porolissum — a quiet regional capital with a compact civic square and sweeping Meseș-hills views.","ro":"Un oraș sălăjean la poalele munților, aproape de cetatea romană Porolissum — o capitală regională liniștită, cu o piață centrală compactă și panorame largi peste dealurile Meseșului."}'::jsonb, '/images/cities/placeholder.jpg', 0, 47.1897, 23.0572, 'salaj');

-- Counties are normally seeded via `prisma db seed`, not via migrations.
-- On prod (always seeded) all 36 counties exist and every city below
-- gets inserted. On a clean DB (CI's prisma migrate smoke, Playwright
-- jobs that run migrate before seed) counties are absent; we emit a
-- NOTICE rather than raising, and the INSERT below naturally skips
-- cities whose counties haven't been created yet — the INNER JOIN on
-- "counties" excludes them. Seed runs immediately after and fills both
-- counties and cities idempotently.
DO $$
DECLARE
  missing_counties TEXT;
BEGIN
  SELECT string_agg(DISTINCT s."county_slug", ', ' ORDER BY s."county_slug")
  INTO missing_counties
  FROM "_revery_city_backfill_source" s
  LEFT JOIN "counties" c ON c."slug" = s."county_slug"
  WHERE c."id" IS NULL;

  IF missing_counties IS NOT NULL THEN
    RAISE NOTICE 'Skipping Revery city backfill for missing counties (clean-DB run, seed will populate): %', missing_counties;
  END IF;
END $$;

INSERT INTO "cities" (
  "id", "name", "slug", "description", "image",
  "property_count", "latitude", "longitude", "county_id",
  "created_at", "updated_at"
)
SELECT
  gen_random_uuid()::text,
  s."name",
  s."slug",
  s."description",
  s."image",
  s."property_count",
  s."latitude",
  s."longitude",
  c."id",
  NOW(),
  NOW()
FROM "_revery_city_backfill_source" s
JOIN "counties" c ON c."slug" = s."county_slug"
ON CONFLICT ("slug") DO NOTHING;
