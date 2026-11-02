INSERT INTO usuarios (id, nome, email, senha_hash, perfil, ativo) VALUES
(1, 'Ana Martins', 'admin@urbanlink.com', '$2b$10$0nYvrgyNw4RUXQYODEqGyecIccY.tyM8IeZx5GFz8jZUJsz9XgRlm', 'ADMIN', TRUE),
(2, 'Carlos Lima', 'operador@urbanlink.com', '$2b$10$ni3slY4gn1k9I2FUXfZEWuHjM7xIRFr6o/qcjl1J21UZs1TbkkfFm', 'OPERATOR', TRUE),
(3, 'Marina Costa', 'gestor@urbanlink.com', '$2b$10$yRZ.QWbu2fByqTu2SdZWHu8pUbp3khu1gHCqikxPXeI4Qh1fWFQ52', 'MANAGER', TRUE),
(4, 'Rafael Souza', 'visualizacao@urbanlink.com', '$2b$10$zElMM2BSiupf7CZ9Lthqw.iNw.wGVK.rEkHbt3jH87QQzYrNHob1.', 'VIEWER', TRUE)
ON CONFLICT DO NOTHING;
SELECT setval(pg_get_serial_sequence('usuarios','id'), COALESCE((SELECT MAX(id) FROM usuarios), 1));

INSERT INTO veiculos (id, placa, modelo, tipo, capacidade_kg, status, cep, latitude, longitude, nome_condutor) VALUES
(1, 'ULF-2A17', 'Renault Kangoo E-Tech', 'ELETRICO', 650, 'EM_ROTA', '01001-000', -23.5505, -46.6333, 'Carlos Lima'),
(2, 'ULF-8B04', 'Fiat Fiorino', 'UTILITARIO', 620, 'DISPONIVEL', '05409-011', -23.5614, -46.6559, 'Marina Costa'),
(3, 'ULF-0E21', 'Bicicleta Cargo', 'BICICLETA', 80, 'MANUTENCAO', '01046-010', -23.5489, -46.6388, 'Rafael Souza')
ON CONFLICT DO NOTHING;
SELECT setval(pg_get_serial_sequence('veiculos','id'), COALESCE((SELECT MAX(id) FROM veiculos), 1));

INSERT INTO entregas (id, codigo, destinatario, endereco, cep, latitude, longitude, prioridade, status, agendado_para, entregue_em, veiculo_id, observacoes) VALUES
(1, 'ENT-1042', 'Loja Vila Madalena', 'Rua Harmonia, 180', '05435-000', -23.5567, -46.6918, 'ALTA', 'EM_TRANSITO', NOW(), NULL, 1, 'Recebimento pela doca 2'),
(2, 'ENT-1043', 'Mercado Paulista', 'Alameda Santos, 1100', '01418-100', -23.5654, -46.6517, 'MEDIA', 'PENDENTE', NOW(), NULL, 2, ''),
(3, 'ENT-1044', 'Hub Centro', 'Avenida Ipiranga, 333', '01046-010', -23.5434, -46.6395, 'BAIXA', 'ENTREGUE', NOW(), NOW(), 1, 'Entrega confirmada'),
(4, 'ENT-1045', 'Farmácia Pinheiros', 'Rua dos Pinheiros, 924', '05422-001', -23.5668, -46.6822, 'URGENTE', 'ATRASADA', NOW(), NULL, 1, 'Carga prioritária')
ON CONFLICT DO NOTHING;
SELECT setval(pg_get_serial_sequence('entregas','id'), COALESCE((SELECT MAX(id) FROM entregas), 1));

INSERT INTO rotas (id, nome, veiculo_id, status, latitude_origem, longitude_origem, distancia_total_km, minutos_estimados, co2_kg, nivel_servico, iniciado_em) VALUES
(1, 'Rota Centro Expandido', 1, 'ATIVA', -23.5505, -46.6333, 18.7, 64, 3.59, 92, NOW())
ON CONFLICT DO NOTHING;
SELECT setval(pg_get_serial_sequence('rotas','id'), COALESCE((SELECT MAX(id) FROM rotas), 1));

INSERT INTO paradas_rota (id, rota_id, entrega_id, ordem_parada, chegada_planejada, distancia_trecho_km) VALUES
(1, 1, 1, 1, NOW() + INTERVAL '20 minutes', 5.8),
(2, 1, 4, 2, NOW() + INTERVAL '48 minutes', 7.4)
ON CONFLICT DO NOTHING;
SELECT setval(pg_get_serial_sequence('paradas_rota','id'), COALESCE((SELECT MAX(id) FROM paradas_rota), 1));

INSERT INTO simulacoes (id, nome, criado_por, parametros, distancia_km, duracao_minutos, custo_estimado, co2_kg, nivel_servico) VALUES
(1, 'Cenário horário de pico', 1, '{"intensidade_transito":1.35,"veiculos_disponiveis":3,"entregas_previstas":18}'::jsonb, 41.8, 126, 198.40, 7.20, 89)
ON CONFLICT DO NOTHING;
SELECT setval(pg_get_serial_sequence('simulacoes','id'), COALESCE((SELECT MAX(id) FROM simulacoes), 1));
