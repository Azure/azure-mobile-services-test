using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;

namespace Microsoft.WindowsAzure.MobileServices.TestFramework
{
    public class MasterTestResult
    {
        [JsonProperty("outcome")]
        public string Outcome { get; set; }

        [JsonProperty("total_count")]
        public int TotalCount { get; set; }

        [JsonProperty("passed")]
        public int Passed { get; set; }

        [JsonProperty("failed")]
        public int Failed { get; set; }

        [JsonProperty("skipped")]
        public int Skipped { get; set; }

        [JsonProperty("start_time"), JsonConverter(typeof(DateTimeToWindowsFileTimeConverter))]
        public DateTime StartTime { get; set; }

        [JsonProperty("end_time"), JsonConverter(typeof(DateTimeToWindowsFileTimeConverter))]
        public DateTime EndTime { get; set; }

        [JsonProperty("reference_url")]
        public string ReferenceUrl { get; set; }
    }
}
