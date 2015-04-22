// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

using Microsoft.WindowsAzure.Mobile.Service;
using System;
using System.Collections.Generic;
using ZumoE2EServerApp.Utils;

namespace ZumoE2EServerApp.DataObjects
{
    public class RoundTripTableItem : EntityData
    {
        public string Name { get; set; }

        public DateTimeOffset? Date1 { get; set; }

        public bool? Bool { get; set; }

        public int? Integer { get; set; }

        public double? Number { get; set; }
    }

    public class IntIdRoundTripTableItem : IInt64IdTable
    {
        public long Id { get; set; }

        public string Name { get; set; }

        public DateTimeOffset? Date1 { get; set; }

        public bool? Bool { get; set; }

        public int? Integer { get; set; }

        public double? Number { get; set; }
    }

    public class IntIdRoundTripTableItemDto : EntityData
    {
        public string Name { get; set; }

        public DateTimeOffset? Date1 { get; set; }

        public bool? Bool { get; set; }

        public int? Integer { get; set; }

        public double? Number { get; set; }
    }

    public class StringIdRoundTripTableSoftDeleteItem : RoundTripTableItem 
    {
    }
}
