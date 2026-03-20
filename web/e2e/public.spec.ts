import { test, expect } from "@playwright/test";

test.describe("Fluxo Portfólio: Contato, Log Completo e Projetos", () => {
  test("deve executar o fluxo sem flakiness", async ({ page }) => {
    // Espelhando o timeout estendido do seu Exemplo 2
    test.setTimeout(120000);

    // 1. Acesso à Home
    await page.goto("http://localhost:3000/");

    const inputName = page.getByRole("textbox", { name: /const name/i });
    await expect(inputName).toBeVisible();

    // 2. Preenchimento do Formulário
    await inputName.fill("josival");

    const inputEmail = page.getByRole("textbox", { name: /const email/i });
    await expect(inputEmail).toBeVisible();
    await inputEmail.fill("josival344@gmail.com");

    const inputSubject = page.getByRole("textbox", { name: /const subject/i });
    await expect(inputSubject).toBeVisible();
    await inputSubject.fill("Um sistema inovador");

    const inputMessage = page.getByRole("textbox", { name: /const message/i });
    await expect(inputMessage).toBeVisible();
    await inputMessage.fill("quero q faça um sistema pra mim");

    // 3. Envio do Formulário
    const btnSend = page.getByRole("button", { name: "$ SEND_PAYLOAD" });
    await expect(btnSend).toBeVisible();
    await btnSend.click();

    // 4. Validação do Sistema e Acesso ao Log
    const headerSystem = page
      .locator("header")
      .filter({ hasText: /~\/system\//i })
      .first();
    await expect(headerSystem).toBeVisible({ timeout: 15000 });

    const linkLogCompleto = page.getByRole("link", {
      name: "Log Completo",
      exact: true,
    });
    await expect(linkLogCompleto).toBeVisible();
    await linkLogCompleto.click();

    // 5. Acesso ao Projeto (QualCel AI) - CORRIGIDO AQUI
    // Usando .first() do Exemplo 1 para matar o "strict mode violation"
    const linkQualCel = page
      .getByRole("link", { name: /QualCel AI - Recomendador/i })
      .first();
    await expect(linkQualCel).toBeVisible();
    await linkQualCel.click();

    // 6. Validação do Projeto
    await expect(
      page.locator("div").filter({ hasText: "Módulo de Destaque" }).first(),
    ).toBeVisible({ timeout: 15000 });

    // 7. Retorno para a Visão Geral
    const linkVisaoGeral = page.getByRole("link", {
      name: "Visão Geral",
      exact: true,
    });
    await expect(linkVisaoGeral).toBeVisible();
    await linkVisaoGeral.click();

    // 8. Validação Final (Retorno à Home)
    await expect(
      page
        .locator("div")
        .filter({ hasText: "Disponível para Estágio" })
        .first(),
    ).toBeVisible({ timeout: 15000 });
  });
});
