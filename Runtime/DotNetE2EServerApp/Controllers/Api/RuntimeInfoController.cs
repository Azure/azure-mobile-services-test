// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

using Microsoft.Azure.Mobile.Server;
using Microsoft.Azure.Mobile.Server.Security;
using Microsoft.Azure.Mobile.Server.Config;
using Newtonsoft.Json.Linq;
using System;
using System.Diagnostics;
using System.Web.Http;
using System.Linq;
using System.Reflection;
using Microsoft.Azure.Mobile.Security;

namespace ZumoE2EServerApp.Controllers
{
    [AuthorizeLevel(AuthorizationLevel.Anonymous)]
    public class RuntimeInfoController : ApiController
    {
        public ApiServices Services { get; set; }

        [Route("api/runtimeInfo")]
        public JObject GetFeatures()
        {
            string version = "unknown";
            try
            {
                var afva = typeof(ApiServices).Assembly.CustomAttributes.FirstOrDefault(p => p.AttributeType == typeof(AssemblyFileVersionAttribute));
                if (afva != null)
                {
                    version = afva.ConstructorArguments[0].Value as string;
                }
            }
            catch (Exception)
            {
            }

            return new JObject(
                new JProperty("runtime", new JObject(
                    new JProperty("type", ".NET"),
                    new JProperty("version", version)
                )),
                new JProperty("features", new JObject(
                    new JProperty("intIdTables", false),
                    new JProperty("stringIdTables", true),
                    new JProperty("nhPushEnabled", true),
                    new JProperty("queryExpandSupport", true),
                    new JProperty("usersEnabled", false),
                    new JProperty("liveSDKLogin", false),
                    new JProperty("singleSignOnLogin", false),
                    new JProperty("azureActiveDirectoryLogin", false),
                    new JProperty("dotNetRuntimeOnly", true),
                    new JProperty("nodeRuntimeOnly", false),
                    new JProperty("stringReplace", false)
                ))
            );
        }
    }
}