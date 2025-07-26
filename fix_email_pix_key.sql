-- Correção de dados: Email no campo pix_key
-- Execute este script no SQL Editor do Supabase Dashboard

-- Função para verificar se uma string é um email válido
CREATE OR REPLACE FUNCTION is_valid_email(email text)
RETURNS boolean AS $$
BEGIN
  RETURN email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$ LANGUAGE plpgsql;

-- Corrigir registros onde email está NULL mas pix_key contém email
UPDATE profiles 
SET 
  email = pix_key,
  pix_key = NULL
WHERE 
  email IS NULL 
  AND pix_key IS NOT NULL 
  AND is_valid_email(pix_key);

-- Log das correções feitas
DO $$
DECLARE
  corrected_count integer;
BEGIN
  GET DIAGNOSTICS corrected_count = ROW_COUNT;
  RAISE NOTICE 'Corrigidos % registros onde email estava no campo pix_key', corrected_count;
END $$;

-- Verificar se a correção funcionou (sem usar a função que será removida)
SELECT 
  id,
  name,
  email,
  pix_key,
  CASE 
    WHEN email IS NOT NULL AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN 'OK'
    WHEN email IS NULL AND pix_key IS NOT NULL AND pix_key ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN 'PRECISA CORRIGIR'
    ELSE 'VERIFICAR'
  END as status
FROM profiles 
WHERE email IS NULL OR pix_key IS NOT NULL
ORDER BY created_at DESC;

-- Limpar função auxiliar (apenas no final)
DROP FUNCTION IF EXISTS is_valid_email(text); 