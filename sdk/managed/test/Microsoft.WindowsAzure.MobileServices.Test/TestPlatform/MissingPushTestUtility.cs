﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Microsoft.WindowsAzure.MobileServices.Test
{
    class MissingPushTestUtility : IPushTestUtility
    {
        public string GetPushHandle()
        {
            throw new NotImplementedException();
        }

        public string GetUpdatedPushHandle()
        {
            throw new NotImplementedException();
        }

        public string GetListNativeRegistrationResponse()
        {
            throw new NotImplementedException();
        }

        public string GetListTemplateRegistrationResponse()
        {
            throw new NotImplementedException();
        }

        public string GetListMixedRegistrationResponse()
        {
            throw new NotImplementedException();
        }
    }
}
