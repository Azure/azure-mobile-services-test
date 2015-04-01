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
            "17BA0791499DB908433B80F37C5FBC89B870084B";
        const string BodyTemplate = "{\"first prop\":\"first value\", \"second prop\":\"($message)\"}";
        const string DefaultToastTemplateName = "templateForToastGcm";
        readonly string[] DefaultTags = { "fooGcm", "barGcm" };        

        public string GetPushHandle()
        {
            return DefaultChannelUri;
        }

        public string GetUpdatedPushHandle()
        {
            return DefaultChannelUri.Replace('A', 'B');
        }
    }
}