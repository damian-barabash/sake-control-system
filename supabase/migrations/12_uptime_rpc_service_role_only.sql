-- monitor_uptime is SECURITY DEFINER and takes an arbitrary monitor id, so a
-- signed-in tenant could have read uptime for monitors outside their scope.
-- It is only ever called by run-checks under the service role.
revoke execute on function public.monitor_uptime(uuid) from authenticated, anon, public;
grant execute on function public.monitor_uptime(uuid) to service_role;
