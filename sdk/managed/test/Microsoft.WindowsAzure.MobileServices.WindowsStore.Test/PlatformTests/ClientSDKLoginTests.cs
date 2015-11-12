// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

using System;
using System.Net;
using System.Threading.Tasks;
using Microsoft.WindowsAzure.MobileServices.TestFramework;
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
                LiveAuthClient liveAuthClient = new LiveAuthClient(GetClient().MobileAppUri.ToString());
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

        [AsyncTestMethod]
        /// <summary>
        /// Tests login endpoint when alternate login host is set.
        /// </summary>
        private async Task AlternateHostLoginTest()
        {
            MobileServiceClient mobileServiceClient = GetClient();
            string expectedRequestUri = "";
            string alternateLoginHost = "https://login.live.com";
            string defaultLoginPrefix = "/.auth/login";

            try
            {
                mobileServiceClient.AlternateLoginHost = new Uri(alternateLoginHost);
                expectedRequestUri = alternateLoginHost + defaultLoginPrefix;
                var result = mobileServiceClient.LoginWithMicrosoftAccountAsync(null);
            }
            catch (MobileServiceInvalidOperationException ex)
            {
                if (!VerifyRequestUri(ex, expectedRequestUri))
                {
                    throw;
                }
            }
            finally
            {
                mobileServiceClient.AlternateLoginHost = null;
            }
        }

        [AsyncTestMethod]
        /// <summary>
        /// Tests login endpoint when loginPrefix is set.
        /// </summary>
        private async Task LoginPrefixTest()
        {
            MobileServiceClient mobileServiceClient = GetClient();
            string expectedRequestUri = "";
            string loginPrefix = "foo/bar";

            try
            {
                expectedRequestUri = mobileServiceClient.MobileAppUri.ToString() + loginPrefix;
                var result = mobileServiceClient.LoginWithMicrosoftAccountAsync(null);
            }
            catch (MobileServiceInvalidOperationException ex)
            {
                if (!VerifyRequestUri(ex, expectedRequestUri))
                {
                    throw;
                }
            }
            finally
            {
                mobileServiceClient.LoginUriPrefix = null;
            }
        }
        private bool VerifyRequestUri(MobileServiceInvalidOperationException ex, string expectedRequestUri)
        {
            string requestUri = ex.Response.RequestMessage.RequestUri.ToString();
            if (ex.Response.StatusCode == HttpStatusCode.NotFound && requestUri == expectedRequestUri)
            {
                Log("Login request routed expected endpoint");
                return true;
            }
            Log(string.Format("Expected request Uri: {0} Acutual request Uri: {1}"),
                expectedRequestUri,
                requestUri);

            return false;
        }
    }
}
