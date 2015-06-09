// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

using Microsoft.WindowsAzure.Mobile.Service;
using System;

namespace ZumoE2EServerApp.DataObjects
{
    public class Dates : EntityData
    {
        public DateTime Date { get; set; }
        public DateTimeOffset DateOffset { get; set; }
    }
}
