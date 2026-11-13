-- Cria o usuário e os bancos de DESENVOLVIMENTO do Bridge.
-- Execute como superusuário (ex.: postgres) UMA vez:
--   psql -U postgres -h localhost -f scripts/criar_banco.sql
--
-- A senha abaixo é DEMONSTRATIVA, só para ambiente local. Se trocar,
-- atualize DATABASE_URL em backend/.env.
-- Nenhuma tabela é criada aqui: o esquema é criado pelas migrações Alembic.

CREATE ROLE bridge WITH LOGIN PASSWORD 'bridge_dev';

-- Banco usado pela API.
CREATE DATABASE bridge OWNER bridge ENCODING 'UTF8';

-- Banco exclusivo dos testes automatizados (os testes APAGAM os dados dele).
CREATE DATABASE bridge_test OWNER bridge ENCODING 'UTF8';
