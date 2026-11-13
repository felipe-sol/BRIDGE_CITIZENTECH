-- Executado pelo container do docker-compose na primeira inicialização.
-- O usuário "bridge" e o banco "bridge" já são criados pelas variáveis do container.
-- Aqui criamos só o banco exclusivo dos testes automatizados.
CREATE DATABASE bridge_test OWNER bridge ENCODING 'UTF8';
