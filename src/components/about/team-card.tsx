"use client";

import Image from "next/image";
import { useLocale } from "next-intl";
import { TeamMember } from "@/types/team";
import { Locale } from "@/types/property";
import { Linkedin, Mail } from "lucide-react";

interface TeamCardProps {
  member: TeamMember;
}

export function TeamCard({ member }: TeamCardProps) {
  const locale = useLocale() as Locale;

  return (
    <div className="group">
      <div className="relative aspect-square rounded-xl overflow-hidden mb-4">
        <Image
          src={member.image}
          alt={member.name}
          fill
          className="object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <h3 className="font-serif text-lg text-cream">{member.name}</h3>
      <p className="text-copper text-sm mb-2">{member.role[locale]}</p>
      <p className="text-cream-muted text-sm leading-relaxed mb-3">
        {member.bio[locale]}
      </p>
      {member.socialLinks && (
        <div className="flex gap-2">
          {member.socialLinks.linkedin && (
            <a
              href={member.socialLinks.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cream-muted hover:text-copper transition-colors"
            >
              <Linkedin className="h-4 w-4" />
            </a>
          )}
          {member.socialLinks.email && (
            <a
              href={`mailto:${member.socialLinks.email}`}
              className="text-cream-muted hover:text-copper transition-colors"
            >
              <Mail className="h-4 w-4" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
