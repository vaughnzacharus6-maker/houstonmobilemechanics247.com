import { useEffect } from "react";

type SeoHeadProps = {
  title: string;
  description: string;
  path: string;
  schema?: Record<string, unknown>;
  noIndex?: boolean;
};

function ensureMeta(selector: string, attributes: Record<string, string>) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    document.head.appendChild(element);
  }
  Object.entries(attributes).forEach(([key, value]) => element?.setAttribute(key, value));
  return element;
}

export default function SeoHead({ title, description, path, schema, noIndex = false }: SeoHeadProps) {
  useEffect(() => {
    const previousTitle = document.title;
    const canonicalUrl = `https://houstonmobilemechanics247.com${path}`;
    const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]') ?? document.createElement("link");
    const previousCanonical = canonical.getAttribute("href");
    if (!canonical.parentNode) {
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }

    const metaUpdates = [
      [ensureMeta('meta[name="description"]', { name: "description" }), description],
      [ensureMeta('meta[name="robots"]', { name: "robots" }), noIndex ? "noindex, nofollow" : "index, follow, max-image-preview:large"],
      [ensureMeta('meta[property="og:title"]', { property: "og:title" }), title],
      [ensureMeta('meta[property="og:description"]', { property: "og:description" }), description],
      [ensureMeta('meta[property="og:url"]', { property: "og:url" }), canonicalUrl],
      [ensureMeta('meta[name="twitter:title"]', { name: "twitter:title" }), title],
      [ensureMeta('meta[name="twitter:description"]', { name: "twitter:description" }), description],
    ] as const;
    const previousMeta = metaUpdates.map(([element]) => element.getAttribute("content"));

    document.title = title;
    canonical.href = canonicalUrl;
    metaUpdates.forEach(([element, content]) => element.setAttribute("content", content));

    let schemaElement: HTMLScriptElement | null = null;
    if (schema) {
      schemaElement = document.createElement("script");
      schemaElement.type = "application/ld+json";
      schemaElement.dataset.pageSchema = "true";
      schemaElement.textContent = JSON.stringify(schema);
      document.head.appendChild(schemaElement);
    }

    return () => {
      document.title = previousTitle;
      if (previousCanonical) canonical.href = previousCanonical;
      metaUpdates.forEach(([element], index) => {
        const previous = previousMeta[index];
        if (previous !== null) element.setAttribute("content", previous);
      });
      schemaElement?.remove();
    };
  }, [title, description, path, schema, noIndex]);

  return null;
}
