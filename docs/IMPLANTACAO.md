# Implantação e operação

## Ambiente local rápido

```bash
npm install
cp .env.example .env
npm start
```

Esse modo usa memória e é indicado para testes rápidos ou apresentação sem internet.

## Ambiente local completo

```bash
docker compose up --build
```

O Docker Compose inicia PostgreSQL e aplicação. A migration e a carga de demonstração são executadas automaticamente.

## Publicação no Render

1. Envie o projeto a um repositório GitHub.
2. No Render, escolha New e Blueprint.
3. Conecte o repositório e confirme o arquivo `render.yaml`.
4. Revise o serviço web e o PostgreSQL gratuitos.
5. Aplique o Blueprint e aguarde o estado Live.
6. Teste `/api/health`, o login e um cadastro de entrega.

O serviço gratuito hiberna depois de um período sem acessos. Abra o endereço alguns minutos antes da apresentação. O banco gratuito expira 30 dias após a criação, portanto deve ser criado próximo à data do TCC.

## Variáveis

| Variável | Finalidade |
|---|---|
| `PORT` | porta HTTP fornecida pela hospedagem |
| `NODE_ENV` | modo de execução |
| `JWT_SECRET` | segredo de assinatura dos tokens |
| `JWT_EXPIRES_IN` | validade da sessão |
| `DB_DRIVER` | `memory` ou `postgresql` |
| `URL_BANCO` | conexão PostgreSQL |
| `BANCO_SSL` | habilita SSL para conexão externa |
| `DB_AUTO_MIGRATE` | aplica esquema e dados iniciais ao iniciar |

## Encerramento após a apresentação

Exporte dados relevantes, se houver. O banco gratuito não possui backup gerenciado. Depois do período de apresentação, o banco pode expirar naturalmente ou os recursos podem ser removidos pelo painel do Render.
