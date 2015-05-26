// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

using Microsoft.WindowsAzure.Mobile.Service.Security;
using Newtonsoft.Json.Linq;
using System.Net.Http;
using System.Threading.Tasks;
using System.Web.Http;
using ZumoE2EServerApp.Utils;
using Microsoft.WindowsAzure.Mobile.Service;
using System;
using Newtonsoft.Json;

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
            var method = (string) data["method"];

            if (method == null)
            {
                return new HttpResponseMessage(System.Net.HttpStatusCode.BadRequest);
            }

            if (method == "send")
            {
                var serialize = new JsonSerializer();

                var token = (string)data["token"];
                var payloadString = (string)data["payload"];
                var type = (string)data["type"];
                var pushType = (string)data["pushType"];
                var tag = (string)data["tag"];

                if (payloadString == null || token == null)
                {
                    return new HttpResponseMessage(System.Net.HttpStatusCode.BadRequest);
                }

                Services.Log.Info(payloadString);

                if (type == "template") {
                    TemplatePushMessage message = new TemplatePushMessage();
                    var payload = JObject.Parse(payloadString);
                    var keys = payload.Properties();
                    foreach (JProperty key in keys) {
                        Services.Log.Info("Key: " + key.Name);
                        message.Add(key.Name, (string) key.Value);
                    }
                    var result = await Services.Push.SendAsync(message, tag);
                }
                else if (type == "gcm")
                {
                    GooglePushMessage message = new GooglePushMessage();
                    message.JsonPayload = payloadString;
                    var result = await Services.Push.SendAsync(message);
                }
                else if (type == "apns")
                {
                    ApplePushMessage message = new ApplePushMessage();
                    message.JsonPayload = payloadString;
                    var result = await Services.Push.SendAsync(message);
                }
                else if (type == "wns")
                {
                    WindowsPushMessage message = new WindowsPushMessage();
                    message.XmlPayload = payloadString;
                    message.Headers.Add("X-WNS-Type", type + '/' + pushType);
                    var result = await Services.Push.SendAsync(message, tag);
                }
            }
            else 
            {
                return new HttpResponseMessage(System.Net.HttpStatusCode.BadRequest);
            }

            return new HttpResponseMessage(System.Net.HttpStatusCode.OK);
        }
    }
}
