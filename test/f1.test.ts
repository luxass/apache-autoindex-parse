import { readFileSync } from "node:fs";
import { assert, describe, expect, it, vi } from "vitest";
import { inferFormat, parse } from "../src";
import { traverse } from "../src/traverse";
import { createFixture } from "./__utils";

const fixture = createFixture("F1");

// eslint-disable-next-line test/prefer-lowercase-title
describe("F1", () => {
  it("auto-inferred format", () => {
    const html = readFileSync(fixture("unicode-org.html"), "utf-8");

    const format = inferFormat(html);

    expect(format).toBe("F1");
  });

  it("unicode.org's public directory listing", () => {
    const html = readFileSync(fixture("unicode-org.html"), "utf-8");

    const entries = parse(html, "F1");

    expect(entries).toBeDefined();

    const paths = entries.map((entry) => entry.path);

    expect(paths).toStrictEqual([
      "1.1-Update",
      "2.0-Update",
      "2.1-Update",
      "2.1-Update2",
      "2.1-Update3",
      "2.1-Update4",
      "3.0-Update",
      "3.0-Update1",
      "3.1-Update",
      "3.1-Update1",
      "3.2-Update",
      "4.0-Update",
      "4.0-Update1",
      "4.1.0",
      "5.0.0",
      "5.1.0",
      "5.2.0",
      "6.0.0",
      "6.1.0",
      "6.2.0",
      "6.3.0",
      "7.0.0",
      "8.0.0",
      "9.0.0",
      "10.0.0",
      "11.0.0",
      "12.0.0",
      "12.1.0",
      "13.0.0",
      "14.0.0",
      "15.0.0",
      "15.1.0",
      "16.0.0",
      "17.0.0",
      "CTT",
      "MAPPINGS",
      "PROGRAMS",
      "ReadMe.txt",
      "UCA",
      "UCD",
      "UNIDATA",
      "cldr",
      "draft",
      "emoji",
      "idna",
      "math",
      "reconstructed",
      "security",
      "vertical",
      "zipped",
    ]);

    const files = entries.filter((entry) => entry.type === "file");

    expect(files).toHaveLength(1);
    expect(files).toStrictEqual([
      {
        type: "file",
        name: "ReadMe.txt",
        path: "ReadMe.txt",
        lastModified: expect.any(Number),
      },
    ]);
  });

  it("parse directory", () => {
    const html = readFileSync(fixture("directory.html"), "utf-8");

    const entries = parse(html, "F1");

    expect(entries).toBeDefined();

    const paths = entries.map((entry) => entry.path);

    expect(paths).toStrictEqual([
      "file%20with%20spaces.txt",
      "file-with-dashes.html",
      "file_with_underscores.json",
      "level2",
      "simple.txt",
      "%d1%84%d0%b0%d0%b9%d0%bb.txt",
    ]);
  });

  it("parse special files", () => {
    const html = readFileSync(fixture("special-files.html"), "utf-8");

    const entries = parse(html, "F1");

    expect(entries).toBeDefined();

    const paths = entries.map((entry) => entry.path);

    expect(paths).toStrictEqual([
      "ReadMe.txt",
      "UPPERCASE-FILE.XML",
      "file%20with%20spaces.html",
      "file%22with%22double%22quotes.rb",
      "file%23with%23hash.py",
      "file%2520with%2520url%2520encoding.html",
      "file&amp;with&amp;ampersands.php",
      "file'with'quotes.sh",
      "file(with)parentheses.txt",
      "file+with+plus+signs.txt",
      "file,with,commas.csv",
      "file-with-dashes.css",
      "file.with.dots.json",
      "file@with@symbols.md",
      "file%5bwith%5dbrackets.log",
      "file_with_underscores.js",
      "hello",
      "level1",
      "many-files",
      "normal-file.txt",
    ]);
  });

  it("traverse directory structure", async () => {
    const rootHtml = readFileSync(fixture("directory.html"), "utf-8");
    const nestedHtml = readFileSync(fixture("special-files.html"), "utf-8");

    // mock fetch to return our test fixtures
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(rootHtml),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(nestedHtml),
      });

    vi.stubGlobal("fetch", mockFetch);

    const result = await traverse("http://example.com/test/", { format: "F1" });

    expect(result).toBeDefined();
    expect(result).toHaveLength(6);

    // find the level2 directory entry
    const level2Dir = result.find((entry) => entry.name === "level2");
    expect(level2Dir).toBeDefined();

    assert(level2Dir?.type === "directory");
    expect(level2Dir?.type).toBe("directory");
    expect(level2Dir?.children).toBeDefined();
    expect(level2Dir?.children).toHaveLength(20);

    // verify some of the nested entries
    const nestedFile = level2Dir?.children?.find((entry) => entry.name === "ReadMe.txt");
    expect(nestedFile).toBeDefined();
    expect(nestedFile?.type).toBe("file");

    vi.unstubAllGlobals();
  });

  it("traverse with entry paths having leading slash", async () => {
    const rootHtml = readFileSync(fixture("directory.html"), "utf-8");
    const nestedHtml = readFileSync(fixture("special-files.html"), "utf-8");

    // Mock fetch to verify URL construction with leading slash paths
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(rootHtml),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(nestedHtml),
      });

    vi.stubGlobal("fetch", mockFetch);

    // test with root URL that has a path component
    const result = await traverse("http://example.com/public/files", { format: "F1" });

    expect(result).toBeDefined();
    expect(result).toHaveLength(6);

    // verify that the nested directory URL was constructed correctly
    // entry path "level2" should be appended to base URL, not replace its path
    expect(mockFetch).toHaveBeenCalledWith(
      "http://example.com/public/files/level2",
      expect.any(Object),
    );

    vi.unstubAllGlobals();
  });

  it("traverse calls onFile callback for each file", async () => {
    const rootHtml = readFileSync(fixture("directory.html"), "utf-8");
    const nestedHtml = readFileSync(fixture("special-files.html"), "utf-8");

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(rootHtml),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(nestedHtml),
      });

    vi.stubGlobal("fetch", mockFetch);

    const onFile = vi.fn().mockResolvedValue(undefined);

    await traverse("http://example.com/test/", {
      format: "F1",
      onFile,
    });

    expect(onFile).toHaveBeenCalled();

    // verify onFile was called with file entries
    const calls = onFile.mock.calls;
    for (const call of calls) {
      expect(call[0]).toHaveProperty("type", "file");
      expect(call[0]).toHaveProperty("name");
      expect(call[0]).toHaveProperty("path");
    }

    // verify specific files were passed to onFile
    const fileNames = calls.map((call) => call[0].name);
    expect(fileNames).toContain("simple.txt");
    expect(fileNames).toContain("file-with-dashes.html");

    vi.unstubAllGlobals();
  });

  it("traverse calls onDirectory callback for each directory", async () => {
    const rootHtml = readFileSync(fixture("directory.html"), "utf-8");
    const nestedHtml = readFileSync(fixture("special-files.html"), "utf-8");

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(rootHtml),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(nestedHtml),
      });

    vi.stubGlobal("fetch", mockFetch);

    const onDirectory = vi.fn().mockResolvedValue(undefined);

    await traverse("http://example.com/test/", {
      format: "F1",
      onDirectory,
    });

    expect(onDirectory).toHaveBeenCalled();

    // verify onDirectory was called with directory entries
    const calls = onDirectory.mock.calls;
    for (const call of calls) {
      expect(call[0]).toHaveProperty("type", "directory");
      expect(call[0]).toHaveProperty("name");
      expect(call[0]).toHaveProperty("path");
      expect(call[0]).toHaveProperty("children");
    }

    // verify level2 directory was passed to onDirectory
    const dirNames = calls.map((call) => call[0].name);
    expect(dirNames).toContain("level2");

    vi.unstubAllGlobals();
  });

  it("traverse calls both onFile and onDirectory callbacks", async () => {
    const rootHtml = readFileSync(fixture("directory.html"), "utf-8");
    const nestedHtml = readFileSync(fixture("special-files.html"), "utf-8");

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(rootHtml),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(nestedHtml),
      });

    vi.stubGlobal("fetch", mockFetch);

    const onFile = vi.fn().mockResolvedValue(undefined);
    const onDirectory = vi.fn().mockResolvedValue(undefined);

    await traverse("http://example.com/test/", {
      format: "F1",
      onFile,
      onDirectory,
    });

    expect(onFile).toHaveBeenCalled();
    expect(onDirectory).toHaveBeenCalled();

    // verify files and directories were handled separately
    const fileCalls = onFile.mock.calls;
    const dirCalls = onDirectory.mock.calls;

    for (const call of fileCalls) {
      expect(call[0].type).toBe("file");
    }

    for (const call of dirCalls) {
      expect(call[0].type).toBe("directory");
    }

    vi.unstubAllGlobals();
  });

  it("traverse onDirectory receives children array", async () => {
    const rootHtml = readFileSync(fixture("directory.html"), "utf-8");
    const nestedHtml = readFileSync(fixture("special-files.html"), "utf-8");

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(rootHtml),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(nestedHtml),
      });

    vi.stubGlobal("fetch", mockFetch);

    const onDirectory = vi.fn().mockResolvedValue(undefined);

    await traverse("http://example.com/test/", {
      format: "F1",
      onDirectory,
    });

    // find the level2 directory callback
    const level2Call = onDirectory.mock.calls.find((call) => call[0].name === "level2");
    expect(level2Call).toBeDefined();

    const level2Dir = level2Call![0];
    expect(level2Dir.children).toBeDefined();
    expect(level2Dir.children.length).toBeGreaterThan(0);

    vi.unstubAllGlobals();
  });

  it("traverse callbacks are awaited", async () => {
    const rootHtml = readFileSync(fixture("directory.html"), "utf-8");

    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(rootHtml),
    });

    vi.stubGlobal("fetch", mockFetch);

    const callOrder: string[] = [];

    const onFile = vi.fn().mockImplementation(async (file) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      callOrder.push(`file:${file.name}`);
    });

    const onDirectory = vi.fn().mockImplementation(async (dir) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      callOrder.push(`dir:${dir.name}`);
    });

    await traverse("http://example.com/test/", {
      format: "F1",
      onFile,
      onDirectory,
    });

    // verify callbacks were called
    expect(onFile).toHaveBeenCalled();
    expect(onDirectory).toHaveBeenCalled();

    // verify call order was recorded (callbacks were properly awaited)
    expect(callOrder.length).toBeGreaterThan(0);

    vi.unstubAllGlobals();
  });
});
