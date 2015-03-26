// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

using System.Collections.Generic;

namespace Microsoft.WindowsAzure.MobileServices
{
    /// <summary>
    /// An interface for platform-specific assemblies to provide utility functions
    /// regarding Push capabilities.
    /// </summary>
    public interface IPushTestUtility
    {
        string GetPushHandle();

        string GetUpdatedPushHandle();        

        string GetListNativeRegistrationResponse();

        string GetListTemplateRegistrationResponse();

        string GetListMixedRegistrationResponse();
    }
}
