import { Helmet } from "react-helmet-async";

const SITE_URL = "https://syllabixng.lovable.app";

interface SeoProps {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
}

/**
 * Per-route head tags. Overrides the static defaults in index.html
 * for JS-executing crawlers (Googlebot). Each public route should set
 * a unique title (<60 chars) and description (<155 chars).
 */
export default function Seo({ title, description, path, noindex }: SeoProps) {
  const url = `${SITE_URL}${path}`;
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {noindex ? <meta name="robots" content="noindex, nofollow" /> : <meta name="robots" content="index, follow" />}
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
    </Helmet>
  );
}