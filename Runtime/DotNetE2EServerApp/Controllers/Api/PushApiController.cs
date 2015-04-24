// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

using Microsoft.WindowsAzure.Mobile.Service.Security;
using Newtonsoft.Json.Linq;
using System.Net.Http;
using System.Threading.Tasks;
using System.Web.Http;
using Microsoft.WindowsAzure.Mobile.Service;
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
                var payload = (JObject) data["payload"];
                var type = (string) data["type"];

                if (payload == null || token == null)
                {
                    return new HttpResponseMessage(System.Net.HttpStatusCode.BadRequest);
                }

                if (type == "template") {
                    TemplatePushMessage message = new TemplatePushMessage();
                    var keys = payload.Properties();
                    foreach (JProperty key in keys) {
                        Services.Log.Info("Key: " + key.Name);
                        message.Add(key.Name, (string) key.Value);
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
    }
}
