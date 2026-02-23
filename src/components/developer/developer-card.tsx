"use client";

import Image from "next/image";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Developer } from "@/types/developer";
import { Locale } from "@/types/property";
import { MapPin, Building2, ExternalLink } from "lucide-react";

interface DeveloperCardProps {
  developer: Developer;
}

export function DeveloperCard({ developer }: DeveloperCardProps) {
  const locale = useLocale() as Locale;

  return (
    <Link href={`/properties?developer=${developer.slug}`}>
      <div className="frosted-glass p-6 h-full hover:border-copper/20 transition-all duration-300 group">
        <div className="relative w-full h-32 rounded-xl overflow-hidden mb-4 bg-white/5">
          <Image
            src={developer.logo}
            alt={developer.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
        <h3 className="font-serif text-xl text-cream mb-2 group-hover:text-copper transition-colors">
          {developer.name}
        </h3>
        <div className="flex items-center gap-4 text-sm text-cream-muted mb-3">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {developer.city}
          </span>
          <span className="flex items-center gap-1">
            <Building2 className="h-3.5 w-3.5" />
            {developer.projectCount} projects
          </span>
        </div>
        <p className="text-cream-muted text-sm leading-relaxed line-clamp-3">
          {developer.shortDescription[locale]}
        </p>
        {developer.website && (
          <div className="mt-4 flex items-center gap-1 text-copper text-sm">
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Visit website</span>
          </div>
        )}
      </div>
    </Link>
  );
}
