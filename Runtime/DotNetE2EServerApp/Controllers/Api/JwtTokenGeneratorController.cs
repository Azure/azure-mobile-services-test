// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

using System;
using System.IdentityModel.Tokens;
using System.Security.Claims;
using System.Web.Http;
using System.Web.Http.Controllers;
using Microsoft.Azure.Mobile.Server.Authentication;
using Microsoft.Azure.Mobile.Server.Config;
using Microsoft.Azure.Mobile.Server.Login;
using ZumoE2EServerApp.DataObjects;

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

        public LoginUser GetDummyUserToken()
        {
            Claim[] claims = new Claim[]
            {
               new Claim("sub", "Facebook:someuserid@hotmail.com")
            };
​
            string signingKey = this.Configuration.GetMobileAppSettingsProvider().GetMobileAppSettings().SigningKey;​
            string host = this.Request.RequestUri.GetLeftPart(UriPartial.Authority) + "/";

            var token =  MobileAppLoginHandler.CreateToken(claims, signingKey, host, host, TimeSpan.FromDays(30));

            return new LoginUser()
            {
                UserId = token.Subject,
                AuthenticationToken = token.RawData
            };
        }
    }
}