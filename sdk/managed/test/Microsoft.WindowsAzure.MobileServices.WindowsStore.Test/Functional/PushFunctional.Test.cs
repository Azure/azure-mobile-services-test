// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

using System.Linq;

using Microsoft.WindowsAzure.MobileServices.TestFramework;
using Newtonsoft.Json.Linq;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;
using Newtonsoft.Json;

namespace Microsoft.WindowsAzure.MobileServices.Test
{
    [Tag("push")]
    public class PushFunctional : FunctionalTestBase
    {
        readonly IPushTestUtility pushTestUtility;

        public PushFunctional()
        {
            this.pushTestUtility = TestPlatform.Instance.PushTestUtility;
        }

        [AsyncTestMethod]
        public async Task RegisterAsyncUnregisterAsyncInstallation()
        {
            var channelUri = this.pushTestUtility.GetPushHandle();
            var mobileServiceClient = this.GetClient();

            Dictionary<string, string> channelUriParam = new Dictionary<string, string>()
            {
                {"channelUri", channelUri}
            };

            var push = mobileServiceClient.GetPush();

            await push.RegisterAsync(channelUri);
            try
            {
                bool installationVerified = (bool)await this.GetClient().InvokeApiAsync("verifyRegisterInstallationResult", HttpMethod.Get, channelUriParam);
                Assert.IsTrue(installationVerified);
            }
            finally
            {
                push.UnregisterAsync().Wait();
            }
            ////TODO Login then register, verify $UserId:{userId} tag exists
        }

        [AsyncTestMethod]
        public async Task UnRegisterAsync()
        {
            var channelUri = this.pushTestUtility.GetPushHandle();
            var mobileServiceClient = this.GetClient();
            var push = mobileServiceClient.GetPush();
            await push.UnregisterAsync();
            bool installationUnregistered = (bool)await this.GetClient().InvokeApiAsync("verifyUnregisterInstallationResult", HttpMethod.Get, null);
            Assert.IsTrue(installationUnregistered);
        }

        [AsyncTestMethod]
        public async Task RegisterAsyncWithTemplates()
        {
            var channelUri = this.pushTestUtility.GetPushHandle();
            JObject templates = GetTemplates();
            var mobileServiceClient = this.GetClient();
            var push = this.GetClient().GetPush();
            push.RegisterAsync(channelUri, templates).Wait();
            Dictionary<string, string> parameters = new Dictionary<string, string>()
            {
                {"channelUri", channelUri},
                {"templates", JsonConvert.SerializeObject(templates)}
            };
            try
            {
                bool installationVerified = (bool)await this.GetClient().InvokeApiAsync("verifyRegisterInstallationResult", HttpMethod.Get, parameters);
                Assert.IsTrue(installationVerified);
            }
            finally
            {
                push.UnregisterAsync().Wait();
            }
        }

        [AsyncTestMethod]
        public async Task RegisterAsyncWithTemplatesAndSecondaryTiles()
        {
            var channelUri = this.pushTestUtility.GetPushHandle();

            JObject secondaryTileBody = new JObject();
            secondaryTileBody["pushChannel"] = channelUri;
            JArray tags = new JArray();
            tags.Add("bar");
            JObject templates = GetTemplates();
            secondaryTileBody["templates"] = templates;
            JObject secondaryTiles = new JObject();
            secondaryTiles["testSecondaryTiles"] = secondaryTileBody;

            var push = this.GetClient().GetPush();
            await push.RegisterAsync(channelUri, templates, secondaryTiles);

            Dictionary<string, string> parameters = new Dictionary<string, string>()
            {
                {"channelUri", channelUri},
                {"templates", JsonConvert.SerializeObject(templates)},
                {"secondaryTiles", JsonConvert.SerializeObject(secondaryTiles)}
            };
            try
            {
                bool installationVerified = (bool)await this.GetClient().InvokeApiAsync("verifyRegisterInstallationResult", HttpMethod.Get, parameters);
                Assert.IsTrue(installationVerified);
            }
            finally
            {
                push.UnregisterAsync().Wait();
            }
        }

        public async Task RegisterAsyncMultiple()
        {
            var channelUri = this.pushTestUtility.GetPushHandle();
            JObject templates = GetTemplates();
            var mobileServiceClient = this.GetClient();
            var push = this.GetClient().GetPush();

            await push.RegisterAsync(channelUri);
            await push.RegisterAsync(channelUri, templates);
            await push.RegisterAsync(channelUri);

            Dictionary<string, string> parameters = new Dictionary<string, string>()
            {
                {"channelUri", channelUri},
            };

            try
            {
                //Verifies templates are removed from the installation registration
                bool installationVerified = (bool)await this.GetClient().InvokeApiAsync("verifyRegisterInstallationResult", HttpMethod.Get, parameters);
                Assert.IsTrue(installationVerified);
            }
            finally
            {
                push.UnregisterAsync().Wait();
            }
        }

        private static JObject GetTemplates()
        {
            var toastTemplate = "<toast><visual><binding template=\"ToastText01\"><text id=\"1\">$(message)</text></binding></visual></toast>";
            JObject templateBody = new JObject();
            templateBody["body"] = toastTemplate;

            JObject wnsToastHeaders = new JObject();
            wnsToastHeaders["X-WNS-Type"] = "wns/toast";
            templateBody["headers"] = wnsToastHeaders;

            JArray tags = new JArray();
            tags.Add("foo");
            templateBody["tags"] = tags;

            JObject templates = new JObject();
            templates["testTemplate"] = templateBody;
            return templates;
        }
    }
}