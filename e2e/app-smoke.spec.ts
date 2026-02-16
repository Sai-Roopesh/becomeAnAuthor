import { expect, test } from "@playwright/test";

test.describe("App smoke flows", () => {
  test("dashboard renders primary actions", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Series" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "New Series" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Open" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Backup Center" }),
    ).toBeVisible();
  });

  test("project route without id shows recovery state", async ({ page }) => {
    await page.goto("/project");

    await expect(
      page.getByRole("heading", { name: "No Project Selected" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Open Project Folder" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Go to Dashboard" }),
    ).toBeVisible();
  });

  test("series route without id shows selection prompt", async ({ page }) => {
    await page.goto("/series");

    await expect(
      page.getByRole("heading", { name: "No Series Selected" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Back to Dashboard" }),
    ).toBeVisible();
  });
});
