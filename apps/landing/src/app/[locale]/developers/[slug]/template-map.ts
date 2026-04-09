export type TemplateName = "prestige" | "atelier" | "sovereign";

export const developerTemplateMap: Record<string, TemplateName> = {
  "verdalis-residence": "prestige",
  "carpathia-imobiliare": "atelier",
  "atrium-boutique": "sovereign",
  "dacia-construct": "prestige",
};

export const DEFAULT_TEMPLATE: TemplateName = "prestige";
