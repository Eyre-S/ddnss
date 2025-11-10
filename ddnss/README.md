# DDNSS

A DDNS update script used by Eyre-S.

This automatically get your system's IPv6 address
from http://ip1.dynupdate6.no-ip.com/, and then set the
address to cloudflare's record.

This does not create new DNS records. and by defaults, it
does not change the name of the record, so you don't have
to worry about a wrong record id makes your other records
have overridden in mistake.

## How to use

First of all, clone this repository and install

```sh
/srv $ git clone https://github.com/Eyre-S/ddnss
/srv $ cd ddnss
/srv/ddnss $ npm install omit=dev
```

Then add your token to `auth.env` file

```sh
/srv/ddnss $ echo 'API_KEY="Your_Cloudflare_Key_Here"' > auth.env
```

Then write the config file like this:

```sh
/srv/ddnss $ vim config.jsonc
```

```jsonc
{
    
    "$schema": "./schemas/app-config.json",
    
    "cloudflare": [
        {
            "name": "your_name.example.com",
            "zone_id": "ZONE_ID",
            "record_id": "RECORD_ID"
        }
    ]
    
}
```

Zone id and record id can be found by using Cloudflare's
API like that:

```sh
curl 'https://api.cloudflare.com/client/v4/zones/' --header 'Authorization: Bearer YOUR_TOKEN'
curl 'https://api.cloudflare.com/client/v4/zones/YOUR_ZONE_ID/dns_records' --header 'Authorization: Bearer YOUR_TOKEN'
```

After all of that configurations, you can use the following
command to start the auto-update:

```sh
npm run start
```

You can also write the above `npm run start` to your crontab,
or any scheduler daemon to achieve the automatic updates.
Make sure that the scripts PWD is the project dir.
