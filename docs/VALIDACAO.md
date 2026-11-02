# Validação da entrega

Data da validação: 2 de novembro de 2026

## Verificações executadas

| Verificação | Resultado |
|---|---|
| Login com JWT e conta administrativa | Aprovado |
| Bloqueio de endpoint sem token | Aprovado |
| CRUD de veículo via API | Aprovado |
| Dashboard e indicadores | Aprovado |
| Otimização de três paradas | Aprovado |
| Simulação com persistência no histórico | Aprovado |
| Esquema PostgreSQL com identificadores em português | Aprovado por análise e validação de sintaxe |
| Camada de persistência PostgreSQL parametrizada | Aprovado |
| Trigger de histórico de status | Aprovado |
| Testes automatizados | 14 de 14 aprovados |
| Verificação de sintaxe | Aprovado |
| Auditoria de dependências de produção | 0 vulnerabilidades conhecidas |
| Inspeção visual desktop | Aprovado |
| Inspeção visual mobile em 390 × 844 | Aprovado |

## Navegadores e responsividade

A interface foi inspecionada em viewport desktop e celular. O menu lateral se transforma em gaveta móvel; KPIs, formulários, mapas, tabelas e painéis reorganizam-se nos breakpoints de tablet e celular.

## Banco de dados

O esquema contém sete tabelas com nomes e colunas em português, chaves estrangeiras, índices, restrições de domínio, dados iniciais e gravação automática do histórico de status. A execução local completa pode ser feita pelo Docker Compose. Neste ambiente de desenvolvimento, sem Docker ou servidor PostgreSQL instalados, a integração foi validada por análise automatizada do código, carregamento do driver e testes da camada de aplicação em memória; a implantação no Render deve concluir a prova integrada em banco real.
