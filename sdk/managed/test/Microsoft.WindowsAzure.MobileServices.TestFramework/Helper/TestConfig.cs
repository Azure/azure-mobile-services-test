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

        [JsonProperty("storageUrl")]
        public string TestFrameworkStorageContainerUrl { get; set; }

        [JsonProperty("storageSasToken")]
        public string TestFrameworkStorageContainerSasToken { get; set; }

        [JsonProperty("runTimeVersion")]
        public string RuntimeVersion { get; set; }

        [JsonProperty("tags")]
        public string TagExpression { get; set; }
    }
}
