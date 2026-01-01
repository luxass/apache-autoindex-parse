# apache-autoindex-parse

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]

a simple apache autoindex parser

## 📦 Installation

```bash
npm install apache-autoindex-parse
```

## 🚀 Usage

```ts
import { parse } from "apache-autoindex-parse";

const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 3.2 Final//EN">
<html>
  <head>
    <title>Index of /Public/emoji</title>
  </head>
  <body>
    <div style="padding: 0.5em">
      <!-- this is /file-header.html - it is a HeaderName for the /Public and other dirs -->

      © 1991-Present Unicode, Inc. Unicode and the Unicode Logo are registered trademarks of Unicode, Inc. in the U.S.
      and other countries. All the contents of this directory are governed by the
      <a href="https://www.unicode.org/copyright.html">Terms of Use</a>.
    </div>

    <hr />
    <table>
      <tr>
        <th valign="top"><img src="/icons/blank.gif" alt="[ICO]" /></th>
        <th><a href="?C=N;O=D;F=2">Name</a></th>
        <th><a href="?C=M;O=A;F=2">Last modified</a></th>
        <th><a href="?C=S;O=A;F=2">Size</a></th>
        <th><a href="?C=D;O=A;F=2">Description</a></th>
      </tr>
      <tr>
        <th colspan="5"><hr /></th>
      </tr>
      <tr>
        <td valign="top"><img src="/icons/back.gif" alt="[PARENTDIR]" /></td>
        <td><a href="/Public/">Parent Directory</a></td>
        <td>&nbsp;</td>
        <td align="right">-</td>
        <td>&nbsp;</td>
      </tr>
      <tr>
        <td valign="top"><img src="/icons/folder.gif" alt="[DIR]" /></td>
        <td><a href="1.0/">1.0/</a></td>
        <td align="right">2015-05-26 18:40</td>
        <td align="right">-</td>
        <td>&nbsp;</td>
      </tr>
      <tr>
        <td valign="top"><img src="/icons/text.gif" alt="[TXT]" /></td>
        <td><a href="ReadMe.txt">ReadMe.txt</a></td>
        <td align="right">2025-02-19 16:36</td>
        <td align="right">588</td>
        <td>&nbsp;</td>
      </tr>
      <tr>
        <th colspan="5"><hr /></th>
      </tr>
    </table>
  </body>
</html>`;

// Format can be either "F0", "F1" or "F2"
const format = "F2";

// If you leave the format empty, it will try and auto-infer it.
// If it can't infer it, it will default to "F0"
const entries = parse(html, format);

console.log(entries);
// [
//   {
//     type: 'directory',
//     name: '1.0',
//     path: '1.0',
//     lastModified: 1432658400000
//   },
//   {
//     type: 'file',
//     name: 'ReadMe.txt',
//     path: 'ReadMe.txt',
//     lastModified: 1739979360000
//   }
// ]

// You can also use the options object to customize the output
const entriesWithBasePath = parse(html, {
  format: "F2",
  basePath: "/cdn/unicode/public"
});

console.log(entriesWithBasePath);
// [
//   {
//     type: 'directory',
//     name: '1.0',
//     path: '/cdn/unicode/public/1.0',
//     lastModified: 1432658400000
//   },
//   {
//     type: 'file',
//     name: 'ReadMe.txt',
//     path: '/cdn/unicode/public/ReadMe.txt',
//     lastModified: 1739979360000
//   }
// ]
```

> [!NOTE]
> If you want to traverse an entire apache, you can utilize the `traverse` function which is being exported from `apache-autoindex-parse/traverse`.

### Customizing Paths

You can customize the output paths by providing a `basePath` option. This is useful when you want to map the parsed entries to a different location:

```ts
import { parse } from "apache-autoindex-parse";

const html = await fetch("https://www.unicode.org/Public/emoji/").then(res => res.text());

// Prepend a base path to all entries
const entries = parse(html, {
  basePath: "/cdn/unicode/emoji"
});

// All paths will now start with /cdn/unicode/emoji/
console.log(entries[0].path); // e.g., "/cdn/unicode/emoji/1.0"
```

The `basePath` option is also available in the `traverse` function:

```ts
import { traverse } from "apache-autoindex-parse/traverse";

const result = await traverse("https://www.unicode.org/Public/emoji/", {
  basePath: "/cdn/unicode",
  onFile: (file) => {
    console.log(file.path); // e.g., "/cdn/unicode/1.0/ReadMe.txt"
  }
});
```

## 📄 License

Published under [MIT License](./LICENSE).

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/apache-autoindex-parse?style=flat&colorA=18181B&colorB=4169E1
[npm-version-href]: https://npmjs.com/package/apache-autoindex-parse
[npm-downloads-src]: https://img.shields.io/npm/dm/apache-autoindex-parse?style=flat&colorA=18181B&colorB=4169E1
[npm-downloads-href]: https://npmjs.com/package/apache-autoindex-parse
