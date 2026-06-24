// Mock for metascraper - simulate basic metadata extraction from HTML
export default jest.fn(() => {
  return jest.fn(async ({ html }: { html: string }) => {
    // Extract Open Graph tags from HTML
    const titleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
    const descMatch = html.match(
      /<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i
    );
    const imageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
    const dateMatch = html.match(
      /<meta\s+property=["'](?:article:published_time|og:updated_time)["']\s+content=["']([^"']+)["']/i
    );

    return {
      title: titleMatch ? titleMatch[1] : undefined,
      description: descMatch ? descMatch[1] : undefined,
      image: imageMatch ? imageMatch[1] : undefined,
      date: dateMatch ? dateMatch[1] : undefined,
    };
  });
});
