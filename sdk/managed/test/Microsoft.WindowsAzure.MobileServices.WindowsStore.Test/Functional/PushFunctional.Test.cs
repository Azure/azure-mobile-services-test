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
using System;

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
        public async Task InitialDeleteRegistrationsAsync()
        {
            var channelUri = this.pushTestUtility.GetPushHandle();
            Dictionary<string, string> channelUriParam = new Dictionary<string, string>()
            {
                {"channelUri", channelUri}
            };
            await this.GetClient().InvokeApiAsync("deleteRegistrationsForChannel", HttpMethod.Delete, channelUriParam);
        }

        [AsyncTestMethod]
        public async Task RegisterAsync()
        {
            var channelUri = this.pushTestUtility.GetPushHandle();
            Dictionary<string, string> channelUriParam = new Dictionary<string, string>()
            {
                {"channelUri", channelUri}
            };
            var push = this.GetClient().GetPush();
            await push.RegisterAsync(channelUri);
            try
            {
                await this.GetClient().InvokeApiAsync("verifyRegisterInstallationResult", HttpMethod.Get, channelUriParam);
            }
            catch (MobileServiceInvalidOperationException)
            {
                throw;
            }
            finally
            {
                push.UnregisterAsync().Wait();
            }
        }

        [AsyncTestMethod]
        public async Task LoginRegisterAsync()
        {
            MobileServiceUser user = await GetDummyUser();
            this.GetClient().CurrentUser = user;
            var channelUri = this.pushTestUtility.GetPushHandle();
            Dictionary<string, string> channelUriParam = new Dictionary<string, string>()
            {
                {"channelUri", channelUri}
            };
            var push = this.GetClient().GetPush();
            await push.RegisterAsync(channelUri);
            try
            {
                await this.GetClient().InvokeApiAsync("verifyRegisterInstallationResult", HttpMethod.Get, channelUriParam);
            }
            catch (MobileServiceInvalidOperationException)
            {
                throw;
            }
            finally
            {
                push.UnregisterAsync().Wait();
                this.GetClient().CurrentUser = null;
            }
        }

        [AsyncTestMethod]
        public async Task UnregisterAsync()
        {
            var channelUri = this.pushTestUtility.GetPushHandle();
            var push = this.GetClient().GetPush();
            await push.UnregisterAsync();
            try
            {
                await this.GetClient().InvokeApiAsync("verifyUnregisterInstallationResult", HttpMethod.Get, null);

            }
            catch (MobileServiceInvalidOperationException)
            {
                throw;
            }
        }

        [AsyncTestMethod]
        public async Task RegisterAsyncWithTemplates()
        {
            var channelUri = this.pushTestUtility.GetPushHandle();
            JObject templates = GetTemplates("foo");
            var push = this.GetClient().GetPush();
            push.RegisterAsync(channelUri, templates).Wait();
            JObject expectedTemplates = GetTemplates(null);
            Dictionary<string, string> parameters = new Dictionary<string, string>()
            {
                {"channelUri", channelUri},
                {"templates", JsonConvert.SerializeObject(expectedTemplates)}
            };
            try
            {
                await this.GetClient().InvokeApiAsync("verifyRegisterInstallationResult", HttpMethod.Get, parameters);
            }
            catch (MobileServiceInvalidOperationException)
            {
                throw;
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
            JObject templates = GetTemplates("bar");
            JObject secondaryTiles = GetSecondaryTiles(channelUri, "foo");
            var push = this.GetClient().GetPush();
            await push.RegisterAsync(channelUri, templates, secondaryTiles);
            JObject expectedTemplates = GetTemplates(null);
            JObject expectedSecondaryTiles = GetSecondaryTiles(channelUri, null, true);
            Dictionary<string, string> parameters = new Dictionary<string, string>()
            {
                {"channelUri", channelUri},
                {"templates", JsonConvert.SerializeObject(expectedTemplates)},
                {"secondaryTiles", JsonConvert.SerializeObject(expectedSecondaryTiles)}
            };
            try
            {
                await this.GetClient().InvokeApiAsync("verifyRegisterInstallationResult", HttpMethod.Get, parameters);
            }
            catch (MobileServiceInvalidOperationException)
            {
                throw;
            }
            finally
            {
                push.UnregisterAsync().Wait();
            }
        }

        [AsyncTestMethod]
        public async Task RegisterAsyncMultiple()
        {
            var channelUri = this.pushTestUtility.GetPushHandle();
            JObject templates = GetTemplates("foo");
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
                await this.GetClient().InvokeApiAsync("verifyRegisterInstallationResult", HttpMethod.Get, parameters);
            }
            catch (MobileServiceInvalidOperationException)
            {
                throw;
            }
            finally
            {
                push.UnregisterAsync().Wait();
            }
        }

        private static JObject GetTemplates(string tag)
        {
            var toastTemplate = "<toast><visual><binding template=\"ToastText01\"><text id=\"1\">$(message)</text></binding></visual></toast>";
            JObject templateBody = new JObject();
            templateBody["body"] = toastTemplate;

            JObject wnsToastHeaders = new JObject();
            wnsToastHeaders["X-WNS-Type"] = "wns/toast";
            templateBody["headers"] = wnsToastHeaders;
            if (tag != null)
            {
                JArray tags = new JArray();
                tags.Add(tag);
                templateBody["tags"] = tags;
            }
            JObject templates = new JObject();
            templates["testTemplate"] = templateBody;
            return templates;
        }

        private static JObject GetSecondaryTiles(string channelUri, string tag, bool expectedTiles = false)
        {
            JObject secondaryTileBody = new JObject();
            secondaryTileBody["pushChannel"] = channelUri;
            if (expectedTiles)
            {
                secondaryTileBody["pushChannelExpired"] = false;
            }
            JArray tags = new JArray();
            tags.Add("bar");
            JObject templates = GetTemplates(tag);
            secondaryTileBody["templates"] = templates;
            JObject secondaryTiles = new JObject();
            secondaryTiles["testSecondaryTiles"] = secondaryTileBody;
            return secondaryTiles;
        }

        private async Task<MobileServiceUser> GetDummyUser()
        {
            var dummyUser = await this.GetClient().InvokeApiAsync("JwtTokenGenerator", HttpMethod.Get, null);
            JObject token = JObject.Parse(dummyUser["token"].ToString());
            JObject payload = JObject.Parse(token["payload"].ToString());

            MobileServiceUser user = new MobileServiceUser("")
            {
                UserId = payload["uid"].ToString(),
                MobileServiceAuthenticationToken = token["rawData"].ToString()
            };
            return user;
        }
    }
}