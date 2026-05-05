"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Calculator } from "lucide-react";
import { Slider, Button, Card, CardContent } from "@tge/ui";
import { Link } from "@/i18n/navigation";
import {
  calculateMortgage,
  formatEur,
  formatPercent,
} from "@/lib/calculator-utils";

interface PropertyLoanCardProps {
  price: number;
}

const DEFAULT_DOWN_PCT = 25;
const DEFAULT_TERM_YEARS = 25;
const DEFAULT_RATE = 6.4;

export function PropertyLoanCard({ price }: PropertyLoanCardProps) {
  const t = useTranslations("PropertyDetail");
  const [downPct, setDownPct] = useState(DEFAULT_DOWN_PCT);
  const [termYears, setTermYears] = useState(DEFAULT_TERM_YEARS);
  const [rate, setRate] = useState(DEFAULT_RATE);

  const loanAmount = useMemo(
    () => price * (1 - downPct / 100),
    [price, downPct],
  );

  const result = useMemo(
    () => calculateMortgage(loanAmount, rate, termYears),
    [loanAmount, rate, termYears],
  );

  const downPaymentAmount = price * (downPct / 100);

  const offerHref = {
    pathname: "/instrumente/calculator-ipotecar" as const,
    query: {
      price: String(Math.round(price)),
      down: String(downPct),
      years: String(termYears),
      rate: String(rate),
    },
  };

  return (
    <section>
      <Card className="border-border">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">
              {t("loanCalc.title")}
            </h2>
          </div>

          <div className="space-y-5">
            <div>
              <div className="flex justify-between mb-2 text-sm">
                <span className="text-muted-foreground">
                  {t("loanCalc.downPayment")}
                </span>
                <span className="font-medium text-foreground">
                  {downPct}% · {formatEur(downPaymentAmount)}
                </span>
              </div>
              <Slider
                min={5}
                max={90}
                step={1}
                value={[downPct]}
                onValueChange={(v) => setDownPct(v[0])}
              />
            </div>

            <div>
              <div className="flex justify-between mb-2 text-sm">
                <span className="text-muted-foreground">
                  {t("loanCalc.term")}
                </span>
                <span className="font-medium text-foreground">
                  {termYears} {t("loanCalc.years")}
                </span>
              </div>
              <Slider
                min={5}
                max={30}
                step={1}
                value={[termYears]}
                onValueChange={(v) => setTermYears(v[0])}
              />
            </div>

            <div>
              <div className="flex justify-between mb-2 text-sm">
                <span className="text-muted-foreground">
                  {t("loanCalc.rate")}
                </span>
                <span className="font-medium text-foreground">
                  {formatPercent(rate)}
                </span>
              </div>
              <Slider
                min={2}
                max={12}
                step={0.1}
                value={[rate]}
                onValueChange={(v) => setRate(v[0])}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                {t("loanCalc.monthlyPayment")}
              </p>
              <p className="text-2xl font-bold text-primary">
                {formatEur(result.monthlyPayment)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                {t("loanCalc.totalInterest")}
              </p>
              <p className="text-base font-semibold text-foreground">
                {formatEur(result.totalInterest)}
              </p>
            </div>
          </div>

          <Link href={offerHref} className="block">
            <Button className="w-full" variant="outline">
              {t("loanCalc.getOffer")}
            </Button>
          </Link>
        </CardContent>
      </Card>
    </section>
  );
}
