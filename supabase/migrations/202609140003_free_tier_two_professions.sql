-- El formulario y el plan gratuito permiten publicar hasta dos profesiones.
update public.membership_plans
set max_trades = 2
where code = 'free';
