import type { JsonLdSchema } from "@/lib/jsonld";

interface JsonLdProps {
  schema: JsonLdSchema | JsonLdSchema[];
}

export function JsonLd({ schema }: JsonLdProps) {
  const payload = Array.isArray(schema)
    ? { "@context": "https://schema.org", "@graph": schema }
    : schema;
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
