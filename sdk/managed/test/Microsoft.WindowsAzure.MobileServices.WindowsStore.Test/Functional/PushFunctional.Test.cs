// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.WindowsAzure.MobileServices.TestFramework;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Windows.Networking.PushNotifications;
using System;
using System.Xml.Linq;

namespace Microsoft.WindowsAzure.MobileServices.Test
{
    [Tag("push")]
    public class PushFunctional : FunctionalTestBase
    {
        readonly IPushTestUtility pushTestUtility;
        private static Queue<PushNotificationReceivedEventArgs> pushesReceived = new Queue<PushNotificationReceivedEventArgs>();

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
            ////TODO Login then register, verify $UserId:{userId} tag exists
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


        [AsyncTestMethod]
        public async Task ToastPushTest()
        {
            string wnsMethod = "sendToastText01";
            string text = "Hello World";
            var payload = new JObject();
            payload.Add("text1", text);
            XElement expectedResult = BuildXmlToastPayload(wnsMethod, text);
            PushWatcher watcher = new PushWatcher();
            var pushResult = await table.InsertAsync(item);
            var notificationResult = await watcher.WaitForPush(TimeSpan.FromSeconds(10));
            if (notificationResult == null)
            {
                Log("Error, push not received on the timeout allowed");
                Assert.Fail("Error, push not received on the timeout allowed");
            }
            else
            {
                Log("Push notification received:");
                XElement receivedPushInfo = XElement.Parse(notificationResult.ToastNotification.Content.GetXml());
                Log("  {0}: {1}", notificationResult.NotificationType, receivedPushInfo);

                if (expectedResult.ToString(SaveOptions.DisableFormatting) == receivedPushInfo.ToString(SaveOptions.DisableFormatting))
                {
                    Log("Received notification is the expected one.");
                }
                else
                {
                    Log(string.Format("Received notification is not the expected one. \r\nExpected:{0} \r\nActual:{1}", expectedResult.ToString(), receivedPushInfo.ToString()));
                }
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

        private async Task<string> GetChannelUri()
        {
            var pushChannel = await PushNotificationChannelManager.CreatePushNotificationChannelForApplicationAsync();
            pushChannel.PushNotificationReceived += pushChannel_PushNotificationReceived;
            return pushChannel.Uri;
        }

        private static XElement BuildXmlToastPayload(string wnsMethod, string text1)
        {
            XElement binding = new XElement("binding", new XAttribute("template", wnsMethod.Substring("send".Length)));

            binding.Add(new XElement("text", new XAttribute("id", 1), new XText(text1)));

            XElement xmlPayload = new XElement("toast",
                new XElement("visual",
                    binding));
            return xmlPayload;
        }

        static void pushChannel_PushNotificationReceived(PushNotificationChannel sender, PushNotificationReceivedEventArgs args)
        {
            pushesReceived.Enqueue(args);
        }

        class PushWatcher
        {
            public async Task<PushNotificationReceivedEventArgs> WaitForPush(TimeSpan maximumWait)
            {
                PushNotificationReceivedEventArgs result = null;
                var tcs = new TaskCompletionSource<PushNotificationReceivedEventArgs>();
                DateTime start = DateTime.UtcNow;
                while (DateTime.UtcNow.Subtract(start) < maximumWait)
                {
                    if (pushesReceived.Count > 0)
                    {
                        result = pushesReceived.Dequeue();
                        break;
                    }

                    await Task.Delay(500);
                }

                return result;
            }
        }
    }
}