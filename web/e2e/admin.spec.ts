import { test, expect } from "@playwright/test";

test.describe("Fluxo Admin: Login, Navegação no Dashboard e Logout", () => {
  test("deve executar o fluxo sem flakiness", async ({ page }) => {
    // Espelhando o timeout do seu Exemplo 2
    test.setTimeout(120000);

    // 1. Acesso e navegação para Login
    await page.goto("http://localhost:3000/");

    const linkLogin = page.getByRole("link", {
      name: "SYS.LOGIN",
      exact: true,
    });
    await expect(linkLogin).toBeVisible();
    await linkLogin.click();

    // Substituído o texto concatenado e .nth(1) pelo padrão .first()
    await expect(
      page.locator("div").filter({ hasText: "Acesso" }).first(),
    ).toBeVisible({ timeout: 15000 });

    // 2. Preenchimento do Login (sem cliques inúteis)
    const inputEmail = page.getByRole("textbox", {
      name: "E-mail",
      exact: true,
    });
    await expect(inputEmail).toBeVisible();
    await inputEmail.fill("josivaladm@gmail.com");

    // Ignorando o botão de mostrar senha com ID dinâmico e indo direto no input
    const inputSenha = page.getByPlaceholder("••••••••").first();
    await expect(inputSenha).toBeVisible();
    await inputSenha.fill("@Js92434212");

    const btnConfirmar = page.getByRole("button", {
      name: "Confirmar Identidade",
    });
    await expect(btnConfirmar).toBeVisible();
    await btnConfirmar.click();

    // 3. Validação do Dashboard (Main)
    await expect(page.getByRole("main")).toBeVisible({ timeout: 15000 });

    // 4. Navegação: Projetos
    const linkProjetos = page.getByRole("link", {
      name: "Projetos",
      exact: true,
    });
    await expect(linkProjetos).toBeVisible();
    await linkProjetos.click();

    // Trocado o .nth(3) frágil pelo .first() com texto limpo
    await expect(
      page.locator("div").filter({ hasText: "Repositório de" }).first(),
    ).toBeVisible({ timeout: 15000 });

    // 5. Navegação: Mensagens
    const linkMensagens = page.getByRole("link", {
      name: "Mensagens",
      exact: true,
    });
    await expect(linkMensagens).toBeVisible();
    await linkMensagens.click();

    await expect(
      page.locator("div").filter({ hasText: "Caixa de Entrada" }).first(),
    ).toBeVisible({ timeout: 15000 });

    // 6. Navegação: Usuários
    const linkUsuarios = page.getByRole("link", {
      name: "Usuários",
      exact: true,
    });
    await expect(linkUsuarios).toBeVisible();
    await linkUsuarios.click();

    await expect(
      page.locator("div").filter({ hasText: "Controle de Acesso" }).first(),
    ).toBeVisible({ timeout: 15000 });

    // 7. Menu do Admin e Logout
    // O gravador capturou 5 cliques malucos aqui. Vamos fazer como no seu Exemplo 1: um clique limpo e esperar o menu!
    const btnAdminMenu = page
      .getByRole("button", { name: /AS Admin Root/i })
      .first();
    await expect(btnAdminMenu).toBeVisible();
    await btnAdminMenu.click();

    const btnSair = page.getByRole("menuitem", { name: "Encerrar Sessão" });
    await expect(btnSair).toBeVisible();
    await btnSair.click();

    // 8. Validação do Logout e Fim do Teste
    // Removido o clique acidental no final do seu script original que tentava clicar na tela de login vazia
    await expect(
      page.locator("div").filter({ hasText: "Acesso" }).first(),
    ).toBeVisible({ timeout: 15000 });
  });
});
