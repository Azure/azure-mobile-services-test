// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

using System.Linq;

using Microsoft.WindowsAzure.MobileServices.TestFramework;
using Newtonsoft.Json.Linq;

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

        [TestMethod]
        public void InitialUnregisterAllAsync()
        {
            var channelUri = this.pushTestUtility.GetPushHandle();
            var push = this.GetClient().GetPush();
            push.UnregisterAllAsync(channelUri).Wait();
            var registrations = push.ListRegistrationsAsync(channelUri).Result;
            Assert.IsFalse(registrations.Any(), "Deleting all registrations for a channel should ensure no registrations are returned by List");

            channelUri = this.pushTestUtility.GetUpdatedPushHandle();
            push.UnregisterAllAsync(channelUri).Wait();
            registrations = push.ListRegistrationsAsync(channelUri).Result;
            Assert.IsFalse(registrations.Any(), "Deleting all registrations for a channel should ensure no registrations are returned by List");
        }

        [TestMethod]
        public void RegisterNativeAsyncUnregisterNativeAsync()
        {
            var channelUri = this.pushTestUtility.GetPushHandle();
            var push = this.GetClient().GetPush();
            push.RegisterNativeAsync(channelUri).Wait();
            var registrations = push.ListRegistrationsAsync(channelUri).Result;
            Assert.AreEqual(registrations.Count(), 1, "1 registration should exist after RegisterNativeAsync");
            
            push.UnregisterNativeAsync().Wait();
            registrations = push.ListRegistrationsAsync(channelUri).Result;
            Assert.AreEqual(registrations.Count(), 0, "0 registrations should exist in service after UnregisterNativeAsync");
        }

        [TestMethod]
        public void RegisterAsyncUnregisterTemplateAsync()
        {
            var mobileClient = this.GetClient();
            var push = mobileClient.GetPush();
            var template = this.pushTestUtility.GetTemplateRegistrationForToast();
            this.pushTestUtility.ValidateTemplateRegistrationBeforeRegister(template);
            push.RegisterAsync(template).Wait();
            var registrations = push.ListRegistrationsAsync(template.PushHandle).Result;
            Assert.AreEqual(registrations.Count(), 1, "1 registration should exist after RegisterNativeAsync");
            var registrationAfter = registrations.First();
            Assert.IsNotNull(registrationAfter, "List and Deserialization of a TemplateRegistration after successful registration should have a value.");
            
            this.pushTestUtility.ValidateTemplateRegistrationAfterRegister(registrationAfter);

            push.UnregisterTemplateAsync(template.Name).Wait();
            registrations = push.ListRegistrationsAsync(template.PushHandle).Result;
            Assert.AreEqual(registrations.Count(), 0, "0 registrations should exist in service after UnregisterTemplateAsync");
        }

        [TestMethod]
        public void RegisterRefreshRegisterWithUpdatedChannel()
        {
            var mobileClient = this.GetClient();
            var push = mobileClient.GetPush();
            var template = this.pushTestUtility.GetTemplateRegistrationForToast();
            this.pushTestUtility.ValidateTemplateRegistrationBeforeRegister(template);
            push.RegisterAsync((Registration)template).Wait();
            var registrations = push.ListRegistrationsAsync(template.PushHandle).Result;
            Assert.AreEqual(registrations.Count(), 1, "1 registration should exist after RegisterNativeAsync");
            var registrationAfter = registrations.First();
            Assert.IsNotNull(registrationAfter, "List and Deserialization of a TemplateRegistration after successful registration should have a value.");
            template = this.pushTestUtility.GetUpdatedTemplateRegistrationForToast();

            push.RegisterAsync(template).Wait();
            registrations = push.ListRegistrationsAsync(template.PushHandle).Result;
            Assert.AreEqual(registrations.Count(), 1, "1 registration should exist after RegisterNativeAsync");
            var registrationAfterUpdate = registrations.First();
            Assert.IsNotNull(registrationAfterUpdate, "List and Deserialization of a TemplateRegistration after successful registration should have a value.");
            Assert.AreEqual(registrationAfter.RegistrationId, registrationAfterUpdate.RegistrationId, "Expected the same RegistrationId to be used even after the refresh");
            Assert.AreEqual(registrationAfterUpdate.PushHandle, template.PushHandle, "Expected updated channelUri after 2nd register");
            Assert.AreEqual(push.ListRegistrationsAsync(registrationAfter.PushHandle).Result.Count(), 0, "Original channel should be gone from service");

            push.UnregisterTemplateAsync(template.Name).Wait();
            registrations = push.ListRegistrationsAsync(template.PushHandle).Result;
            Assert.AreEqual(registrations.Count(), 0, "0 registrations should exist in service after UnregisterTemplateAsync");
        }

        [TestMethod]
        public void RegisterAsyncUnregisterAsyncInstallation()
        {
            var channelUri = this.pushTestUtility.GetPushHandle();
            var push = this.GetClient().GetPush();
            push.RegisterAsync(channelUri).Wait();
            //TODO update to use NH SDK to query registrations
            var registrations = push.ListRegistrationsAsync(channelUri).Result;
            Assert.AreEqual(registrations.Count(), 1, "1 registration should exist after RegisterAsync");
            Assert.IsTrue(registrations.FirstOrDefault().Tags.Contains("$InstallationId:{" + push.InstallationId + "}"));
            //TODO Login then register, verify $UserId:{userId} tag exists
            push.UnregisterAsync().Wait();
            registrations = push.ListRegistrationsAsync(channelUri).Result;
            Assert.AreEqual(registrations.Count(), 0, "0 registrations should exist in service after UnregisterNativeAsync");
        }

        [TestMethod]
        public void RegisterAsyncUnregisterAsyncWithTemplates()
        {
            var channelUri = this.pushTestUtility.GetPushHandle();
            JObject templates = GetTemplates();

            var push = this.GetClient().GetPush();
            push.RegisterAsync(channelUri, templates).Wait();
            
            var registrations = push.ListRegistrationsAsync(channelUri).Result;
            Assert.AreEqual(registrations.Count(), 2, "2 registrations should exist after RegisterAsync with one template");
            foreach(Registration registration in registrations)
            {
                Assert.IsTrue(registration.Tags.Contains("$InstallationId:{" + push.InstallationId + "}"));
                //Verify runtime strips out any tags added by user
                Assert.IsFalse(registration.Tags.Contains("foo"));
            }

            push.UnregisterAsync().Wait();
            registrations = push.ListRegistrationsAsync(channelUri).Result;
            Assert.AreEqual(registrations.Count(), 0, "0 registrations should exist in service after UnregisterNativeAsync");
        }

        [TestMethod]
        public void RegisterAsyncUnregisterAsyncWithTemplatesAndSecondaryTiles()
        {
            var channelUri = this.pushTestUtility.GetPushHandle();
            JObject templates = GetTemplates();

            var push = this.GetClient().GetPush();
            push.RegisterAsync(channelUri, templates,templates).Wait();

            var registrations = push.ListRegistrationsAsync(channelUri).Result;
            Assert.AreEqual(registrations.Count(), 4, "4 registrations should exist after RegisterAsync with one template");
            foreach (Registration registration in registrations)
            {
                Assert.IsTrue(registration.Tags.Contains("$InstallationId:{" + push.InstallationId + "}"));
                //Verify runtime strips out any tags added by user
                Assert.IsFalse(registration.Tags.Contains("foo"));
            }

            push.UnregisterAsync().Wait();
            registrations = push.ListRegistrationsAsync(channelUri).Result;
            Assert.AreEqual(registrations.Count(), 0, "0 registrations should exist in service after UnregisterNativeAsync");
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