// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Web.Http;
using Microsoft.Azure.Mobile.Security;
using Microsoft.Azure.Mobile.Server;
using Microsoft.Azure.Mobile.Server.Config;
using Microsoft.Azure.Mobile.Server.Security;
using Microsoft.Azure.NotificationHubs;
using Microsoft.Azure.NotificationHubs.Messaging;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace ZumoE2EServerApp.Controllers
{
    [AuthorizeLevel(AuthorizationLevel.Application)]
    public class PushApiController : ApiController
    {
        public ApiServices Services { get; set; }

        [Route("api/push")]
        public async Task<HttpResponseMessage> Post()
        {

            var data = await this.Request.Content.ReadAsAsync<JObject>();
            var method = (string)data["method"];

            if (method == null)
            {
                return new HttpResponseMessage(System.Net.HttpStatusCode.BadRequest);
            }

            if (method == "send")
            {
                var serialize = new JsonSerializer();

                var token = (string)data["token"];
                var payload = (JObject)data["payload"];
                var type = (string)data["type"];

                if (payload == null || token == null)
                {
                    return new HttpResponseMessage(System.Net.HttpStatusCode.BadRequest);
                }

                if (type == "template")
                {
                    TemplatePushMessage message = new TemplatePushMessage();
                    var keys = payload.Properties();
                    foreach (JProperty key in keys)
                    {
                        Services.Log.Info("Key: " + key.Name);
                        message.Add(key.Name, (string)key.Value);
                    }
                    var result = await Services.Push.SendAsync(message, "World");
                }
                else if (type == "gcm")
                {
                    GooglePushMessage message = new GooglePushMessage();
                    message.JsonPayload = payload.ToString();
                    var result = await Services.Push.SendAsync(message);
                }
                else
                {
                    ApplePushMessage message = new ApplePushMessage();
                    Services.Log.Info(payload.ToString());
                    message.JsonPayload = payload.ToString();
                    var result = await Services.Push.SendAsync(message);
                }
            }
            else
            {
                return new HttpResponseMessage(System.Net.HttpStatusCode.BadRequest);
            }

            return new HttpResponseMessage(System.Net.HttpStatusCode.OK);
        }

        [Route("api/verifyRegisterInstallationResult")]
        public async Task<bool> GetVerifyRegisterInstallationResult(string channelUri, string templates = null, string secondaryTiles = null)
        {
            var nhClient = this.GetNhClient();
            HttpResponseMessage msg = new HttpResponseMessage();
            msg.StatusCode = HttpStatusCode.InternalServerError;
            IEnumerable<string> installationIds;
            if (this.Request.Headers.TryGetValues("X-ZUMO-INSTALLATION-ID", out installationIds))
            {
                var installationId = installationIds.FirstOrDefault();
                Installation nhInstallation = await nhClient.GetInstallationAsync(installationId);
                string nhTemplates = null;
                string nhSecondaryTiles = null;

                if (nhInstallation.Templates != null)
                {
                    nhTemplates = JsonConvert.SerializeObject(nhInstallation.Templates);
                    nhTemplates = Regex.Replace(nhTemplates, @"\s+", String.Empty);
                    templates = Regex.Replace(templates, @"\s+", String.Empty);
                }
                if (nhInstallation.SecondaryTiles != null)
                {
                    nhSecondaryTiles = JsonConvert.SerializeObject(nhInstallation.SecondaryTiles);
                    nhSecondaryTiles = Regex.Replace(nhSecondaryTiles, @"\s+", String.Empty);
                    secondaryTiles = Regex.Replace(secondaryTiles, @"\s+", String.Empty);
                }
                if (nhInstallation.PushChannel.ToLower() != channelUri.ToLower())
                {
                    msg.Content = new StringContent(string.Format("ChannelUri did not match. Expected {0} Found {1}", channelUri, nhInstallation.PushChannel));
                    throw new HttpResponseException(msg);
                }
                if (templates != nhTemplates)
                {
                    msg.Content = new StringContent(string.Format("Templates did not match. Expected {0} Found {1}", templates, nhTemplates));
                    throw new HttpResponseException(msg);
                }
                if (secondaryTiles != nhSecondaryTiles)
                {
                    msg.Content = new StringContent(string.Format("SecondaryTiles did not match. Expected {0} Found {1}", secondaryTiles, nhSecondaryTiles));
                    throw new HttpResponseException(msg);
                }
                bool tagsVerified = await VerifyTags(channelUri, installationId, nhClient);
                if (!tagsVerified)
                {
                    msg.Content = new StringContent("Did not find installationId tag");
                    throw new HttpResponseException(msg);
                }
                return true;
            }
            msg.Content = new StringContent("Did not find X-ZUMO-INSTALLATION-ID header in the incoming request");
            throw new HttpResponseException(msg);
        }

        [Route("api/verifyUnregisterInstallationResult")]
        public async Task<bool> GetVerifyUnregisterInstallationResult()
        {
            IEnumerable<string> installationIds;
            string responseErrorMessage = null;
            if (this.Request.Headers.TryGetValues("X-ZUMO-INSTALLATION-ID", out installationIds))
            {
                var installationId = installationIds.FirstOrDefault();
                try
                {
                    Installation nhInstallation = await this.GetNhClient().GetInstallationAsync(installationId);
                }
                catch (MessagingEntityNotFoundException)
                {
                    return true;
                }
                responseErrorMessage = string.Format("Found deleted Installation with id {0}", installationId);
            }

            HttpResponseMessage msg = new HttpResponseMessage()
            {
                StatusCode = HttpStatusCode.InternalServerError,
                Content = new StringContent(responseErrorMessage)
            };
            throw new HttpResponseException(msg);
        }

        [Route("api/deleteRegistrationsForChannel")]
        public async Task DeleteRegistrationsForChannel(string channelUri)
        {
            await this.GetNhClient().DeleteRegistrationsByChannelAsync(channelUri);
        }

        private NotificationHubClient GetNhClient()
        {
            string notificationHubName = this.Services.Settings.NotificationHubName;
            string notificationHubConnection = this.Services.Settings.Connections[ServiceSettingsKeys.NotificationHubConnectionString].ConnectionString;
            return NotificationHubClient.CreateClientFromConnectionString(notificationHubConnection, notificationHubName);
        }

        private async Task<bool> VerifyTags(string channelUri, string installationId, NotificationHubClient nhClient)
        {
            ServiceUser user = (ServiceUser)this.User;
            int expectedTagsCount = 1;
            if (user.Id != null)
            {
                expectedTagsCount = 2;
            }
            string continuationToken = null;
            do
            {
                CollectionQueryResult<RegistrationDescription> regsForChannel = await nhClient.GetRegistrationsByChannelAsync(channelUri, continuationToken, 100);
                continuationToken = regsForChannel.ContinuationToken;
                foreach (RegistrationDescription reg in regsForChannel)
                {
                    RegistrationDescription registration = await nhClient.GetRegistrationAsync<RegistrationDescription>(reg.RegistrationId);
                    if (registration.Tags == null || registration.Tags.Count() != expectedTagsCount)
                    {
                        return false;
                    }
                    if (!registration.Tags.Contains("$InstallationId:{" + installationId + "}"))
                    {
                        return false;
                    }
                    if (expectedTagsCount > 1 && !registration.Tags.Contains("_UserId:" + user.Id))
                    {
                        return false;
                    }
                }
            } while (continuationToken != null);
            return true;
        }
    }
}
