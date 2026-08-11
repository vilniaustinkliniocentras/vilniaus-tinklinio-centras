import { images, siteConfig } from "@/lib/constants";
import { seoConfig } from "@/lib/seo/config";

export function OrganizationJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: seoConfig.organization.name,
    url: siteConfig.url,
    logo: `${siteConfig.url}${images.logo}`,
    email: seoConfig.organization.email,
    telephone: seoConfig.organization.telephone,
    address: {
      "@type": "PostalAddress",
      name: seoConfig.organization.venue,
      streetAddress: seoConfig.organization.streetAddress,
      addressLocality: seoConfig.organization.addressLocality,
      addressCountry: seoConfig.organization.addressCountry,
    },
    sameAs: [siteConfig.social.facebook.url, siteConfig.social.instagram.url],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
