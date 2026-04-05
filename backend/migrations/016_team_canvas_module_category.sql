-- Canva em equipe (teams) passa a aparecer na categoria Execucao no painel admin global
-- e alinha com o agrupamento da sidebar (module-manifest section execution).

UPDATE cdt_module_definitions
SET category = 'execution'
WHERE key = 'teams';
