// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

using System;
using System.Security.Claims;
using System.Web.Http;
using Microsoft.WindowsAzure.Mobile.Service;
using Microsoft.WindowsAzure.Mobile.Service.Security;

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

            Claim[] claims = new Claim[]
            {
                new Claim(ClaimTypes.NameIdentifier, creds.UserId)
            };
            ClaimsIdentity claimsIdentity = new ClaimsIdentity(claims);
            TokenInfo tokenInfo = this.handler.CreateTokenInfo(claimsIdentity, creds, TimeSpan.FromDays(10), this.Services.Settings.MasterKey);

            LoginResult actual = this.handler.CreateLoginResult(tokenInfo, creds, this.Services.Settings.MasterKey);

            return tokenInfo;
        }
    }
}