<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# ReactFlow — don't trust training data

This project uses ReactFlow (React Flow / `@xyflow/react`) for the canvas. Its
APIs, components, hooks, and props change across versions and may differ from
your training data. Before writing or changing any ReactFlow code, fetch and
consult the official LLM docs index at https://reactflow.dev/llms.txt and follow
the linked pages relevant to what you're building. Do not rely on memory for
component names, props, hook signatures, or usage patterns.

# JSX text escaping

Escape apostrophes and quotes in JSX text content — raw `'` and `"` trip the
`react/no-unescaped-entities` lint rule. Use `&apos;` for apostrophes and
`&quot;` for quotes (e.g. `you&apos;re`, `doesn&apos;t`). This applies only to
literal text between JSX tags, not to string attribute values or JS strings.

# Database types

Derive database types from the Drizzle schema — never hand-write custom or partial
shapes for table rows. Export `typeof table.$inferSelect` (and `$inferInsert` when
needed) from `lib/schema.ts` and import it. When a consumer needs only some
columns, narrow with `Pick<Row, ...>` / `Omit<Row, ...>` rather than redeclaring a
literal type. Don't add an insert type where `db.insert(...).values()` already
enforces the shape.

<!-- TRIGGER.DEV SKILLS START -->

## Trigger.dev agent skills

This project has Trigger.dev agent skills installed in `.agents/skills/`. Before writing or changing Trigger.dev code (background tasks, scheduled tasks, realtime, or chat.agent AI agents), load the most relevant skill: `trigger-authoring-chat-agent`, `trigger-authoring-tasks`, `trigger-chat-agent-advanced`, `trigger-cost-savings`, `trigger-getting-started`, `trigger-realtime-and-frontend`.
<!-- TRIGGER.DEV SKILLS END -->

# Stagehand Project

This is a project that uses Stagehand v4, a browser automation framework with AI-powered `act`, `extract`, and `observe` methods.

The main class can be imported as `Stagehand` from `@browserbasehq/stagehand`.

**Key Classes:**

- `Stagehand`: Main orchestrator class providing `act`, `extract`, and `observe` methods
- `browser.context`: A `BrowserContext` object that manages pages, cookies, and the clipboard
- `page`: Individual page objects accessed via `browser.context.activePage()`, `browser.context.pages()`, or created with `browser.context.newPage()`

There is no `agent` API in v4. Compose `observe`, `act`, and `extract` in your own control flow instead.

## Initialize

```typescript
import { browserbase, localBrowser, Stagehand } from "@browserbasehq/stagehand";

const browser = await localBrowser.launch({ headless: true });
const stagehand = await Stagehand.create({
  browser,
  model: {
    modelName: "openai/gpt-5.6-luna",
    apiKey: process.env.OPENAI_API_KEY,
  },
  logging: { level: "info", format: "pretty" },
});

// Access the browser context and pages
const [page] = await browser.context.pages();
const context = browser.context;

// Create new pages if needed
const page2 = await browser.context.newPage();
```

For Browserbase cloud browsers, pass the Browserbase API key to `browserbase.launch()`:

```typescript
const browser = await browserbase.launch({
  apiKey: process.env.BROWSERBASE_API_KEY,
});
const stagehand = await Stagehand.create({
  browser,
  model: { modelName: "openai/gpt-5.6-luna", apiKey: process.env.OPENAI_API_KEY },
});
```

Stagehand never reads environment variables for you. Always pass keys explicitly.

## Act

Actions are called on the `stagehand` instance (not the page). `act` takes either a string instruction or an `Action` from `observe`. Use atomic, specific instructions:

```typescript
// Act on the current active page
await stagehand.act("click the sign in button");

// Act on a specific page (when you need to target a page that isn't currently active)
await stagehand.act("click the sign in button", { page: page2 });
```

**Important:** Act instructions should be atomic and specific:

- Good: "Click the sign in button" or "Type 'hello' into the search input"
- Bad: "Order me pizza" or "Type in the search bar and hit enter" (multi-step)

Use `variables` for secrets. Values are substituted locally and never sent to the model:

```typescript
await stagehand.act("type %password% into the password field", {
  variables: { password: process.env.USER_PASSWORD },
});
```

### Observe Then Act Pattern (Recommended)

`act` accepts either a string instruction or an `Action` returned by `observe`. Use `observe` to inspect the candidate action, then pass it back to `act` for deterministic replay with no inference:

```typescript
const { data: actions } = await stagehand.observe("Click the sign in button");
const [action] = actions;

if (action?.method === "click") {
  await stagehand.act(action);
}
```

To target a specific page:

```typescript
const { data: actions } = await stagehand.observe("select blue as the favorite color", {
  page: page2,
});
const [action] = actions;

if (action) {
  await stagehand.act(action, { page: page2 });
}
```

## Extract

Extract data from pages using natural language instructions. The `extract` method is called on the `stagehand` instance and always takes both an instruction and a schema.

Every primitive returns `{ data, metadata }`. Your extracted value is on `data`; `metadata` carries the action ID and server-side cache status.

### Basic Extraction (with schema)

```typescript
import { z } from "zod/v4";

const { data } = await stagehand.extract(
  "extract all apartment listings with prices and addresses",
  z.object({
    listings: z.array(
      z.object({
        price: z.string(),
        address: z.string(),
      }),
    ),
  }),
);

console.log(data.listings);
```

### Simple Extraction

A schema is always required, so wrap single values in an object:

```typescript
const { data } = await stagehand.extract(
  "extract the sign in button text",
  z.object({ buttonText: z.string() }),
);

console.log(data.buttonText); // "Sign in"
```

### Targeted Extraction

Scope extraction to a specific element with `locator`, and prune noise with `ignoreLocators`:

```typescript
const { data } = await stagehand.extract(
  "extract the reason why script injection fails",
  z.object({ reason: z.string() }),
  {
    locator: page.locator("#main-content"),
    ignoreLocators: [page.locator("nav"), page.locator(".cookie-banner")],
  },
);
```

### URL Extraction

When extracting links or URLs, use `z.url()`:

```typescript
const { data } = await stagehand.extract(
  "extract all navigation links",
  z.object({
    links: z.array(z.url()),
  }),
);
```

### Extracting from a Specific Page

```typescript
const { data } = await stagehand.extract(
  "extract the placeholder text on the name field",
  z.object({ placeholder: z.string() }),
  { page: page2 },
);
```

### Inspecting Metadata

```typescript
const TitleSchema = z.object({ title: z.string() });

const result = await stagehand.extract("extract the page title", TitleSchema);

console.log(result.data.title);
console.log(result.metadata.actionId); // Action ID for tracing this call
console.log(result.metadata.cache.status); // "HIT", "MISS", or "DISABLED"
```

## Observe

Plan actions before executing them. Candidate actions are returned on `data`:

```typescript
// Get candidate actions on the current active page
const { data: actions } = await stagehand.observe("Click the sign in button");
const [action] = actions;

if (action) {
  console.log(action.selector, action.method, action.arguments);
}
```

Observing on a specific page:

```typescript
const { data: actions } = await stagehand.observe("find the next page button", {
  page: page2,
});
await stagehand.act(actions[0], { page: page2 });
```

## Advanced Features

### Locators

Use `page.locator(selector)` for deterministic, non-AI interactions. Selectors returned by `observe` are XPath strings prefixed with `xpath=`:

```typescript
await page.locator("xpath=/html/body/div[2]/button").click();
await page.locator("#email").fill("user@example.com");
const count = await page.locator("li.result").count();
```

### Multi-Page Workflows

```typescript
const page1 = await browser.context.newPage("https://example.com");

const page2 = await browser.context.newPage("https://example2.com");

// Act/extract/observe operate on the current active page by default
// Pass { page } option to target a specific page
await stagehand.act("click button", { page: page1 });
await stagehand.extract("get title", z.object({ title: z.string() }), { page: page2 });
```

### Caching

Server-side caching requires a Browserbase browser and a Browserbase API key:

```typescript
const browser = await browserbase.launch({
  apiKey: process.env.BROWSERBASE_API_KEY,
});
const stagehand = await Stagehand.create({
  browser,
  cache: true, // or { threshold: 1 }
});
```

## Cleanup

Close Stagehand before closing its browser:

```typescript
try {
  const stagehand = await Stagehand.create({ browser });
  try {
    // ...
  } finally {
    await stagehand.close();
  }
} finally {
  await browser.close();
}
```

## Project Structure Best Practices

- Read configuration from environment variables and pass it explicitly to the `Stagehand` constructor
- Create the browser first, pass it to `Stagehand.create()`, then pass the instance into your automation functions
- Use `async`/`await` consistently; `create`, `act`, `extract`, `observe`, and `close` all return promises
- Keep Zod schemas next to the code that consumes them and reuse `z.infer` for the decoded type
- Wrap every workflow in `try`/`finally` so `close` runs even when a step throws
- Prefer narrow, atomic instructions over one instruction that describes a whole workflow

## Security Notes

- Never hard-code API keys. Read them from `process.env` and pass them explicitly; Stagehand reads no environment variables for you
- Pass secrets through `variables` so they are substituted locally and never sent to the model provider
- Set `logging: { level: "off" }` when handling sensitive data so nothing sensitive reaches your logs
- Avoid broad instructions that may trigger unintended navigation; call `observe` first, then replay the returned `Action`

## Resources/References

- TypeScript SDK: `@browserbasehq/stagehand` on npm
- Stagehand documentation: https://docs.stagehand.dev
- Stagehand Docs MCP (Mintlify): https://docs.stagehand.dev/mcp
- Context7 MCP (Upstash): https://github.com/upstash/context7
- DeepWiki MCP: https://mcp.deepwiki.com/
