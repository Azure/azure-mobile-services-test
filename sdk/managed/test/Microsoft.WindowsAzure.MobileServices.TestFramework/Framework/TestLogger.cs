using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Net.Http;
using System.Net.Http.Headers;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System.IO;

namespace Microsoft.WindowsAzure.MobileServices.TestFramework
{
    class TestLogger
    {
        /// <summary>
        /// Create a daylight test run
        /// </summary>
        /// <param name="testRun">TestRun Object that holds all the metadata about test run</param>
        /// <param name="testSettings">TestSettings object that hold all the daylight and Zumo App configuration</param>
        /// <returns>The run id of the newly created test run</returns>
        public static async Task<string> CreateDaylightRun(TestRun testRun, TestSettings testSettings)
        {
            var authHeader = await GetAuthHeader(testSettings);
            if (authHeader == null)
                return String.Empty;
            using (var c = new HttpClient())
            {
                c.DefaultRequestHeaders.Authorization = authHeader;
                JsonSerializerSettings jss = new JsonSerializerSettings();
                jss.DefaultValueHandling = DefaultValueHandling.Ignore;
                string runObj = JsonConvert.SerializeObject(testRun, jss);
                var content = new StringContent(runObj.ToString(), Encoding.UTF8, "application/json");
                var resp = await c.PostAsync(string.Format("{0}/api/{1}/runs", testSettings.Custom["DayLightUrl"], testSettings.Custom["DaylightProject"]), content);
                if (!resp.IsSuccessStatusCode)
                {
                    return String.Empty;
                }

                string respBody = resp.Content.ReadAsStringAsync().Result;
                TestRun newRun = JsonConvert.DeserializeObject<TestRun>(respBody);
                return newRun.RunId;
            }
        }

        /// <summary>
        /// Get Auth token to access daylight
        /// </summary>
        /// <param name="testSettings"> Test Settings object containing client id and client secret</param>
        /// <returns>Auth Header</returns>
        private static async Task<AuthenticationHeaderValue> GetAuthHeader(TestSettings testSettings)
        {
            using (var c = new HttpClient())
            {
                var tokenRequest = new Dictionary<string, string>
                {
                   { "grant_type", "client_credentials" },
                   { "client_id", testSettings.Custom["CliendId"] },
                   { "client_secret", testSettings.Custom["ClientSecret"] },
                };

                var requestAddress = testSettings.Custom["DayLightUrl"] + "/oauth2/token";
                var requestContent = new FormUrlEncodedContent(tokenRequest);
                using (var tokenResponse = await c.PostAsync(requestAddress, requestContent))
                {
                    var tokenContent = await tokenResponse.Content.ReadAsStringAsync();
                    if (!tokenResponse.IsSuccessStatusCode)
                        return null;
                    JObject jo = JObject.Parse(tokenContent);
                    return new AuthenticationHeaderValue(
                        jo["token_type"].ToObject<string>(),
                        jo["access_token"].ToObject<string>());
                }

            }
        }

        /// <summary>
        /// Get the SAS Token for the blob store to which the test result is to be uploaded
        /// </summary>
        /// <param name="testSettings">Test settings with daylight configuration</param>
        /// <returns></returns>
        public static async Task<JObject> GetSaSToken(TestSettings testSettings)
        {
            HttpClient c = new HttpClient();
            var authHeader = await GetAuthHeader(testSettings);
            if (authHeader == null)
                return null;
            c.DefaultRequestHeaders.Authorization = authHeader;
            var sasRequest = new Dictionary<string, string>
            {
                { "grant_type", "urn:daylight:oauth2:shared-access-signature" },
                { "permissions", "rwdl" },
                { "scope", "attachments" }
            };

            var requestAddress = testSettings.Custom["DayLightUrl"] + "/api/" + testSettings.Custom["DaylightProject"] + "/storageaccounts/token";
            var requestContent = new FormUrlEncodedContent(sasRequest);

            using (var sasResponse = await c.PostAsync(requestAddress, requestContent))
            {
                if (!sasResponse.IsSuccessStatusCode)
                    return null;
                var tokenContent = await sasResponse.Content.ReadAsStringAsync();
                JObject jo = JObject.Parse(tokenContent);
                return jo;
            }
        }

        /// <summary>
        /// Post test result collection to daylight
        /// </summary>
        /// <param name="testResults">Test result collection to be posted</param>
        /// <param name="testSettings">Test settings with daylight configuration</param>
        /// <returns>True if result uploaded successfully, otherwise false </returns>
        public static async Task<bool> PostTestResults(List<TestResult> testResults, TestSettings testSettings)
        {
            var authHeader = await GetAuthHeader(testSettings);
            if (authHeader == null)
                return false;
            using (var c = new HttpClient())
            {
                c.DefaultRequestHeaders.Authorization = authHeader;
                string testsObj = JsonConvert.SerializeObject(testResults);
                var content = new StringContent(testsObj, Encoding.UTF8, "application/json");
                var resp = await c.PostAsync(string.Format("{0}/api/{1}/results", testSettings.Custom["DayLightUrl"], testSettings.Custom["DaylightProject"]), content);
                return resp.IsSuccessStatusCode;
            }
        }

        /// <summary>
        /// Upload the test log to the test blob store 
        /// </summary>
        /// <param name="testResult">Test result object that contains the test log </param>
        /// <param name="sasResponseContent">Sas response object containing access token for blob store</param>
        /// <returns>True if log uploaded successfully, otherwise false</returns>
        public static async Task<bool> UploadTestLog(TestLogs logs, JObject sasResponseContent)
        {
            string accessToken = sasResponseContent["access_token"].ToObject<string>();
            string containerUri = sasResponseContent["container_uri"].ToObject<string>();
            Uri blobHostUri = new Uri(containerUri);


            HttpClient c = new HttpClient();
            string hash = logs.LogHash;
            var blobRequestUri = containerUri + "/" + hash + "?" + accessToken;
            c.DefaultRequestHeaders.Add("x-ms-blob-type", "BlockBlob");
            c.DefaultRequestHeaders.Add("Host", blobHostUri.Host);


            ByteArrayContent byteContent = new ByteArrayContent(Encoding.UTF8.GetBytes(logs.LogLines));

            using (var blobResponse = await c.PutAsync(blobRequestUri, byteContent))
            {
                return blobResponse.IsSuccessStatusCode;
            }
        }
    }
}