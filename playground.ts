import { parse } from "./src";
import { traverse } from "./src/traverse";

async function main() {
  const url = "https://unicode.org/Public/17.0.0/ucd/emoji";

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
  const entries = parse(html, {
    basePath: "/17.0.0/ucd/emoji",
  });

  console.log(`Parsed ${entries.length} entries from ${url}`);
  console.log(JSON.stringify(entries, null, 2));

  console.log("\n--- Traversing /17.0.0/ucd ---\n");
  const traverseUrl = "https://unicode.org/Public/17.0.0/ucd";
  const traversedEntries = await traverse(traverseUrl, {
    basePath: "/17.0.0/ucd",
  });

  console.log(`Traversed ${traversedEntries.length} entries from ${traverseUrl}`);
  console.log(JSON.stringify(traversedEntries, null, 2));
}

main().catch((error) => {
  console.error("Unexpected error while running playground:", error);
  // eslint-disable-next-line node/prefer-global/process
  process.exit(1);
});
