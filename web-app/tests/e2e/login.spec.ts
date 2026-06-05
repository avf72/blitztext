import { test, expect } from "@playwright/test";

// Smoke: Ohne Login wird jede geschuetzte Seite auf /login umgeleitet.
test("leitet ohne Login auf /login um", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Blitztext" })).toBeVisible();
});

test("Login-Formular zeigt E-Mail und Passwort", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByLabel("E-Mail")).toBeVisible();
  await expect(page.getByLabel("Passwort")).toBeVisible();
  await expect(page.getByRole("button", { name: "Einloggen" })).toBeVisible();
});

test("Wechsel zwischen Login und Registrierung", async ({ page }) => {
  await page.goto("/login");
  await page.getByText("Noch kein Konto? Registrieren").click();
  await expect(page.getByRole("button", { name: "Konto erstellen" })).toBeVisible();
});
