import { test, expect } from "@playwright/test";

test.describe("Fluxo Completo: Registro Dinâmico, Autenticação e Encerramento", () => {
  test("deve executar o fluxo sem flakiness", async ({ page }) => {
    // Usando o timeout estendido do seu Exemplo 2
    test.setTimeout(120000);

    // O PULO DO GATO: E-mail dinâmico para nunca dar erro de "usuário já existe" no BD
    const emailDinamico = `josival${Date.now()}@gmail.com`;

    // 1. Acesso e navegação para Login
    await page.goto("http://localhost:3000/");
    await page.getByRole("link", { name: "SYS.LOGIN", exact: true }).click();

    // 2. Navegação para a tela de Registro
    const linkSolicitarAcesso = page.getByRole("link", {
      name: "Solicitar Acesso",
      exact: true,
    });
    await expect(linkSolicitarAcesso).toBeVisible();
    await linkSolicitarAcesso.click();

    // Validamos se a tela carregou usando o padrão .first() do seu Exemplo 1
    await expect(
      page
        .locator("div")
        .filter({ hasText: "Alocando novo usuário na infraestrutura" })
        .first(),
    ).toBeVisible();

    // 3. Preenchimento do Registro
    await page
      .getByRole("textbox", { name: "Usuário", exact: true })
      .fill("josival salvador");
    await page
      .getByRole("textbox", { name: "E-mail", exact: true })
      .fill(emailDinamico);

    // AJUSTE CRÍTICO: Trocado para getByPlaceholder para ignorar se a senha está oculta ou não
    const inputSenhaRegistro = page.getByPlaceholder("••••••••").first();
    await expect(inputSenhaRegistro).toBeVisible();
    await inputSenhaRegistro.fill("@Js92434212");

    const btnRegistrar = page.getByRole("button", { name: "Registrar Acesso" });
    await expect(btnRegistrar).toBeVisible();
    await btnRegistrar.click();

    // 4. Redirecionamento e Login
    // Em vez de esperar o botão direto, esperamos a tela de "Acesso" carregar, garantindo o redirecionamento
    await expect(
      page.locator("div").filter({ hasText: "Acesso" }).first(),
    ).toBeVisible({ timeout: 15000 });

    await page
      .getByRole("textbox", { name: "E-mail", exact: true })
      .fill(emailDinamico);

    const inputSenhaLogin = page.getByPlaceholder("••••••••").first();
    await expect(inputSenhaLogin).toBeVisible();
    await inputSenhaLogin.fill("@Js92434212");

    const btnConfirmar = page.getByRole("button", {
      name: "Confirmar Identidade",
    });
    await expect(btnConfirmar).toBeVisible();
    await btnConfirmar.click();

    // 5. Validação de Sessão
    await expect(
      page.locator("div").filter({ hasText: "Sessão Estabelecida" }).first(),
    ).toBeVisible({ timeout: 15000 });

    // 6. Encerramento de Sessão
    const btnEncerrar = page.getByRole("button", { name: /Encerrar Sessão/i });
    await expect(btnEncerrar).toBeVisible();
    await btnEncerrar.click();

    // 7. Validação do Logout voltando para a tela de Acesso
    await expect(
      page.locator("div").filter({ hasText: "Acesso" }).first(),
    ).toBeVisible({ timeout: 15000 });
  });
});
