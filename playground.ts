import { parse } from "./src";

async function main() {
  const url = "https://unicode.org/Public";

  const response = await fetch(url, {
    headers: {
      "User-Agent": "github.com/luxass/apache-autoindex-parse",
    },
  });
  if (!response.ok) {
    console.error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    return;
  }

  const html = await response.text();
  const entries = parse(html);

  console.log(`Parsed ${entries.length} entries from ${url}`);
  console.log(JSON.stringify(entries, null, 2));
}

main().catch((error) => {
  console.error("Unexpected error while running playground:", error);
  // eslint-disable-next-line node/prefer-global/process
  process.exit(1);
});
