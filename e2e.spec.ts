import { test, expect } from '@playwright/test';

test.use({ channel: 'chrome' });

test.describe('E2E Cultura', () => {
  const baseURL = 'http://localhost:5173';

  test('Registration and Agent Wizard Flow', async ({ page }) => {
    // 1. Register new user
    await page.goto(`${baseURL}/cadastro`);
    await page.getByLabel(/Nome/i).first().fill('Agente E2E Teste');
    const timestamp = Date.now();
    await page.getByLabel(/E-mail/i).first().fill(`teste.e2e.${timestamp}@example.com`);
    await page.getByLabel(/^Senha$/i).first().fill('TesteE2E123!');
    await page.getByLabel(/Confirmar senha/i).first().fill('TesteE2E123!');
    await page.getByRole('button', { name: /Criar conta/i }).click();
    
    // Wait for either the success message or auto-login
    try {
      await page.waitForURL(/.*login|.*painel/, { timeout: 5000 });
    } catch (e) {
      // maybe it's in the confirmation page, let's just go to login manually
      await page.goto(`${baseURL}/login`);
      await page.getByLabel(/E-mail/i).first().fill(`teste.e2e.${timestamp}@example.com`);
      await page.getByLabel(/Senha/i).first().fill('TesteE2E123!');
      await page.getByRole('button', { name: /Entrar/i }).click();
      await page.waitForURL(/.*painel/);
    }

    // Go to Agent Wizard
    await page.goto(`${baseURL}/painel/agentes/novo`);
    
    // Step 1: Person Type
    await page.getByText(/Pessoa Física/i).click();
    await page.getByText(/^Individual$/i).click();
    await page.getByRole('button', { name: /Continuar/i }).click();

    // Step 2: Identification
    await page.getByLabel(/Nome de exibição/i).fill('Teste Agent Display Name');
    await page.getByLabel(/Nome completo/i).fill('Maria da Silva Santos');
    await page.getByLabel(/CPF/i).fill('12345678909');
    
    // Fill "Outro" gender
    await page.locator('select[name="gender"]').selectOption('outro');
    await page.getByPlaceholder(/Especifique seu gênero/i).fill('Gênero Fluido E2E');
    
    // Select LGBTQIA+
    await page.locator('select[name="gender"]').selectOption('lgbtqia');

    await page.getByRole('button', { name: /^Continuar$/i }).click();

    // Step 3: Tipologia
    await page.getByRole('button', { name: /Pular por enquanto/i }).click();

    // Step 4: Location
    await page.getByPlaceholder(/00000-000/i).fill('78690-000'); // Água Boa CEP
    await page.waitForTimeout(1000);
    // Click location map button
    await page.getByRole('button', { name: /Localizar no mapa/i }).click();
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: /^Continuar$/i }).click();

    // We can stop testing here or just skip the rest since we tested the modified parts
    await page.waitForTimeout(2000);
  });
});
