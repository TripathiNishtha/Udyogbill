using System;
using System.Net;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace UdyogBill.Api.Configuration;

public static class ForwardedHeadersConfiguration
{
    public static IServiceCollection ConfigureForwardedHeaders(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<ForwardedHeadersOptions>(options =>
        {
            options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;

            var forwardLimit = configuration.GetValue<int?>("ForwardedHeaders:ForwardLimit");
            if (forwardLimit.HasValue)
            {
                options.ForwardLimit = forwardLimit.Value;
            }
            else
            {
                // Default forward limit of 1 proxy hop to prevent header spoofing / stuffing
                options.ForwardLimit = 1;
            }

            var trustedProxies = configuration.GetSection("ForwardedHeaders:KnownProxies").Get<string[]>();
            if (trustedProxies != null && trustedProxies.Length > 0)
            {
                foreach (var proxy in trustedProxies)
                {
                    if (IPAddress.TryParse(proxy, out var ip))
                    {
                        if (!options.KnownProxies.Contains(ip))
                        {
                            options.KnownProxies.Add(ip);
                        }
                    }
                }
            }

            var trustedNetworks = configuration.GetSection("ForwardedHeaders:KnownNetworks").Get<string[]>();
            if (trustedNetworks != null && trustedNetworks.Length > 0)
            {
                foreach (var net in trustedNetworks)
                {
                    if (Microsoft.AspNetCore.HttpOverrides.IPNetwork.TryParse(net, out var ipNetwork))
                    {
                        options.KnownNetworks.Add(ipNetwork);
                    }
                }
            }
        });

        return services;
    }
}
