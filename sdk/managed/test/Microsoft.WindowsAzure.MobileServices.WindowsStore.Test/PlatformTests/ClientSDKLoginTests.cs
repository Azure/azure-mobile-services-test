using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Threading.Tasks;
using Microsoft.WindowsAzure.MobileServices.TestFramework;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Microsoft.WindowsAzure.MobileServices;
using System.Net.Http;
using System.Text;
using System.Globalization;
using Microsoft.Live;

namespace Microsoft.WindowsAzure.MobileServices.Test
{
    [Tag("ClientSDKLoginTests")]
    public class ClientSDKLoginTests : FunctionalTestBase
    {
        [AsyncTestMethod]
        /// <summary>
        /// Tests logging into MobileService with Live SDK token. App needs to be assosciated with a WindowsStoreApp
        /// </summary>
        private async Task TestLiveSDKLogin()
        {
            try
            {
                LiveAuthClient liveAuthClient = new LiveAuthClient(GetClient().ApplicationUri.ToString());
                LiveLoginResult result = await liveAuthClient.InitializeAsync(new string[] { "wl.basic", "wl.offline_access", "wl.signin" });
                if (result.Status != LiveConnectSessionStatus.Connected)
                {
                    result = await liveAuthClient.LoginAsync(new string[] { "wl.basic", "wl.offline_access", "wl.signin" });
                }
                if (result.Status == LiveConnectSessionStatus.Connected)
                {
                    LiveConnectSession session = result.Session;
                    LiveConnectClient client = new LiveConnectClient(result.Session);
                    LiveOperationResult meResult = await client.GetAsync("me");
                    MobileServiceUser loginResult = await GetClient().LoginWithMicrosoftAccountAsync(result.Session.AuthenticationToken);

                    Log(string.Format("{0} is now logged into MobileService with userId - {1}", meResult.Result["first_name"], loginResult.UserId));
                }
            }
            catch (Exception exception)
            {
                Log(string.Format("ExceptionType: {0} Message: {1} StackTrace: {2}",
                                                exception.GetType().ToString(),
                                                exception.Message,
                                                exception.StackTrace));
                Assert.Fail("Log in with Live SDK failed");
            }
        }
    }
}
