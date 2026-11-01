-- TORA 1.2 — Migración incremental para feedback de usuarios.
-- No borra datos ni modifica las cuatro tablas existentes.
-- Ejecútalo en Supabase → SQL Editor si deseas activar Feedback.
BEGIN;
CREATE TABLE IF NOT EXISTS public.user_feedback (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
 category text NOT NULL CHECK (category IN ('error','sugerencia','calidad')),
 description text NOT NULL CHECK (char_length(description) BETWEEN 15 AND 1500),
 status text NOT NULL DEFAULT 'nuevo' CHECK (status IN ('nuevo','revisando','resuelto')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tora_user_feedback_owner_idx ON public.user_feedback(user_id,created_at DESC);
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.user_feedback FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON TABLE public.user_feedback TO authenticated;
GRANT ALL ON TABLE public.user_feedback TO service_role;
DROP POLICY IF EXISTS tora_feedback_select_own ON public.user_feedback;
CREATE POLICY tora_feedback_select_own ON public.user_feedback FOR SELECT TO authenticated
 USING (user_id=(select auth.uid()) AND EXISTS(
 SELECT 1 FROM public.profiles p WHERE p.id=(select auth.uid()) AND p.status='approved'));
DROP POLICY IF EXISTS tora_feedback_insert_own ON public.user_feedback;
CREATE POLICY tora_feedback_insert_own ON public.user_feedback FOR INSERT TO authenticated
 WITH CHECK(user_id=(select auth.uid()) AND status='nuevo' AND EXISTS(
 SELECT 1 FROM public.profiles p WHERE p.id=(select auth.uid()) AND p.status='approved'));

-- Acceso administrativo validado en la base de datos, no solo en la interfaz.
CREATE OR REPLACE FUNCTION public.tora_admin_list_feedback()
RETURNS TABLE(id uuid,category text,description text,status text,created_at timestamptz,display_name text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.role='admin' AND p.status='approved') THEN
  RAISE EXCEPTION 'No autorizado' USING ERRCODE='42501';
 END IF;
 RETURN QUERY SELECT f.id,f.category,f.description,f.status,f.created_at,p.display_name
 FROM public.user_feedback f INNER JOIN public.profiles p ON p.id=f.user_id
 ORDER BY f.created_at DESC LIMIT 200;
END;
$$;
CREATE OR REPLACE FUNCTION public.tora_admin_update_feedback(p_id uuid,p_status text)
RETURNS TABLE(id uuid,status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.role='admin' AND p.status='approved') THEN
  RAISE EXCEPTION 'No autorizado' USING ERRCODE='42501';
 END IF;
 IF p_status NOT IN ('nuevo','revisando','resuelto') THEN
  RAISE EXCEPTION 'Estado inválido' USING ERRCODE='22023';
 END IF;
 RETURN QUERY UPDATE public.user_feedback f SET status=p_status WHERE f.id=p_id RETURNING f.id,f.status;
END;
$$;
REVOKE ALL ON FUNCTION public.tora_admin_list_feedback() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.tora_admin_update_feedback(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tora_admin_list_feedback() TO authenticated;
GRANT EXECUTE ON FUNCTION public.tora_admin_update_feedback(uuid,text) TO authenticated;
COMMIT;
