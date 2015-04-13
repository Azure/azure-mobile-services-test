// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

using Foundation;
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
        private const string DefaultDeviceToken =
            "<f6e7cd2 80fc5b5 d488f8394baf216506bc1bba 864d5b483d>";
        const string BodyTemplate = "{\"aps\": {\"alert\":\"boo!\"}, \"extraprop\":\"($message)\"}";
        const string DefaultToastTemplateName = "templateForToastApns";
        readonly string[] DefaultTags = { "fooApns", "barApns" };        

        public string GetPushHandle()
        {
            return DefaultDeviceToken;
        }
    }
}