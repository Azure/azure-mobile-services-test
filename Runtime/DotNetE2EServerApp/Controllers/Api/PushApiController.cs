// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Web.Http;
using Microsoft.Azure.Mobile.Security;
using Microsoft.Azure.Mobile.Server;
using Microsoft.Azure.NotificationHubs;
using Microsoft.Azure.NotificationHubs.Messaging;
using Newtonsoft.Json;
using Microsoft.Azure.Mobile.Security;

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
            IEnumerable<string> installationIds;
            if (this.Request.Headers.TryGetValues("X-ZUMO-INSTALLATION-ID", out installationIds))
            {
                var installationId = installationIds.FirstOrDefault();
                Installation nhInstallation = await this.GetNhHubClient().GetInstallationAsync(installationId);
                string nhTemplates = null;
                string nhSecondaryTiles = null;
                if (nhInstallation.Templates != null)
                {
                    nhTemplates = JsonConvert.SerializeObject(nhInstallation.Templates);
                    nhTemplates = Regex.Replace(nhTemplates, @"\s+", String.Empty);
                }
                if (nhInstallation.SecondaryTiles != null)
                {
                    nhSecondaryTiles = JsonConvert.SerializeObject(nhInstallation.SecondaryTiles);
                    nhSecondaryTiles = Regex.Replace(nhSecondaryTiles, @"\s+", String.Empty);
                }
                if (String.Compare(nhInstallation.PushChannel, channelUri, true) != 0)
                {
                    this.Services.Log.Error(string.Format("ChannelUri did not match. Expected {0} Found {1}", channelUri, nhInstallation.PushChannel));
                    return false;
                }
                if (String.Compare(templates, nhTemplates, true) != 0)
                {
                    this.Services.Log.Error(string.Format("Templates did not match. Expected {0} Found {1}", templates, nhTemplates));
                    return false;
                }
                if (String.Compare(secondaryTiles, nhSecondaryTiles, true) != 0)
                {
                    this.Services.Log.Error(string.Format("SecondaryTiles did not match. Expected {0} Found {1}", secondaryTiles, nhSecondaryTiles));
                    return false;
                }
                if (nhInstallation.Tags.Count() != 1)
                {
                    this.Services.Log.Error(string.Format("Expected tags count {0} but found {1}", 1, nhInstallation.Tags.Count()));
                    return false;
                }
                if (!nhInstallation.Tags.FirstOrDefault().ToString().Contains("$InstallationId:{" + installationId + "}"))
                {
                    this.Services.Log.Error("Did not find installationId tag");
                    return false;
                }

                return true;
            }

            return false;
        }

        [Route("api/verifyUnregisterInstallationResult")]
        public async Task<bool> GetVerifyUnregisterInstallationResult()
        {
            IEnumerable<string> installationIds;
            if (this.Request.Headers.TryGetValues("X-ZUMO-INSTALLATION-ID", out installationIds))
            {
                var installationId = installationIds.FirstOrDefault();
                try
                {
                    Installation nhInstallation = await this.GetNhHubClient().GetInstallationAsync(installationId);
                }
                catch (MessagingEntityNotFoundException ex)
                {
                    return true;
                }
                this.Services.Log.Error(string.Format("Found deleted Installation with id {0}", installationId));
            }
            return false;
        }

        private NotificationHubClient GetNhHubClient()
        {
            string connString = null;
            string hubName = null;
            if (!this.Services.Settings.TryGetValue("MS_NotificationHubConnectionString", out connString) || !this.Services.Settings.TryGetValue("MS_NotificationHubName", out hubName))
            {
                throw new Exception("Invalid NH settings");
            }
            return NotificationHubClient.CreateClientFromConnectionString(connString, hubName);
        }
    }
}
