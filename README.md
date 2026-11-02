# UrbanLink Flow

Plataforma web de gestão e simulação de logística urbana desenvolvida para a avaliação final do curso de Desenvolvimento de Sistemas do SENAI. A solução reúne interface responsiva, API REST, autenticação por perfis, mapas, roteamento, indicadores e persistência em PostgreSQL.

## Funcionalidades

- Página institucional responsiva baseada na identidade visual UrbanLink.
- Autenticação JWT e autorização por perfis.
- Gestão de entregas, frota, rotas, simulações e usuários.
- Geração automática do código da entrega.
- Consulta de CEP e preenchimento automático de endereço.
- Mapa interativo e cálculo de rota pelas vias urbanas.
- Simulação de trânsito, demanda e capacidade da frota.
- Indicadores de operação, nível de serviço e emissões evitadas.
- Notificações operacionais e exportação CSV.
- API documentada com Swagger.
- Banco PostgreSQL normalizado, com nomes em português, chaves estrangeiras, índices e gatilhos de auditoria.

## Tecnologias

- Node.js 20 e Express
- JavaScript, HTML e CSS
- PostgreSQL 17
- Leaflet e Chart.js
- JWT, bcrypt, Zod e Helmet
- Node Test Runner e Supertest
- Docker Compose e Render Blueprint

## Execução rápida para apresentação

O modo em memória não exige instalação de banco:

```bash
npm install
cp .env.example .env
npm start
```

Acesse `http://localhost:3000`.

## Execução completa com PostgreSQL

Com Docker instalado:

```bash
docker compose up --build
```

Sem Docker, crie um banco PostgreSQL, copie `.env.example` para `.env` e configure:

```env
DB_DRIVER=postgresql
URL_BANCO=postgresql://usuario:senha@localhost:5432/urbanlink_flow
BANCO_SSL=false
DB_AUTO_MIGRATE=true
```

Depois execute `npm run migrate`, `npm run seed` e `npm start`.

## Contas de demonstração

| Perfil | E-mail | Senha | Permissões principais |
|---|---|---|---|
| Administrador | `admin@urbanlink.com` | `Admin@123` | Acesso total e gestão de usuários |
| Gestor | `gestor@urbanlink.com` | `Gestor@123` | Entregas, frota, rotas e simulações |
| Operador | `operador@urbanlink.com` | `Operador@123` | Entregas e cálculo de rotas |
| Visualização | `visualizacao@urbanlink.com` | `Visualizador@123` | Somente consulta |

Troque as credenciais e o segredo JWT antes de uma publicação permanente.

## Banco de dados em português

O esquema físico utiliza as tabelas `usuarios`, `veiculos`, `entregas`, `rotas`, `paradas_rota`, `simulacoes` e `historico_status_entrega`. Colunas, índices, funções e gatilhos também seguem nomenclatura em português e o padrão `snake_case`.

O repositório PostgreSQL traduz os nomes físicos para o contrato interno da aplicação. Essa separação mantém a interface existente estável e impede que detalhes do banco vazem para as telas.

## Publicação gratuita no Render

O arquivo `render.yaml` provisiona um serviço web Node.js gratuito, um PostgreSQL gratuito de 1 GB, segredo JWT, conexão com o banco e verificação de saúde. Depois de enviar o repositório ao GitHub, abra `https://dashboard.render.com/blueprint/new`, selecione o repositório e aplique o Blueprint.

O banco gratuito do Render expira após 30 dias. O serviço gratuito pode hibernar após 15 minutos sem acesso e levar aproximadamente um minuto para despertar.

## Testes e verificação

```bash
npm run check
npm test
npm audit --omit=dev
```

## Estrutura do projeto

```text
database/     esquema físico e dados de demonstração
docs/         requisitos, arquitetura, modelagem, implantação e validação
public/       página institucional e plataforma web
scripts/      migração e carga inicial do banco
src/          API, regras de negócio, segurança e repositórios
test/         testes automatizados
render.yaml   infraestrutura gratuita no Render
```

## Documentação

- `docs/REQUISITOS.md` — requisitos e critérios de aceite.
- `docs/ARQUITETURA.md` — componentes e decisões técnicas.
- `docs/MODELAGEM.md` — modelos conceitual, lógico e físico.
- `docs/MANUAL_USUARIO.md` — uso da plataforma por perfil.
- `docs/IMPLANTACAO.md` — execução local e publicação no Render.
- `docs/VALIDACAO.md` — evidências de testes e qualidade.
- `/api/docs` — documentação interativa da API.
