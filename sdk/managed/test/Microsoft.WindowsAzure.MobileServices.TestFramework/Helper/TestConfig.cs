using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;

namespace Microsoft.WindowsAzure.MobileServices.TestFramework
{
    public class TestConfig
    {
        [JsonProperty("mobileAppUrl")]
        public string MobileServiceRuntimeUrl { get; set; }

        [JsonProperty("mobileAppKey")]
        public string MobileServiceRuntimeKey { get; set; }

        [JsonProperty("runId")]
        public string MasterRunId { get; set; }

        [JsonProperty("runTimeVersion")]
        public string RuntimeVersion { get; set; }

        [JsonProperty("clientId")]
        public string CliendId { get; set; }

        [JsonProperty("clientSecret")]
        public string ClientSecret { get; set; }

        [JsonProperty("dayLightUrl")]
        public string DayLightUrl { get; set; }

        [JsonProperty("dayLightProject")]
        public string DaylightProject { get; set; }

        [JsonProperty("tags")]
        public string TagExpression { get; set; }
    }
}
