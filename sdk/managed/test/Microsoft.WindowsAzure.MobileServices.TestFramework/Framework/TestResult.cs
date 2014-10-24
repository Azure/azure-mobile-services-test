using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Microsoft.WindowsAzure.MobileServices.TestFramework
{
    /// <summary>
    /// Defines tte test result of an individual test
    /// </summary>
    public class TestResult
    {
        [JsonProperty("adapter")]
        public string Adapter { get; set; }

        [JsonProperty("full_name")]
        public string FullName { get; set; }

        [JsonProperty("name")]
        public string Name { get; set; }

        [JsonProperty("source")]
        public string Source { get; set; }

        [JsonProperty("run_id")]
        public string RunId { get; set; }

        [JsonProperty("outcome")]
        public string Outcome { get; set; }

        [JsonProperty("start_time"), JsonConverter(typeof(DateTimeToWindowsFileTimeConverter))]
        public DateTime StartTime { get; set; }

        [JsonProperty("end_time"), JsonConverter(typeof(DateTimeToWindowsFileTimeConverter))]
        public DateTime EndTime { get; set; }

        [JsonProperty("tags")]
        public List<string> Tags { get; set; }

        [JsonConverter(typeof(TestLogsConverter)), JsonProperty("attachments")]
        public TestLogs Logs { get; set; }

        public TestResult()
        {
            this.Tags = new List<string>();
            this.Adapter = "zumotestsconverter";
        }
    }
}
