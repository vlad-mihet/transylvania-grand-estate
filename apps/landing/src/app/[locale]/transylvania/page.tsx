import { getTranslations } from "next-intl/server";
import { fetchApi } from "@tge/api-client";
import { mapApiProperties } from "@tge/api-client";
import type { City, Developer, Testimonial, ApiProperty } from "@tge/types";
import { CinematicHero } from "@/components/sections/cinematic-hero";
import { NarrativeIntro } from "@/components/sections/narrative-intro";
import { TransylvaniaStory } from "@/components/sections/transylvania-story";

import { CuratedCollection } from "@/components/sections/curated-collection";
import { DestinationsMosaic } from "@/components/sections/destinations-mosaic";
import { PartnerLogos } from "@/components/sections/partner-logos";
import { TestimonialSingle } from "@/components/sections/testimonial-single";
import { BrandEpilogue } from "@/components/sections/brand-epilogue";
import { IconicLandmarks } from "@/components/sections/iconic-landmarks";
import { ClosingInvitation } from "@/components/sections/closing-invitation";

export default async function TransylvaniaPage() {
  const t = await getTranslations("TransylvaniaPage");

  const [propertiesRaw, cities, developers, testimonials] = await Promise.all([
    fetchApi<ApiProperty[]>("/properties?featured=true&limit=6"),
    fetchApi<City[]>("/cities"),
    fetchApi<Developer[]>("/developers?featured=true"),
    fetchApi<Testimonial[]>("/testimonials"),
  ]);
  const featuredProperties = mapApiProperties(propertiesRaw);

  const landmarkPairs = [
    {
      id: "strongholds",
      romanNumeral: "I",
      themeTitle: t("landmarks.pairs.strongholds.theme"),
      primary: {
        name: t("landmarks.pairs.strongholds.primary.name"),
        tagline: t("landmarks.pairs.strongholds.primary.tagline"),
        location: t("landmarks.pairs.strongholds.primary.location"),
        image: "/images/castles/corvin-castle.jpg",
      },
      secondary: {
        name: t("landmarks.pairs.strongholds.secondary.name"),
        tagline: t("landmarks.pairs.strongholds.secondary.tagline"),
        location: t("landmarks.pairs.strongholds.secondary.location"),
        image: "/images/castles/bran-trees.jpg",
      },
    },
    {
      id: "crowns",
      romanNumeral: "II",
      themeTitle: t("landmarks.pairs.crowns.theme"),
      primary: {
        name: t("landmarks.pairs.crowns.primary.name"),
        tagline: t("landmarks.pairs.crowns.primary.tagline"),
        location: t("landmarks.pairs.crowns.primary.location"),
        image: "/images/castles/peles-castle.jpg",
      },
      secondary: {
        name: t("landmarks.pairs.crowns.secondary.name"),
        tagline: t("landmarks.pairs.crowns.secondary.tagline"),
        location: t("landmarks.pairs.crowns.secondary.location"),
        image: "/images/castles/peles-park.jpg",
      },
    },
    {
      id: "timecapsules",
      romanNumeral: "III",
      themeTitle: t("landmarks.pairs.timecapsules.theme"),
      primary: {
        name: t("landmarks.pairs.timecapsules.primary.name"),
        tagline: t("landmarks.pairs.timecapsules.primary.tagline"),
        location: t("landmarks.pairs.timecapsules.primary.location"),
        image: "/images/towns/sighisoara.jpg",
        unescoSite: true,
      },
      secondary: {
        name: t("landmarks.pairs.timecapsules.secondary.name"),
        tagline: t("landmarks.pairs.timecapsules.secondary.tagline"),
        location: t("landmarks.pairs.timecapsules.secondary.location"),
        image: "/images/towns/sibiu-church.jpg",
        unescoSite: true,
      },
    },
    {
      id: "wonders",
      romanNumeral: "IV",
      themeTitle: t("landmarks.pairs.wonders.theme"),
      primary: {
        name: t("landmarks.pairs.wonders.primary.name"),
        tagline: t("landmarks.pairs.wonders.primary.tagline"),
        location: t("landmarks.pairs.wonders.primary.location"),
        image: "/images/nature/salt-cave.jpg",
      },
      secondary: {
        name: t("landmarks.pairs.wonders.secondary.name"),
        tagline: t("landmarks.pairs.wonders.secondary.tagline"),
        location: t("landmarks.pairs.wonders.secondary.location"),
        image: "/images/nature/cave-entrance.jpg",
      },
    },
  ];

  const storyChapters = [
    {
      image: "/images/nature/carpathian-mountains.jpg",
      title: t("story.chapters.nature.title"),
      body: t("story.chapters.nature.body"),
    },
    {
      image: "/images/towns/brasov.jpg",
      title: t("story.chapters.heritage.title"),
      body: t("story.chapters.heritage.body"),
    },
    {
      image: "/images/towns/city-buildings.jpg",
      title: t("story.chapters.market.title"),
      body: t("story.chapters.market.body"),
    },
    {
      image: "/images/interiors/golden-vineyard.jpg",
      title: t("story.chapters.lifestyle.title"),
      body: t("story.chapters.lifestyle.body"),
    },
  ];

  return (
    <>
      {/* ACT I — THE SUMMONS */}
      <CinematicHero
        videoSrc="/videos/hero.mp4"
        posterImage="/images/hero/transylvania-hero.jpg"
        headline={t("hero.headline")}
        brandLine={t("hero.brandLine")}
      />
      <NarrativeIntro
        label={t("narrative.label")}
        manifesto={t("narrative.manifesto")}
        teaser={t("narrative.teaser")}
      />

      {/* ACT II — THE WORLD */}
      <TransylvaniaStory chapters={storyChapters} />

      <IconicLandmarks pairs={landmarkPairs} />

      {/* ACT III — THE COLLECTION */}
      <CuratedCollection properties={featuredProperties} />
      <DestinationsMosaic cities={cities} />

      {/* ACT IV — THE TRUST */}
      <PartnerLogos developers={developers} />
      <TestimonialSingle testimonials={testimonials} />

      {/* ACT V — THE CLOSE */}
      <BrandEpilogue />
      <ClosingInvitation />
    </>
  );
}
