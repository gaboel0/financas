# Finanças da Casa

App de finanças pessoais que roda **só no seu computador**: saldo previsto do mês, contas fixas, dívidas, cartões e faturas, gastos por categoria, fluxo de caixa com busca, regras de categoria e metas. Ele puxa os dados dos seus bancos pelo **Open Finance (Pluggy)** ou por arquivos de extrato **OFX/CSV**.

Este projeto vem **vazio**: sem credenciais e sem dados. Na primeira vez que abre, ele mostra dados de **demonstração** para você explorar. Dá para apagar com um clique (veja [Começar do zero](#começar-do-zero)).

Este guia tem quatro partes:

1. [Preparar o computador](#1-preparar-o-computador)
2. [Pegar as credenciais da Pluggy](#2-pegar-as-credenciais-da-pluggy)
3. Escolher como usar:
   - [Versão web (navegador)](#3a-versão-web-navegador)
   - [Versão app/EXE (programa do Windows)](#3b-versão-app--exe-programa-do-windows)
4. [Conectar os bancos dentro do app](#4-conectar-os-bancos-dentro-do-app)

---

## 1. Preparar o computador

Você precisa do **Node.js 24 ou mais novo**. O app usa o SQLite que já vem dentro do Node, então não precisa instalar banco de dados nenhum.

1. Baixe e instale o Node em <https://nodejs.org> (versão 24 ou maior).
2. Abra um terminal (PowerShell) e confira:

   ```bash
   node -v
   ```

   Precisa aparecer `v24` ou maior.

3. Baixe o projeto num lugar **fora do OneDrive**, por exemplo `C:\dev\financas`. O OneDrive trava os arquivos do banco e do build.

   ```bash
   git clone https://github.com/gaboel0/financas.git C:\dev\financas
   cd C:\dev\financas
   ```

   Sem git: no GitHub, clique em **Code → Download ZIP** e extraia em `C:\dev\financas`.

4. Dentro da pasta do projeto, instale as dependências (só uma vez):

   ```bash
   npm install
   ```

> Até aqui o app já funciona com dados de demonstração e importação de extratos. As credenciais da Pluggy só são necessárias para puxar os bancos automaticamente.

---

## 2. Pegar as credenciais da Pluggy

A [Pluggy](https://pluggy.ai) é a empresa autorizada pelo Banco Central que faz a ponte com o Open Finance. Para uso pessoal, você conecta seus bancos pelo **MeuPluggy**, e o app lê de lá.

1. Crie uma conta em <https://dashboard.pluggy.ai>.
2. No dashboard, crie uma **aplicação**. Qualquer nome serve, por exemplo "Minhas finanças".
3. Abra a aplicação e copie:
   - o **Client ID**;
   - o **Client Secret**.
4. Crie também sua conta no **MeuPluggy** (<https://meu.pluggy.ai>) e conecte lá os seus bancos. É lá que você autoriza cada banco no Open Finance, com login no app do próprio banco.

Guarde o Client ID e o Client Secret: eles vão num arquivo `.env.local`. **Nunca** mande esse arquivo para ninguém nem suba para o GitHub (o `.gitignore` já ignora ele).

> **Limite de conexões:** a conta gratuita da Pluggy tem um limite de conexões (bancos) ativas. Se chegar no limite, remova uma conexão em **Conexões** antes de adicionar outra, ou use a [importação de extrato](#importar-extrato-ofxcsv-sem-pluggy) para o banco que sobrar.

---

## 3A. Versão web (navegador)

O app roda como um site local, e você abre no navegador.

### Configurar

1. Na pasta do projeto, copie o arquivo `.env.example` e renomeie a cópia para `.env.local`.
2. Preencha com as suas credenciais:

   ```env
   PLUGGY_CLIENT_ID=cole-aqui-o-client-id
   PLUGGY_CLIENT_SECRET=cole-aqui-o-client-secret
   ```

### Rodar

**Modo desenvolvimento** (recarrega sozinho quando você mexe no código):

```bash
npm run dev
```

Abra <http://localhost:3000>.

**Modo produção** (mais rápido; use se só quer usar o app):

```bash
npm run build
npm start
```

Abra <http://localhost:3000>.

Na versão web, os dados ficam em `data/financas.db`, dentro da pasta do projeto. Para guardar em outro lugar, coloque no `.env.local`:

```env
DATA_DIR=C:\Users\SEU_USUARIO\AppData\Local\financas
```

Para parar o app, aperte `Ctrl + C` no terminal.

---

## 3B. Versão app / EXE (programa do Windows)

Aqui o app abre numa janela própria, sem navegador nem terminal. Existem dois jeitos: o **EXE de verdade (Tauri)** e o **atalho**.

### Onde ficam as credenciais e os dados (vale para os dois)

As duas formas usam a pasta `%APPDATA%\FinancasCasa` (cole isso na barra do Explorer para abrir):

| Arquivo / pasta | Para que serve |
|---|---|
| `.env.local` | suas credenciais da Pluggy (**crie este arquivo**) |
| `data\financas.db` | o banco com todos os seus dados |
| `server.log` | log do servidor, útil se algo der errado |

Crie a pasta `%APPDATA%\FinancasCasa` e, dentro dela, o arquivo `.env.local` com o mesmo conteúdo da versão web:

```env
PLUGGY_CLIENT_ID=cole-aqui-o-client-id
PLUGGY_CLIENT_SECRET=cole-aqui-o-client-secret
```

> Esse é um `.env.local` **diferente** do da pasta do projeto. A versão web lê o da pasta do projeto; o app/EXE lê o de `%APPDATA%\FinancasCasa`.

### Opção 1: EXE com instalador (Tauri)

Gera um instalador `.exe` de verdade. O app fica no Menu Iniciar, com ícone na bandeja do relógio, e sincroniza enquanto estiver aberto.

**Requisitos extras (só para gerar o EXE):**

1. **Rust:** instale pelo <https://rustup.rs> e aceite o padrão.
2. **Visual Studio Build Tools** com a carga de trabalho **"Desenvolvimento para desktop com C++"**: <https://visualstudio.microsoft.com/visual-cpp-build-tools/>.
3. **Controle Inteligente de Aplicativos desligado** (Segurança do Windows → Controle de aplicativos e navegador). Se ele estiver ligado, o Windows bloqueia o build e o EXE, porque o EXE não tem assinatura digital. Se não quiser desligar, use a **Opção 2**.

**Gerar:**

```bash
npm run desktop:build
```

Demora alguns minutos na primeira vez. O instalador sai em:

```
src-tauri\target\release\bundle\nsis\
```

Rode o `...-setup.exe` dessa pasta, abra **Finanças** pelo Menu Iniciar e pronto.

### Opção 2: Atalho no Menu Iniciar (sem EXE)

Funciona mesmo com o Controle Inteligente de Aplicativos ligado. Usa o próprio Node (que é assinado) e abre o app numa janela do Edge em modo aplicativo, sem barra de endereço.

```bash
npm run app:build
npm run app:install
```

Isso cria **"Finanças" no Menu Iniciar**. Para fixar na barra de tarefas, clique com o botão direito no atalho.

Ao abrir o atalho:

1. o servidor local sobe em `http://127.0.0.1:3127`, que só aceita conexões do seu PC;
2. ele sincroniza com os bancos;
3. a janela do app abre;
4. quando você fecha a janela, o servidor é desligado.

Outros comandos:

| Comando | O que faz |
|---|---|
| `npm run app:build` | gera a versão nova depois de mexer no código (rode antes de abrir de novo) |
| `npm run app:stop` | desliga o servidor se ele ficar preso |
| `npm run app:uninstall` | remove o atalho (seus dados continuam em `%APPDATA%\FinancasCasa`) |

---

## 4. Conectar os bancos dentro do app

Com as credenciais configuradas (web ou app), abra o app e:

1. Vá em **Conexões** (menu lateral).
2. Clique em **Conectar banco**.
3. Na janela da Pluggy, procure e escolha **MeuPluggy**.
4. Entre com a sua conta do MeuPluggy e escolha qual banco quer trazer. Cada banco vira uma conexão separada.
5. Repita para os outros bancos.

Na primeira sincronização, o app traz **os últimos 12 meses** de contas, cartões, faturas e transações. Depois disso:

- ele sincroniza sozinho **ao abrir** e **a cada 6 horas** enquanto estiver aberto;
- o botão **Sincronizar tudo** puxa na hora o que a Pluggy já tem;
- se um banco pedir nova autorização, ele aparece como **"Precisa reconectar"** e o botão **Reconectar** resolve;
- em **Conexões → Seu nome** você troca o nome que aparece no app.

> **Atraso dos dados:** quem consulta o banco é a Pluggy, que atualiza as conexões do MeuPluggy algumas vezes por dia. Uma compra feita agora pode levar algumas horas para aparecer, mesmo clicando em Sincronizar. Para forçar, atualize a conexão em <https://meu.pluggy.ai>.

### Importar extrato OFX/CSV (sem Pluggy)

Serve para bancos que você não quer ou não consegue conectar:

1. Baixe o extrato ou a fatura do cartão em **OFX** ou **CSV** no internet banking.
2. No app, vá em **Conexões → Importar extrato ou fatura**.
3. Escolha a conta ou cartão de destino e o arquivo.

Lançamentos repetidos são ignorados, então reimportar o mesmo arquivo não duplica nada. No CSV, a primeira linha precisa ter cabeçalhos como `data`, `descrição` e `valor`.

---

## Começar do zero

O app abre com dados de demonstração e mostra um aviso amarelo no topo enquanto o demo estiver ativo. Para começar com os seus dados:

**Conexões → Dados do app → Limpar dados manuais/demo**

Para apagar **tudo** (inclusive conexões), feche o app e apague o arquivo do banco:

- na versão web: `data\financas.db`;
- no app/EXE: `%APPDATA%\FinancasCasa\data\financas.db`.

Ele é recriado na próxima vez que o app abre.

---

## O que dá para fazer no app

- **Visão geral:** com o botão **Mês / Geral** no topo, todos os cards mostram o mês escolhido ou o histórico inteiro. Os cards são gasto até agora, calendário, transações, gastos por categoria (com as lojas de cada uma), cartões, recorrências, dívidas, empréstimos e moradia.
- **Gasto até agora:** quanto já saiu no mês até hoje, por categoria (onde) e por dia (quando). Clique numa barra, num dia ou num gasto para ver a lista.
- **Calendário:** feriados nacionais calculados sozinhos, mais férias, folgas e eventos que você marcar. Mostra também o vencimento das contas e faturas e os dias das viagens.
- **Viagens:** planejamento de cada viagem com orçamento, custos por categoria (transporte, hospedagem, comida...), o que já foi pago, custo por dia e por pessoa.
- **Empréstimos:** os empréstimos em aberto de todos os bancos, deduzidos do extrato (crédito recebido menos parcelas pagas).
- **Apartamento:** acompanhamento de imóvel na planta (entrada, taxa de obra, financiamento e entrega).
- **Reserva:** metas e projetos com aportes e retiradas.
- **Contas fixas:** contas que se repetem todo mês. Se você preencher o texto que aparece no extrato (ex.: `CLARO`), a conta é marcada como paga sozinha quando a cobrança chega.
- **Dívidas:** coisas avulsas que você deve, com pagamentos parciais.
- **Cartões:** fatura aberta, próximo fechamento e vencimento de cada cartão, limite e parcelamentos. A linha "TOTAL DA FATURA ANTERIOR" que alguns bancos repetem no extrato não conta como gasto.
- **Fluxo de caixa:** todas as transações, com busca por texto ou valor e filtros por conta, tipo, classificação e período.
- **Regras:** a varinha ao lado de uma transação cria uma regra do tipo "tudo que tiver *iFood* vira categoria Delivery".
- **Transferências entre suas contas** (Pix para você mesmo, pagamento de fatura) são detectadas e não contam em dobro.
- **Atualização automática:** o app confere a Pluggy a cada 5 minutos (e quando você abre uma página) e só baixa as transações quando há dado novo.
- **Botão do olho** no topo: esconde todos os valores (`R$ ****`), para mostrar o app para alguém.
- **Tema claro/escuro** e sidebar recolhível.

---

## Problemas comuns

| Problema | Solução |
|---|---|
| `node:sqlite` não encontrado / erro ao abrir o banco | Seu Node é antigo. Instale o Node 24+. |
| Conexões diz "Configure suas credenciais" | O `.env.local` não está no lugar certo (pasta do projeto na versão web; `%APPDATA%\FinancasCasa` no app) ou o app não foi reiniciado. |
| Página sem estilo ou "Cannot find module" no app | Rode `npm run app:stop` e depois `npm run app:build` de novo. |
| Erros `EPERM` / arquivos travados | A pasta está dentro do OneDrive. Mova para fora (ex.: `C:\dev`). |
| `npm run desktop:build` falha com "os error 4551" | O Controle Inteligente de Aplicativos bloqueou. Desligue ou use a **Opção 2 (atalho)**. |
| Porta 3000 ocupada (web) | Feche o outro programa ou rode `npm run dev -- -p 3001`. |

---

## Estrutura do código

```
src/app/(app)/        páginas (Visão geral, Fluxo, Cartões, Contas fixas, Dívidas, Conexões...)
src/app/api/          sincronização, Pluggy, importação, notificações
src/server/           banco (node:sqlite), migrações, cálculos, Pluggy, importadores, ações
src/components/       interface (cards, gráficos, formulários)
scripts/              build e instalação do app (atalho e EXE)
src-tauri/            versão EXE em Rust (Tauri)
```
