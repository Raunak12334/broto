import type { Stagehand } from "@browserbasehq/stagehand";

export async function openUrl({ stagehand, url }: { stagehand: Stagehand; url: string }) {
  const [page] = await stagehand.browser.context.pages();
  const targetPage = page ?? (await stagehand.browser.context.newPage());

  await targetPage.goto(url, { waitUntil: "load", timeout: 30_000 });

  return {
    url: await targetPage.url(),
    title: await targetPage.title(),
  };
}