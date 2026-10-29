#!/bin/sh
# Renders nginx.conf for the image: API_UPSTREAM (host:port of the API on the
# internal network) and TRUSTED_PROXIES (comma-separated IPs/CIDRs of any
# proxy or CDN in front of nginx). Both are validated so a build argument
# can't smuggle extra nginx directives in.
set -eu
: "${API_UPSTREAM:?}"
TRUSTED_PROXIES="${TRUSTED_PROXIES:-}"

echo "$API_UPSTREAM" | grep -Eq '^[A-Za-z0-9.-]+:[0-9]{1,5}$' || { echo "API_UPSTREAM must look like host:port" >&2; exit 1; }

real_ip=""
for cidr in $(echo "$TRUSTED_PROXIES" | tr ',' ' '); do
  echo "$cidr" | grep -Eq '^[0-9A-Fa-f:.]+(/[0-9]{1,3})?$' || { echo "Bad TRUSTED_PROXIES entry: $cidr" >&2; exit 1; }
  real_ip="${real_ip}set_real_ip_from ${cidr}; "
done
[ -n "$real_ip" ] && real_ip="${real_ip}real_ip_header X-Forwarded-For; real_ip_recursive on;"

sed -e "s|__API_UPSTREAM__|${API_UPSTREAM}|g" -e "s|__REAL_IP_CONFIG__|${real_ip}|" "$1"
