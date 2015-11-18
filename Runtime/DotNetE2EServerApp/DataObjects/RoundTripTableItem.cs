// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

using System;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.Azure.Mobile.Server;
using Microsoft.Azure.Mobile.Server.Tables;
using ZumoE2EServerApp.Utils;
using Newtonsoft.Json;

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

    public class IntIdRoundTripTableItemDto : ITableData
    {
        public string Name { get; set; }

        public DateTimeOffset? Date1 { get; set; }

        public bool? Bool { get; set; }

        public int? Integer { get; set; }

        public double? Number { get; set; }

        public string Id { get; set; }

        [NotMapped]
        [JsonIgnore]
        public bool Deleted { get; set; }

        [NotMapped]
        [JsonIgnore]
        public DateTimeOffset? UpdatedAt { get; set; }

        [NotMapped]
        [JsonIgnore]
        public DateTimeOffset? CreatedAt { get; set; }

        [NotMapped]
        [JsonIgnore]
        public Byte[] Version { get; set; }
    }

    public class StringIdRoundTripTableSoftDeleteItem : RoundTripTableItem 
    {
    }
}
