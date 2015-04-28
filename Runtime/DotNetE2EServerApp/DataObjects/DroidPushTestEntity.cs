using Microsoft.WindowsAzure.Mobile.Service;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace ZumoE2EServerApp.DataObjects
{
    public class DroidPushTestEntity : EntityData
    {
        public string Method { get; set; }
        public string Tag { get; set; }
        public string Data { get; set; }
        public JObject Payload { get; set; }
        public bool UsingNH { get; set; }
        public bool? TemplatePush { get; set; }
        public JObject TemplateNotification { get; set; }
    }
}