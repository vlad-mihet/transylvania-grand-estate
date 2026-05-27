"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Mail, Plus, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-header";
import { AccountSkeleton } from "@/components/skeletons";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { useSession } from "@/hooks/use-session";

/**
 * "Raport de piață" — interactive market-evaluation tool for agents.
 *
 * Client-side only: no API, no persistence. The agent fills the form, sees a
 * live one-page report, then prints it (browser → PDF via the `@media print`
 * rules in globals.css that isolate `#raport-print`), copies it as plain text
 * for WhatsApp, or opens it in their mail client.
 *
 * The report itself is intentionally Romanian regardless of UI locale — it's a
 * document the agent hands to a Romanian property owner. Only the nav label is
 * localized (Academy.tools.navLink).
 */

interface Comparable {
  adresa: string;
  suprafata: string;
  pret: string;
  timp: string;
}

function emptyComparable(): Comparable {
  return { adresa: "", suprafata: "", pret: "", timp: "" };
}

function todayRo(): string {
  return new Intl.DateTimeFormat("ro-RO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

/** "98000" → "98.000". Returns the raw string if it isn't a clean number. */
function fmtInt(value: string): string {
  const n = Number(value.replace(/[^\d.-]/g, ""));
  if (!value.trim() || Number.isNaN(n)) return value;
  return new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 0 }).format(n);
}

function pricePerSqm(pret: string, suprafata: string): string {
  const p = Number(pret.replace(/[^\d.-]/g, ""));
  const s = Number(suprafata.replace(/[^\d.-]/g, ""));
  if (!p || !s) return "—";
  return `${fmtInt(String(Math.round(p / s)))} €/mp`;
}

const inputClass =
  "w-full rounded-md border border-[color:var(--color-border)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--color-ring)]";
const labelClass = "mb-1 block text-sm font-medium";

export default function RaportPiataPage() {
  const { isReady } = useAuthGuard();
  const session = useSession();

  const [adresa, setAdresa] = useState("");
  const [data, setData] = useState(todayRo());
  const [agentNume, setAgentNume] = useState("");
  const [agentTelefon, setAgentTelefon] = useState("");

  const [pretMin, setPretMin] = useState("");
  const [pretMax, setPretMax] = useState("");
  const [pretRecomandat, setPretRecomandat] = useState("");
  const [zileVanzare, setZileVanzare] = useState("30-45");
  const [pretRisc, setPretRisc] = useState("");
  const [zileRisc, setZileRisc] = useState("120");

  const [comparabile, setComparabile] = useState<Comparable[]>([
    emptyComparable(),
    emptyComparable(),
    emptyComparable(),
  ]);

  const [avantaje, setAvantaje] = useState("");
  const [dezavantaje, setDezavantaje] = useState("");
  const [recomandare, setRecomandare] = useState("");
  const [comision, setComision] = useState("3% + TVA, doar la vânzare. Nu plătiți nimic în avans.");
  const [pasUrmator, setPasUrmator] = useState(
    "Dacă sunteți de acord cu planul, semnăm contractul de intermediere în exclusivitate (90 de zile) și programăm ședința foto mâine.",
  );

  // Prefill the agent name from the logged-in profile once, without locking it.
  const profileName = session.profile?.name;
  useEffect(() => {
    if (profileName) setAgentNume((prev) => prev || profileName);
  }, [profileName]);

  function updateComparable(idx: number, patch: Partial<Comparable>) {
    setComparabile((rows) =>
      rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    );
  }
  function addComparable() {
    setComparabile((rows) => [...rows, emptyComparable()]);
  }
  function removeComparable(idx: number) {
    setComparabile((rows) => rows.filter((_, i) => i !== idx));
  }

  const filledComparables = comparabile.filter(
    (c) => c.adresa.trim() || c.suprafata.trim() || c.pret.trim() || c.timp.trim(),
  );

  const plainText = useMemo(
    () =>
      buildPlainText({
        adresa,
        data,
        agentNume,
        agentTelefon,
        pretMin,
        pretMax,
        pretRecomandat,
        zileVanzare,
        pretRisc,
        zileRisc,
        comparabile: filledComparables,
        avantaje,
        dezavantaje,
        recomandare,
        comision,
        pasUrmator,
      }),
    [
      adresa, data, agentNume, agentTelefon, pretMin, pretMax, pretRecomandat,
      zileVanzare, pretRisc, zileRisc, filledComparables, avantaje, dezavantaje,
      recomandare, comision, pasUrmator,
    ],
  );

  async function copyForWhatsApp() {
    try {
      await navigator.clipboard.writeText(plainText);
      toast.success("Raport copiat. Lipiți-l în WhatsApp.");
    } catch {
      toast.error("Nu am putut copia. Selectați manual textul din previzualizare.");
    }
  }

  function mailtoHref(): string {
    const subject = `Raport de piață — ${adresa || "evaluare"}`;
    return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(plainText)}`;
  }

  if (!isReady) {
    return (
      <>
        <AppHeader />
        <AccountSkeleton />
      </>
    );
  }

  return (
    <>
      <AppHeader />
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="no-print">
          <h1 className="text-2xl font-semibold">Raport de piață — Evaluare rapidă</h1>
          <p className="mt-2 max-w-2xl text-sm text-[color:var(--color-muted-foreground)]">
            Completează câmpurile, urmărește previzualizarea în timp real, apoi
            printează (Salvează ca PDF), copiază pentru WhatsApp sau trimite pe
            email. O pagină, 3 cifre, 1 plan = semnătură.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* ── Form ───────────────────────────────────────── */}
          <form className="no-print flex flex-col gap-6" onSubmit={(e) => e.preventDefault()}>
            <fieldset className="rounded-lg border border-[color:var(--color-border)] bg-white p-5">
              <legend className="px-1 text-sm font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                Date generale
              </legend>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="sm:col-span-2">
                  <span className={labelClass}>Adresa imobilului</span>
                  <input className={inputClass} value={adresa} onChange={(e) => setAdresa(e.target.value)} placeholder="Str. Exemplu 12, Cluj-Napoca" />
                </label>
                <label>
                  <span className={labelClass}>Data</span>
                  <input className={inputClass} value={data} onChange={(e) => setData(e.target.value)} />
                </label>
                <label>
                  <span className={labelClass}>Agent</span>
                  <input className={inputClass} value={agentNume} onChange={(e) => setAgentNume(e.target.value)} placeholder="Nume agent" />
                </label>
                <label>
                  <span className={labelClass}>Telefon agent</span>
                  <input className={inputClass} value={agentTelefon} onChange={(e) => setAgentTelefon(e.target.value)} placeholder="+40 ..." />
                </label>
              </div>
            </fieldset>

            <fieldset className="rounded-lg border border-[color:var(--color-border)] bg-white p-5">
              <legend className="px-1 text-sm font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                Concluzia în 3 rânduri
              </legend>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label>
                  <span className={labelClass}>Preț de piață — minim (EUR)</span>
                  <input className={inputClass} value={pretMin} onChange={(e) => setPretMin(e.target.value)} placeholder="95000" inputMode="numeric" />
                </label>
                <label>
                  <span className={labelClass}>Preț de piață — maxim (EUR)</span>
                  <input className={inputClass} value={pretMax} onChange={(e) => setPretMax(e.target.value)} placeholder="102000" inputMode="numeric" />
                </label>
                <label>
                  <span className={labelClass}>Preț recomandat (EUR)</span>
                  <input className={inputClass} value={pretRecomandat} onChange={(e) => setPretRecomandat(e.target.value)} placeholder="99000" inputMode="numeric" />
                </label>
                <label>
                  <span className={labelClass}>Se vinde în (zile)</span>
                  <input className={inputClass} value={zileVanzare} onChange={(e) => setZileVanzare(e.target.value)} placeholder="30-45" />
                </label>
                <label>
                  <span className={labelClass}>Preț de risc (EUR)</span>
                  <input className={inputClass} value={pretRisc} onChange={(e) => setPretRisc(e.target.value)} placeholder="110000" inputMode="numeric" />
                </label>
                <label>
                  <span className={labelClass}>Risc &gt; (zile) fără oferte</span>
                  <input className={inputClass} value={zileRisc} onChange={(e) => setZileRisc(e.target.value)} placeholder="120" />
                </label>
              </div>
            </fieldset>

            <fieldset className="rounded-lg border border-[color:var(--color-border)] bg-white p-5">
              <legend className="px-1 text-sm font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                Comparabile (tranzacții reale)
              </legend>
              <div className="mt-3 flex flex-col gap-3">
                {comparabile.map((c, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2">
                    <input className={`${inputClass} col-span-12 sm:col-span-5`} value={c.adresa} onChange={(e) => updateComparable(idx, { adresa: e.target.value })} placeholder="Adresă" />
                    <input className={`${inputClass} col-span-4 sm:col-span-2`} value={c.suprafata} onChange={(e) => updateComparable(idx, { suprafata: e.target.value })} placeholder="mp" inputMode="numeric" />
                    <input className={`${inputClass} col-span-4 sm:col-span-2`} value={c.pret} onChange={(e) => updateComparable(idx, { pret: e.target.value })} placeholder="preț €" inputMode="numeric" />
                    <input className={`${inputClass} col-span-3 sm:col-span-2`} value={c.timp} onChange={(e) => updateComparable(idx, { timp: e.target.value })} placeholder="zile" />
                    <button type="button" onClick={() => removeComparable(idx)} aria-label="Șterge rândul" className="col-span-1 inline-flex items-center justify-center rounded-md border border-[color:var(--color-border)] text-[color:var(--color-muted-foreground)] hover:bg-[color:var(--color-muted)]">
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={addComparable} className="inline-flex w-fit items-center gap-1.5 rounded-md border border-[color:var(--color-border)] px-3 py-1.5 text-sm font-medium hover:bg-[color:var(--color-muted)]">
                  <Plus className="h-4 w-4" aria-hidden="true" /> Adaugă comparabilă
                </button>
              </div>
            </fieldset>

            <fieldset className="rounded-lg border border-[color:var(--color-border)] bg-white p-5">
              <legend className="px-1 text-sm font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                Analiză & plan
              </legend>
              <div className="mt-3 flex flex-col gap-4">
                <label>
                  <span className={labelClass}>Avantaje</span>
                  <textarea className={`${inputClass} min-h-[60px]`} value={avantaje} onChange={(e) => setAvantaje(e.target.value)} placeholder="Etaj intermediar, bloc 2018, balcon..." />
                </label>
                <label>
                  <span className={labelClass}>Dezavantaje</span>
                  <textarea className={`${inputClass} min-h-[60px]`} value={dezavantaje} onChange={(e) => setDezavantaje(e.target.value)} placeholder="Fără parcare, expunere nord..." />
                </label>
                <label>
                  <span className={labelClass}>Recomandare</span>
                  <textarea className={`${inputClass} min-h-[60px]`} value={recomandare} onChange={(e) => setRecomandare(e.target.value)} placeholder="Punem prețul la 99.000 EUR, poze profesionale + tur 3D, promovare TGE premium 14 zile." />
                </label>
                <label>
                  <span className={labelClass}>Comision</span>
                  <input className={inputClass} value={comision} onChange={(e) => setComision(e.target.value)} />
                </label>
                <label>
                  <span className={labelClass}>Următorul pas</span>
                  <textarea className={`${inputClass} min-h-[60px]`} value={pasUrmator} onChange={(e) => setPasUrmator(e.target.value)} />
                </label>
              </div>
            </fieldset>
          </form>

          {/* ── Live preview ───────────────────────────────── */}
          <div className="lg:sticky lg:top-20 lg:self-start">
            <div className="no-print mb-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-md bg-[color:var(--color-primary)] px-3 py-2 text-sm font-medium text-white hover:opacity-90">
                <Printer className="h-4 w-4" aria-hidden="true" /> Printează / Salvează PDF
              </button>
              <button type="button" onClick={copyForWhatsApp} className="inline-flex items-center gap-1.5 rounded-md border border-[color:var(--color-border)] px-3 py-2 text-sm font-medium hover:bg-[color:var(--color-muted)]">
                <Copy className="h-4 w-4" aria-hidden="true" /> Copiază pentru WhatsApp
              </button>
              <a href={mailtoHref()} className="inline-flex items-center gap-1.5 rounded-md border border-[color:var(--color-border)] px-3 py-2 text-sm font-medium hover:bg-[color:var(--color-muted)]">
                <Mail className="h-4 w-4" aria-hidden="true" /> Trimite pe email
              </a>
            </div>

            <article id="raport-print" className="rounded-lg border border-[color:var(--color-border)] bg-white p-8 text-sm leading-relaxed text-[#0a0a0a] shadow-sm">
              <header className="border-b border-[color:var(--color-border)] pb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-primary)]">
                  Transilvania Grand Estate · Adorys
                </p>
                <h2 className="mt-2 text-xl font-bold">Raport de Piață — Evaluare Rapidă</h2>
                <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-[#525252]">
                  <div><dt className="inline font-medium">Adresă: </dt><dd className="inline">{adresa || "—"}</dd></div>
                  <div><dt className="inline font-medium">Data: </dt><dd className="inline">{data || "—"}</dd></div>
                  <div><dt className="inline font-medium">Agent: </dt><dd className="inline">{agentNume || "—"}</dd></div>
                  <div><dt className="inline font-medium">Telefon: </dt><dd className="inline">{agentTelefon || "—"}</dd></div>
                </dl>
              </header>

              <Section n="1" title="Concluzie în 3 rânduri">
                <p>
                  Pe baza tranzacțiilor similare din ultimele 90 de zile, prețul corect de piață este{" "}
                  <strong>{pretMin || pretMax ? `${fmtInt(pretMin)} – ${fmtInt(pretMax)} EUR` : "— EUR"}</strong>.
                </p>
                <p>
                  La prețul de <strong>{pretRecomandat ? `${fmtInt(pretRecomandat)} EUR` : "— EUR"}</strong> se vinde în{" "}
                  <strong>{zileVanzare || "—"} zile</strong>.
                </p>
                {(pretRisc || zileRisc) && (
                  <p>
                    La prețul de <strong>{fmtInt(pretRisc)} EUR</strong> riscăm să stăm{" "}
                    <strong>&gt; {zileRisc} zile</strong> fără oferte serioase.
                  </p>
                )}
              </Section>

              <Section n="2" title="Comparabilele reale">
                {filledComparables.length > 0 ? (
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[color:var(--color-border)] text-left text-[#525252]">
                        <th className="py-1 pr-2 font-medium">Adresă</th>
                        <th className="py-1 pr-2 font-medium">Suprafață</th>
                        <th className="py-1 pr-2 font-medium">Preț</th>
                        <th className="py-1 pr-2 font-medium">Preț/mp</th>
                        <th className="py-1 font-medium">Timp vânzare</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filledComparables.map((c, idx) => (
                        <tr key={idx} className="border-b border-[color:var(--color-border)]/60">
                          <td className="py-1 pr-2">{c.adresa || "—"}</td>
                          <td className="py-1 pr-2">{c.suprafata ? `${c.suprafata} mp` : "—"}</td>
                          <td className="py-1 pr-2">{c.pret ? `${fmtInt(c.pret)} €` : "—"}</td>
                          <td className="py-1 pr-2">{pricePerSqm(c.pret, c.suprafata)}</td>
                          <td className="py-1">{c.timp ? `${c.timp} zile` : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-[#525252]">Adaugă comparabile reale (REBS + ANCPI).</p>
                )}
              </Section>

              <Section n="3" title="Ce face diferența">
                <p><strong>Avantaje:</strong> {avantaje || "—"}</p>
                <p><strong>Dezavantaje:</strong> {dezavantaje || "—"}</p>
                {recomandare && <p><strong>Recomandare:</strong> {recomandare}</p>}
              </Section>

              <Section n="4" title="Comision & următorul pas">
                <p><strong>Comision:</strong> {comision || "—"}</p>
                {pasUrmator && <p className="mt-1">{pasUrmator}</p>}
              </Section>
            </article>
          </div>
        </div>
      </div>
    </>
  );
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h3 className="text-sm font-bold">
        {n}. {title}
      </h3>
      <div className="mt-1 flex flex-col gap-1">{children}</div>
    </section>
  );
}

function buildPlainText(r: {
  adresa: string;
  data: string;
  agentNume: string;
  agentTelefon: string;
  pretMin: string;
  pretMax: string;
  pretRecomandat: string;
  zileVanzare: string;
  pretRisc: string;
  zileRisc: string;
  comparabile: Comparable[];
  avantaje: string;
  dezavantaje: string;
  recomandare: string;
  comision: string;
  pasUrmator: string;
}): string {
  const lines: string[] = [];
  lines.push("RAPORT DE PIAȚĂ — EVALUARE RAPIDĂ");
  lines.push("Transilvania Grand Estate · Adorys");
  lines.push("");
  if (r.adresa) lines.push(`Adresă: ${r.adresa}`);
  if (r.data) lines.push(`Data: ${r.data}`);
  if (r.agentNume) lines.push(`Agent: ${r.agentNume}${r.agentTelefon ? ` · ${r.agentTelefon}` : ""}`);
  lines.push("");
  lines.push("1. CONCLUZIE");
  lines.push(`Preț corect de piață: ${fmtInt(r.pretMin)} – ${fmtInt(r.pretMax)} EUR.`);
  if (r.pretRecomandat) lines.push(`La ${fmtInt(r.pretRecomandat)} EUR se vinde în ${r.zileVanzare} zile.`);
  if (r.pretRisc) lines.push(`La ${fmtInt(r.pretRisc)} EUR riscăm > ${r.zileRisc} zile fără oferte serioase.`);
  if (r.comparabile.length) {
    lines.push("");
    lines.push("2. COMPARABILE");
    for (const c of r.comparabile) {
      lines.push(`- ${c.adresa || "—"} | ${c.suprafata || "—"} mp | ${c.pret ? fmtInt(c.pret) + " €" : "—"} | ${pricePerSqm(c.pret, c.suprafata)} | ${c.timp || "—"} zile`);
    }
  }
  lines.push("");
  lines.push("3. CE FACE DIFERENȚA");
  if (r.avantaje) lines.push(`Avantaje: ${r.avantaje}`);
  if (r.dezavantaje) lines.push(`Dezavantaje: ${r.dezavantaje}`);
  if (r.recomandare) lines.push(`Recomandare: ${r.recomandare}`);
  lines.push("");
  lines.push("4. COMISION & URMĂTORUL PAS");
  if (r.comision) lines.push(`Comision: ${r.comision}`);
  if (r.pasUrmator) lines.push(r.pasUrmator);
  return lines.join("\n");
}
