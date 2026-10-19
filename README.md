# Irineu

Consultor financeiro pessoal que funciona como uma ligação: você conta seus gastos falando, ele anota, separa o que é fixo, variável e parcelado, e pergunta o que não entendeu.

## Como o projeto está organizado

| Arquivo | O que faz |
|---|---|
| `docs/index.html` | As telas e o visual (CSS). No topo fica a política de segurança (CSP). |
| `docs/app.js` | A lógica (JavaScript). Fica num arquivo separado para a CSP só aceitar script que venha dele. |
| `docs/manifest.webmanifest` | A "carteira de identidade" do app: nome, ícone e cores. É o que faz o Chrome oferecer **Instalar app**. |
| `docs/sw.js` | O *service worker*: guarda uma cópia do app no celular para ele abrir rápido e até sem internet. |
| `docs/icon-*.png`, `docs/icon.svg` | Os ícones da tela inicial. |
| `scripts/segredos.mjs`, `.githooks/pre-commit` | A checagem que barra commit com chave, token ou backup de dados. |

## Onde ficam as coisas

- **Seus dados** (renda, contas, lançamentos) ficam só no seu celular, no armazenamento do Chrome. Use **Ajustes > Baixar backup** de vez em quando: o arquivo sai cifrado com uma senha sua.
- **A chave da API** também fica só no celular e é enviada direto dele para a Anthropic. Para reduzir o risco:
  - a CSP só deixa o app falar com `api.anthropic.com`
  - a chave nunca volta para a tela
  - a chave tem limite de gasto, configurado no console da Anthropic

  Na migração para Next.js, ela sai do celular e passa para o servidor.
- **A inteligência** vem da API do Claude (modelo Haiku, o mais rápido e barato).
- **O microfone e a voz** são os do próprio Chrome: reconhecimento de voz para te ouvir e a voz do Google para falar.

## Segurança

- **CSP:** o app só roda script do próprio `app.js`, só carrega fonte do Google Fonts e só conversa com a API da Anthropic. Qualquer outro endereço é bloqueado pelo navegador.
- **Texto de fora vira texto:** o que vem da voz, da IA ou de um arquivo importado passa por escape antes de entrar na tela. Na importação, números viram números e identificadores estranhos são trocados.
- **Backup com senha:** usa AES-256-GCM, com a chave tirada da senha por PBKDF2-SHA256 (600 mil rodadas). Sem a senha ninguém abre o arquivo, nem você. Backups antigos, sem senha, e o "Copiar meus dados" do Irineu antigo continuam sendo aceitos na importação.
- **Trava ao abrir:** é opcional, em **Ajustes > Trava ao abrir**. Pede um PIN de 4 a 8 números quando o app abre e quando você volta depois de 2 minutos fora. Depois de 5 erros, ela faz esperar. É uma porta na frente do app, não uma cifra: quem tiver o celular destravado e souber mexer no Chrome ainda acha os dados. Se esquecer o PIN, a saída é apagar os dados do celular e importar o backup.
- **Checagem de segredos:** em cada clone novo, rode uma vez:

  ```bash
  git config core.hooksPath .githooks
  ```

  Depois disso, todo commit passa pela checagem. Para conferir o repositório inteiro, rode `node scripts/segredos.mjs --tudo`.

## Como uma mudança chega no seu celular

1. O código é alterado e salvo aqui no GitHub (um *commit*).
2. O GitHub Pages publica a pasta `docs/` sozinho, em alguns minutos.
3. Na próxima vez que você abre o app com internet, ele já pega a versão nova.

## Economia de crédito

- Gasto simples ("42 no mercado no débito do Santander") é lido pelo próprio app, sem IA.
- Perguntas comuns ("quanto posso gastar por dia?") são calculadas pelo app.
- Na ligação, falas seguidas vão juntas numa chamada só, e a IA recebe só um resumo curto do que já foi anotado.
- Responder as dúvidas do Irineu pelos botões não usa IA.
