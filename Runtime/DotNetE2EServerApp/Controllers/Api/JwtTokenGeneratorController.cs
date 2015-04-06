// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

using System;
using System.Security.Claims;
using System.Web.Http;
using Microsoft.Azure.Mobile.Security;
using Microsoft.Azure.Mobile.Server;
using Microsoft.Azure.Mobile.Server.Security;

namespace ZumoE2EServerApp.Controllers
{
    [AuthorizeLevel(AuthorizationLevel.Anonymous)]
    public class JwtTokenGeneratorController : ApiController
    {
        public ApiServices Services { get; set; }
        public IServiceTokenHandler handler { get; set; }

        public TokenInfo GetDummyUserToken()
        {
            ProviderCredentials creds = new FacebookCredentials
            {
                Provider = "Facebook",
                UserId = "Facebook:someuserid@hotmail.com",
                AccessToken = "somepassword"
            };
            Claim claim = new Claim(ClaimTypes.NameIdentifier, creds.UserId);
            ClaimsIdentity claimIdentity = new ClaimsIdentity();
            claimIdentity.AddClaim(claim);
            return handler.CreateTokenInfo(claimIdentity.Claims, TimeSpan.FromDays(30), this.Services.Settings.SigningKey);
        }
    }
}
