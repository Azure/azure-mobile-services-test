// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

using Microsoft.WindowsAzure.MobileServices.TestFramework;
using Newtonsoft.Json.Linq;
using Windows.Networking.PushNotifications;

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
        public async Task InitialUnregisterAllAsync()
        {
            var channelUri = this.pushTestUtility.GetPushHandle();
            var push = this.GetClient().GetPush();
            await push.UnregisterAllAsync(channelUri);
            var registrations = await push.ListRegistrationsAsync(channelUri);
            Assert.IsFalse(registrations.Any(), "Deleting all registrations for a channel should ensure no registrations are returned by List");

            channelUri = this.pushTestUtility.GetUpdatedPushHandle();
            await push.UnregisterAllAsync(channelUri);
            registrations = await push.ListRegistrationsAsync(channelUri);
            Assert.IsFalse(registrations.Any(), "Deleting all registrations for a channel should ensure no registrations are returned by List");

            channelUri = this.GetChannelUri().Result;
            await push.UnregisterAllAsync(channelUri);
            registrations = await push.ListRegistrationsAsync(channelUri);
            Assert.IsFalse(registrations.Any(), "Deleting all registrations for a channel should ensure no registrations are returned by List");
        }

        [AsyncTestMethod]
        public async Task RegisterNativeAsyncUnregisterNativeAsync()
        {
            var channelUri = this.pushTestUtility.GetPushHandle();
            var push = this.GetClient().GetPush();
            await push.RegisterNativeAsync(channelUri);
            var registrations = await push.ListRegistrationsAsync(channelUri);
            Assert.AreEqual(registrations.Count(), 1, "1 registration should exist after RegisterNativeAsync");

            await push.UnregisterNativeAsync();
            registrations = await push.ListRegistrationsAsync(channelUri);
            Assert.AreEqual(registrations.Count(), 0, "0 registrations should exist in service after UnregisterNativeAsync");
        }

        [AsyncTestMethod]
        public async Task RegisterAsyncUnregisterTemplateAsync()
        {
            var mobileClient = this.GetClient();
            var push = mobileClient.GetPush();
            var template = this.pushTestUtility.GetTemplateRegistrationForToast();
            this.pushTestUtility.ValidateTemplateRegistrationBeforeRegister(template);
            await push.RegisterAsync(template);
            var registrations = await push.ListRegistrationsAsync(template.PushHandle);
            Assert.AreEqual(registrations.Count(), 1, "1 registration should exist after RegisterNativeAsync");
            var registrationAfter = registrations.First();
            Assert.IsNotNull(registrationAfter, "List and Deserialization of a TemplateRegistration after successful registration should have a value.");
            
            this.pushTestUtility.ValidateTemplateRegistrationAfterRegister(registrationAfter);

            await push.UnregisterTemplateAsync(template.Name);
            registrations = await push.ListRegistrationsAsync(template.PushHandle);
            Assert.AreEqual(registrations.Count(), 0, "0 registrations should exist in service after UnregisterTemplateAsync");
        }

        [AsyncTestMethod]
        public async Task RegisterRefreshRegisterWithUpdatedChannelAsync()
        {
            var mobileClient = this.GetClient();
            var push = mobileClient.GetPush();
            var template = this.pushTestUtility.GetTemplateRegistrationForToast();
            this.pushTestUtility.ValidateTemplateRegistrationBeforeRegister(template);
            await push.RegisterAsync((Registration)template);
            var registrations = await push.ListRegistrationsAsync(template.PushHandle);
            Assert.AreEqual(registrations.Count(), 1, "1 registration should exist after RegisterNativeAsync");
            var registrationAfter = registrations.First();
            Assert.IsNotNull(registrationAfter, "List and Deserialization of a TemplateRegistration after successful registration should have a value.");
            template = this.pushTestUtility.GetUpdatedTemplateRegistrationForToast();

            await push.RegisterAsync(template);
            registrations = await push.ListRegistrationsAsync(template.PushHandle);
            Assert.AreEqual(registrations.Count(), 1, "1 registration should exist after RegisterNativeAsync");
            var registrationAfterUpdate = registrations.First();
            Assert.IsNotNull(registrationAfterUpdate, "List and Deserialization of a TemplateRegistration after successful registration should have a value.");
            Assert.AreEqual(registrationAfter.RegistrationId, registrationAfterUpdate.RegistrationId, "Expected the same RegistrationId to be used even after the refresh");
            Assert.AreEqual(registrationAfterUpdate.PushHandle, template.PushHandle, "Expected updated channelUri after 2nd register");
            Assert.AreEqual(push.ListRegistrationsAsync(registrationAfter.PushHandle).Result.Count(), 0, "Original channel should be gone from service");

            await push.UnregisterTemplateAsync(template.Name);
            registrations = await push.ListRegistrationsAsync(template.PushHandle);
            Assert.AreEqual(registrations.Count(), 0, "0 registrations should exist in service after UnregisterTemplateAsync");
        }

        [AsyncTestMethod]
        public async Task WnsToastPushTestAsync()
        {
            var client = this.GetClient();
            var push = client.GetPush();

            var payload = "<?xml version=\"1.0\"?><toast><visual><binding template=\"ToastText01\"><text id=\"1\">hello world</text></binding></visual></toast>";

            var body = new JObject();
            body.Add("method", "send");
            body.Add("type", "wns");
            body.Add("payload", payload);
            body.Add("token", "dummy");
            body.Add("wnsType", "toast");
            body.Add("tag", "tag1");

            try
            {
                await push.RegisterNativeAsync(await this.GetChannelUri(), new string[]{ "tag1" });
                await client.InvokeApiAsync("push", body);

                var notificationResult = await WaitForPush(TimeSpan.FromSeconds(10));
                if (notificationResult == null)
                {
                    Assert.Fail("Error, push not received on the timeout allowed");
                }
                else
                {
                    Log("Push notification received:");
                    var receivedPayload = notificationResult.ToastNotification.Content.GetXml();
                    Log("  {0}: {1}", notificationResult.NotificationType, receivedPayload);

                    if (payload == receivedPayload)
                    {
                        Log("Received notification is the expected one.");
                    }
                    else
                    {
                        Assert.Fail(string.Format("Received notification is not the expected one. \r\nExpected:{0} \r\nActual:{1}", payload, receivedPayload));
                    }
                }
            }
            finally
            {
                push.UnregisterNativeAsync().Wait();
            }
        }

        private async Task<string> GetChannelUri()
        {
            var pushChannel = await PushNotificationChannelManager.CreatePushNotificationChannelForApplicationAsync();
            pushChannel.PushNotificationReceived += OnPushNotificationReceived;
            return pushChannel.Uri;
        }

        private static void OnPushNotificationReceived(PushNotificationChannel sender, PushNotificationReceivedEventArgs args)
        {
            pushesReceived.Enqueue(args);
        }

        private async Task<PushNotificationReceivedEventArgs> WaitForPush(TimeSpan maximumWait)
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