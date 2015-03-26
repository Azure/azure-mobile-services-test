// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

using Microsoft.WindowsAzure.MobileServices.TestFramework;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Microsoft.WindowsAzure.MobileServices.Test
{
    class PushTestUtility : IPushTestUtility
    {
        private const string DefaultChannelUri =
            "https://bn1.notify.windows.com/?token=AgYAAADs42685sa5PFCEy82eYpuG8WCPB098AWHnwR8kNRQLwUwf%2f9p%2fy0r82m4hxrLSQ%2bfl5aNlSk99E4jrhEatfsWgyutFzqQxHcLk0Xun3mufO2G%2fb2b%2ftjQjCjVcBESjWvY%3d";
        const string BodyTemplate = "<toast><visual><binding template=\"ToastText01\"><text id=\"1\">$(message)</text></binding></visual></toast>";
        const string DefaultToastTemplateName = "templateForToastWns";
        readonly string[] DefaultTags = { "fooWns", "barWns" };
        readonly ReadOnlyDictionary<string, string> DefaultHeaders = new ReadOnlyDictionary<string, string>(new Dictionary<string, string> { { "x-wns-ttl", "100000" } });
        readonly ReadOnlyDictionary<string, string> DetectedHeaders = new ReadOnlyDictionary<string, string>(new Dictionary<string, string> { { "x-wns-type", "wns/toast" } });

        public string GetPushHandle()
        {
            return DefaultChannelUri;
        }

        public string GetUpdatedPushHandle()
        {
            return DefaultChannelUri.Replace('A', 'B');
        }

        public string GetListNativeRegistrationResponse()
        {
            return "[{\"registrationId\":\"7313155627197174428-6522078074300559092-1\",\"tags\":[\"fooWns\",\"barWns\",\"4de2605e-fd09-4875-a897-c8c4c0a51682\"],\"deviceId\":\"http://channelUri.com/a b\"}]";
        }

        public string GetListTemplateRegistrationResponse()
        {
            return "[{\"registrationId\":\"7313155627197174428-6522078074300559092-1\",\"tags\":[\"fooWns\",\"barWns\",\"4de2605e-fd09-4875-a897-c8c4c0a51682\"],\"deviceId\":\"http://channelUri.com/a b\",\"templateBody\":\"cool template body\",\"templateName\":\"cool name\"}]";
        }

        public string GetListMixedRegistrationResponse()
        {
            return "[{\"registrationId\":\"7313155627197174428-6522078074300559092-1\",\"tags\":[\"fooWns\",\"barWns\",\"4de2605e-fd09-4875-a897-c8c4c0a51682\"],\"deviceId\":\"http://channelUri.com/a b\"}, " +
            "{\"registrationId\":\"7313155627197174428-6522078074300559092-1\",\"tags\":[\"fooWns\",\"barWns\",\"4de2605e-fd09-4875-a897-c8c4c0a51682\"],\"deviceId\":\"http://channelUri.com/a b\",\"templateBody\":\"cool template body\",\"templateName\":\"cool name\"}]";
        }
    }
}