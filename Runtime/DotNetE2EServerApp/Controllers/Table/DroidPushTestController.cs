using Microsoft.ServiceBus.Notifications;
using Microsoft.WindowsAzure.Mobile.Service;
using Microsoft.WindowsAzure.Mobile.Service.Notifications;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using System.Web.Http;
using ZumoE2EServerApp.DataObjects;

namespace ZumoE2EServerApp.Controllers.Table
{
    public class DroidPushTestController : TableController<W8PushTestEntity>
    {
        public async Task<NotificationOutcome> PostDroidPushTestEntity(DroidPushTestEntity item)
        {
            IPushMessage message = null;
            string tag = item.Tag;

            if (item.TemplatePush.GetValueOrDefault())
            {
                message = item.TemplateNotification.ToObject<TemplatePushMessage>();
            }
            else
            {
                var googleMessage = new GooglePushMessage();

                googleMessage.JsonPayload = item.Payload.ToString();

                message = googleMessage;
            }

            if (tag == null)
            {
                tag = "";
            }

            NotificationOutcome pushResponse = await this.Services.Push.SendAsync(message, tag);

            this.Services.Log.Info("GCM push sent: " + pushResponse, this.Request);

            return pushResponse;
        }
    }
}
