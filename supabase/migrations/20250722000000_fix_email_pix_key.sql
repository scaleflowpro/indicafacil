/*
  # Correção de dados: Email no campo pix_key

  Problema identificado: Alguns registros têm o email salvo no campo pix_key
  e o campo email está NULL.

  Solução: 
  1. Identificar registros com email NULL e pix_key contendo email
  2. Mover o email do pix_key para o campo email
  3. Limpar o campo pix_key se contiver email
*/

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

-- Limpar função auxiliar
DROP FUNCTION IF EXISTS is_valid_email(text); 