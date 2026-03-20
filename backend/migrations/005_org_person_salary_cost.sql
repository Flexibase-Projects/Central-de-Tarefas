-- Organograma: salário e custo mensal por linha (valores opcionais, NUMERIC)
ALTER TABLE cdt_user_org ADD COLUMN IF NOT EXISTS monthly_salary NUMERIC(14, 2);
ALTER TABLE cdt_user_org ADD COLUMN IF NOT EXISTS monthly_cost NUMERIC(14, 2);
