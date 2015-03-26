// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

using System.Linq;

using Microsoft.WindowsAzure.MobileServices.TestFramework;
using Newtonsoft.Json.Linq;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;
using System;
using Foundation;
using System.Globalization;
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
        public async Task RegisterAsynInstallation()
        {
            NSData channelUri = NSDataFromDescription(this.pushTestUtility.GetPushHandle());
            var mobileServiceClient = this.GetClient();
            var push = mobileServiceClient.GetPush();

            await push.RegisterAsync(channelUri);

            Dictionary<string, string> channelUriParam = new Dictionary<string, string>()
            {
                {"channelUri", TrimDeviceToken(channelUri.Description)}
            };

            try
            {
                bool installationVerified = (bool)await this.GetClient().InvokeApiAsync("verifyRegisterInstallationResult", HttpMethod.Get, channelUriParam);
                Assert.IsTrue(installationVerified);
            }
            finally
            {
                push.UnregisterAsync().Wait();
            }
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
            NSData channelUri = NSDataFromDescription(this.pushTestUtility.GetPushHandle());
            var mobileServiceClient = this.GetClient();
            var push = mobileServiceClient.GetPush();

            JObject templates = GetTemplates();
            push.RegisterAsync(channelUri, templates).Wait();

            Dictionary<string, string> parameters = new Dictionary<string, string>()
            {
                {"channelUri", TrimDeviceToken(channelUri.Description)},
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

        public async Task RegisterAsyncMultiple()
        {
            NSData channelUri = NSDataFromDescription(this.pushTestUtility.GetPushHandle());
            JObject templates = GetTemplates();
            var mobileServiceClient = this.GetClient();
            var push = this.GetClient().GetPush();

            await push.RegisterAsync(channelUri);
            await push.RegisterAsync(channelUri, templates);
            await push.RegisterAsync(channelUri);

            Dictionary<string, string> parameters = new Dictionary<string, string>()
            {
                {"channelUri", TrimDeviceToken(channelUri.Description)},
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
            var toastTemplate = "{\"aps\": {\"alert\":\"boo!\"}, \"extraprop\":\"($message)\"}";
            JObject templateBody = new JObject();
            templateBody["body"] = toastTemplate;

            JArray tags = new JArray();
            tags.Add("foo");
            templateBody["tags"] = tags;

            JObject templates = new JObject();
            templates["testApnsTemplate"] = templateBody;
            return templates;
        }

        internal static string TrimDeviceToken(string deviceToken)
        {
            if (deviceToken == null)
            {
                throw new ArgumentNullException("deviceToken");
            }

            return deviceToken.Trim('<', '>').Replace(" ", string.Empty).ToUpperInvariant();
        }

        internal static NSData NSDataFromDescription(string hexString)
        {
            hexString = hexString.Trim('<', '>').Replace(" ", string.Empty);
            NSMutableData data = new NSMutableData();
            byte[] hexAsBytes = new byte[hexString.Length / 2];
            for (int index = 0; index < hexAsBytes.Length; index++)
            {
                string byteValue = hexString.Substring(index * 2, 2);
                hexAsBytes[index] = byte.Parse(byteValue, NumberStyles.HexNumber, CultureInfo.InvariantCulture);
            }

            data.AppendBytes(hexAsBytes);
            return data;
        }
    }
}