# Requisitos e critérios de aceite

## Requisitos funcionais

| ID | Requisito | Evidência no sistema |
|---|---|---|
| RF01 | Autenticar usuários e controlar perfis | Login JWT e perfis ADMIN, MANAGER, OPERATOR e VIEWER |
| RF02 | Gerenciar entregas | CRUD, prioridades, status, pesquisa, filtro e CSV |
| RF03 | Gerenciar frota | CRUD, capacidade, condutor, localização e disponibilidade |
| RF04 | Gerenciar rotas | CRUD de rotas e relacionamento normalizado com paradas |
| RF05 | Otimizar sequência de paradas | Algoritmo de vizinho mais próximo com Haversine |
| RF06 | Simular cenários | Parâmetros de trânsito, frota e demanda com histórico |
| RF07 | Monitorar a operação | Mapa, indicadores, entregas recentes e status ao vivo |
| RF08 | Medir desempenho | SLA, distância, tempo, custo e CO₂ |
| RF09 | Administrar usuários | CRUD restrito ao perfil ADMIN |
| RF10 | Documentar a API | Swagger UI em `/api/docs` |

## Requisitos não funcionais

- Responsividade para desktop, tablet e celular.
- Senhas armazenadas com bcrypt e sessão assinada com JWT.
- Validação de entrada, limitação de tentativas de login e cabeçalhos de segurança.
- SQL parametrizado e esquema PostgreSQL normalizado com nomes em português.
- Disponibilidade de modo de demonstração em memória sem remover a integração PostgreSQL.
- Código versionável, configuração por variáveis de ambiente e execução por Docker Compose.
- Publicação reproduzível por Render Blueprint durante o período da apresentação.
