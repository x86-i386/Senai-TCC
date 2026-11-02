CREATE TABLE IF NOT EXISTS usuarios (
  id BIGSERIAL PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  perfil VARCHAR(20) NOT NULL DEFAULT 'OPERATOR' CHECK (perfil IN ('ADMIN','MANAGER','OPERATOR','VIEWER')),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS veiculos (
  id BIGSERIAL PRIMARY KEY,
  placa VARCHAR(10) NOT NULL UNIQUE,
  modelo VARCHAR(120) NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('ELETRICO','UTILITARIO','CAMINHAO','MOTO','BICICLETA')),
  capacidade_kg NUMERIC(10,2) NOT NULL CHECK (capacidade_kg > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'DISPONIVEL' CHECK (status IN ('DISPONIVEL','EM_ROTA','MANUTENCAO','INATIVO')),
  cep VARCHAR(9),
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  nome_condutor VARCHAR(120),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_veiculos_status ON veiculos(status);

CREATE TABLE IF NOT EXISTS entregas (
  id BIGSERIAL PRIMARY KEY,
  codigo VARCHAR(30) NOT NULL UNIQUE,
  destinatario VARCHAR(160) NOT NULL,
  endereco VARCHAR(255) NOT NULL,
  cep VARCHAR(9),
  latitude NUMERIC(10,7) NOT NULL,
  longitude NUMERIC(10,7) NOT NULL,
  prioridade VARCHAR(20) NOT NULL DEFAULT 'MEDIA' CHECK (prioridade IN ('BAIXA','MEDIA','ALTA','URGENTE')),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE','EM_TRANSITO','ENTREGUE','ATRASADA','CANCELADA')),
  agendado_para TIMESTAMPTZ,
  entregue_em TIMESTAMPTZ,
  veiculo_id BIGINT REFERENCES veiculos(id) ON DELETE SET NULL,
  observacoes TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_entregas_status_prioridade ON entregas(status, prioridade);
CREATE INDEX IF NOT EXISTS idx_entregas_agendamento ON entregas(agendado_para);

CREATE TABLE IF NOT EXISTS rotas (
  id BIGSERIAL PRIMARY KEY,
  nome VARCHAR(140) NOT NULL,
  veiculo_id BIGINT REFERENCES veiculos(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PLANEJADA' CHECK (status IN ('PLANEJADA','ATIVA','CONCLUIDA','CANCELADA')),
  latitude_origem NUMERIC(10,7) NOT NULL,
  longitude_origem NUMERIC(10,7) NOT NULL,
  distancia_total_km NUMERIC(10,2) NOT NULL DEFAULT 0,
  minutos_estimados INTEGER NOT NULL DEFAULT 0 CHECK (minutos_estimados >= 0),
  co2_kg NUMERIC(10,2) NOT NULL DEFAULT 0,
  nivel_servico NUMERIC(5,2) NOT NULL DEFAULT 100 CHECK (nivel_servico BETWEEN 0 AND 100),
  iniciado_em TIMESTAMPTZ,
  finalizado_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_rotas_status ON rotas(status);

CREATE TABLE IF NOT EXISTS paradas_rota (
  id BIGSERIAL PRIMARY KEY,
  rota_id BIGINT NOT NULL REFERENCES rotas(id) ON DELETE CASCADE,
  entrega_id BIGINT NOT NULL REFERENCES entregas(id) ON DELETE CASCADE,
  ordem_parada INTEGER NOT NULL CHECK (ordem_parada > 0),
  chegada_planejada TIMESTAMPTZ,
  chegada_real TIMESTAMPTZ,
  distancia_trecho_km NUMERIC(10,2) NOT NULL DEFAULT 0,
  UNIQUE (rota_id, ordem_parada)
);

CREATE TABLE IF NOT EXISTS simulacoes (
  id BIGSERIAL PRIMARY KEY,
  nome VARCHAR(140) NOT NULL,
  criado_por BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  parametros JSONB NOT NULL,
  distancia_km NUMERIC(10,2) NOT NULL,
  duracao_minutos INTEGER NOT NULL CHECK (duracao_minutos >= 0),
  custo_estimado NUMERIC(12,2) NOT NULL,
  co2_kg NUMERIC(10,2) NOT NULL,
  nivel_servico NUMERIC(5,2) NOT NULL CHECK (nivel_servico BETWEEN 0 AND 100),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS historico_status_entrega (
  id BIGSERIAL PRIMARY KEY,
  entrega_id BIGINT NOT NULL REFERENCES entregas(id) ON DELETE CASCADE,
  status_anterior VARCHAR(30),
  novo_status VARCHAR(30) NOT NULL,
  alterado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION registrar_historico_status_entrega() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO historico_status_entrega (entrega_id, status_anterior, novo_status)
    VALUES (NEW.id, OLD.status, NEW.status);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS gatilho_historico_status_entrega ON entregas;
CREATE TRIGGER gatilho_historico_status_entrega
AFTER UPDATE OF status ON entregas
FOR EACH ROW EXECUTE FUNCTION registrar_historico_status_entrega();

CREATE OR REPLACE FUNCTION atualizar_data_modificacao() RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS gatilho_atualizar_usuarios ON usuarios;
DROP TRIGGER IF EXISTS gatilho_atualizar_veiculos ON veiculos;
DROP TRIGGER IF EXISTS gatilho_atualizar_entregas ON entregas;
DROP TRIGGER IF EXISTS gatilho_atualizar_rotas ON rotas;
CREATE TRIGGER gatilho_atualizar_usuarios BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION atualizar_data_modificacao();
CREATE TRIGGER gatilho_atualizar_veiculos BEFORE UPDATE ON veiculos FOR EACH ROW EXECUTE FUNCTION atualizar_data_modificacao();
CREATE TRIGGER gatilho_atualizar_entregas BEFORE UPDATE ON entregas FOR EACH ROW EXECUTE FUNCTION atualizar_data_modificacao();
CREATE TRIGGER gatilho_atualizar_rotas BEFORE UPDATE ON rotas FOR EACH ROW EXECUTE FUNCTION atualizar_data_modificacao();
