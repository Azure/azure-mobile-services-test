using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace Microsoft.WindowsAzure.MobileServices.TestFramework
{
    /// <summary>
    /// Defines the log for an individual test
    /// </summary>
    public class TestLogs
    {
        public string LogLines { get; set; }
        public string LogHash { get; set; }

        public TestLogs()
        {
        }
    }

    public class TestLogsConverter : JsonConverter
    {
        public override bool CanConvert(Type objectType)
        {
            return typeof(TestLogs) == objectType;
        }

        public override object ReadJson(JsonReader reader, Type objectType, object existingValue, JsonSerializer serializer)
        {
            return null; // unused
        }

        public override void WriteJson(JsonWriter writer, object value, JsonSerializer serializer)
        {
            string hash = ((TestLogs)value).LogHash;
            if (!string.IsNullOrEmpty(hash))
            {
                Dictionary<string, string> dic = new Dictionary<string, string> { { "log.txt", hash } };
                serializer.Serialize(writer, dic);
            }
        }
    }
}
