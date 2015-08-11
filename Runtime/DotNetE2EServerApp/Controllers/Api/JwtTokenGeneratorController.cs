// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

using System;
using System.Security.Claims;
using System.Web.Http;
using System.Web.Http.Controllers;
using Microsoft.Azure.Mobile.Server.Authentication;
using Microsoft.Azure.Mobile.Server.Config;

namespace ZumoE2EServerApp.Controllers
{
    [MobileAppController]
    public class JwtTokenGeneratorController : ApiController
    {
        public IMobileAppTokenHandler handler { get; set; }

        protected override void Initialize(HttpControllerContext controllerContext)
        {
            base.Initialize(controllerContext);
            this.handler = controllerContext.Configuration.GetMobileAppTokenHandler();
        }

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

            string signingKey = this.Configuration.GetMobileAppSettingsProvider().GetMobileAppSettings().SigningKey;
            return handler.CreateTokenInfo(claimIdentity.Claims, TimeSpan.FromDays(30), signingKey);
        }
    }
}