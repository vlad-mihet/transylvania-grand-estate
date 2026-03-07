export type TemplateName = "prestige" | "atelier" | "sovereign";

export const developerTemplateMap: Record<string, TemplateName> = {
  "studium-green": "prestige",
  "maurer-imobiliare": "atelier",
  "west-residential": "sovereign",
  "impact-developer": "prestige",
};

export const DEFAULT_TEMPLATE: TemplateName = "prestige";
