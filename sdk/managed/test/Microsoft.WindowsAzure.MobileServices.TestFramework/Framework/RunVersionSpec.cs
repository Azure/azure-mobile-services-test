using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Microsoft.WindowsAzure.MobileServices.TestFramework
{
    /// <summary>
    /// Defines the metadata tio uniquely identify each project version for daylight naming purpose
    /// </summary>
    public class RunVersionSpec
    {
        [JsonProperty("project_name")]
        public string ProjectName { get; set; }
        [JsonProperty("branch_name")]
        public string BranchName { get; set; }
        [JsonProperty("revision")]
        public string Revision { get; set; }

        public RunVersionSpec()
        {
            this.ProjectName = "zumo2";
            this.BranchName = "_Release";
            this.Revision = DateTime.UtcNow.ToString("yyyyMMdd-HHmmss", CultureInfo.InvariantCulture);
        }
    }
}
