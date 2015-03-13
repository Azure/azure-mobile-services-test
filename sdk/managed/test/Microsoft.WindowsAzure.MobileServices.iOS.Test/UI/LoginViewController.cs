using Microsoft.WindowsAzure.MobileServices;
using Microsoft.WindowsAzure.MobileServices.TestFramework;
using MonoTouch.Dialog;
using Foundation;
using UIKit;

namespace Microsoft.WindowsAzure.Mobile.iOS.Test
{
    class LoginViewController
        : DialogViewController
    {
        public LoginViewController()
            : base(UITableViewStyle.Grouped, null)
        {
            var defaults = NSUserDefaults.StandardUserDefaults;
            string mobileServiceUri = defaults.StringForKey(MobileServiceUriKey);
            string mobileServiceKey = defaults.StringForKey(MobileServiceKeyKey);
            string tags = defaults.StringForKey(TagsKey);
            string daylightUri = defaults.StringForKey(DaylightUriKey);
            string daylightProject = defaults.StringForKey(DaylightProjectKey);
            string clientId = defaults.StringForKey(ClientIdKey);
            string clientSecret = defaults.StringForKey(ClientSecretKey);
            string runId = defaults.StringForKey(RunIdKey);
            string runtimeVersion = defaults.StringForKey(RuntimeVersionKey);

            this.uriEntry = new EntryElement(null, "Mobile Service URI", mobileServiceUri);
            this.keyEntry = new EntryElement(null, "Mobile Service Key", mobileServiceKey);
            this.tagsEntry = new EntryElement(null, "Tags", tags);

            this.daylightUriEntry = new EntryElement(null, "Daylight URI", daylightUri);
            this.daylightProjectEntry = new EntryElement(null, "Daylight Project", daylightProject);
            this.clientIdEntry = new EntryElement(null, "Client ID", clientId);
            this.clientSecretEntry = new EntryElement(null, "Client Secret", clientSecret);
            this.runIdEntry = new EntryElement(null, "Run Id", runId);
            this.runtimeVersionEntry = new EntryElement(null, "Runtime version", runtimeVersion);

            Root = new RootElement("C# Client Library Tests") {
                new Section("Login") {
                    this.uriEntry,
                    this.keyEntry,
                    this.tagsEntry
                },

                new Section("Report Results"){
                    this.daylightUriEntry,
                    this.daylightProjectEntry,
                    this.clientIdEntry,
                    this.clientSecretEntry,
                    this.runIdEntry,
                    this.runtimeVersionEntry
                },

                new Section {
                    new StringElement ("Run Tests", RunTests)
                },

                new Section{
                    new StringElement("Login with Microsoft", () => Login(MobileServiceAuthenticationProvider.MicrosoftAccount)),
                    new StringElement("Login with Facebook", () => Login(MobileServiceAuthenticationProvider.Facebook)),
                    new StringElement("Login with Twitter", () => Login(MobileServiceAuthenticationProvider.Twitter)),
                    new StringElement("Login with Google", () => Login(MobileServiceAuthenticationProvider.Google))
                }
            };
        }

        private const string MobileServiceUriKey = "MobileServiceUri";
        private const string MobileServiceKeyKey = "MobileServiceKey";
        private const string TagsKey = "Tags";
        private const string DaylightUriKey = "DaylightUri";
        private const string DaylightProjectKey = "DaylightProject";
        private const string ClientIdKey = "ClientId";
        private const string ClientSecretKey = "ClientSecret";
        private const string RunIdKey = "RunId";
        private const string RuntimeVersionKey = "RuntimeVersion";

        private readonly EntryElement uriEntry;
        private readonly EntryElement keyEntry;
        private readonly EntryElement tagsEntry;
        private readonly EntryElement daylightUriEntry;
        private readonly EntryElement daylightProjectEntry;
        private readonly EntryElement clientIdEntry;
        private readonly EntryElement clientSecretEntry;
        private readonly EntryElement runIdEntry;
        private readonly EntryElement runtimeVersionEntry;

        private void RunTests()
        {
            var defaults = NSUserDefaults.StandardUserDefaults;
            defaults.SetString(this.uriEntry.Value, MobileServiceUriKey);
            defaults.SetString(this.keyEntry.Value, MobileServiceKeyKey);
            defaults.SetString(this.tagsEntry.Value, TagsKey);
            defaults.SetString(this.daylightUriEntry.Value, DaylightUriKey);
            defaults.SetString(this.daylightProjectEntry.Value, DaylightProjectKey);
            defaults.SetString(this.clientIdEntry.Value, ClientIdKey);
            defaults.SetString(this.clientSecretEntry.Value, ClientSecretKey);
            defaults.SetString(this.runIdEntry.Value, RunIdKey);
            defaults.SetString(this.runtimeVersionEntry.Value, RuntimeVersionKey);

            AppDelegate.Harness.SetAutoConfig(new TestConfig()
            {
                MobileServiceRuntimeUrl = this.uriEntry.Value,
                MobileServiceRuntimeKey = this.keyEntry.Value,
                TagExpression = this.tagsEntry.Value,
                MasterRunId = this.runIdEntry.Value,
                DayLightUrl = this.daylightUriEntry.Value,
                DaylightProject = this.daylightProjectEntry.Value,
                CliendId = this.clientIdEntry.Value,
                ClientSecret = this.clientSecretEntry.Value,
                RuntimeVersion = this.runtimeVersionEntry.Value,
            });
            AppDelegate.Harness.Settings.ManualMode =
                string.IsNullOrWhiteSpace(this.daylightUriEntry.Value) ||
                string.IsNullOrWhiteSpace(this.daylightProjectEntry.Value) ||
                string.IsNullOrWhiteSpace(this.clientIdEntry.Value) ||
                string.IsNullOrWhiteSpace(this.clientSecretEntry.Value) ||
                string.IsNullOrWhiteSpace(this.runtimeVersionEntry.Value);

            if (!string.IsNullOrEmpty(AppDelegate.Harness.Settings.TagExpression))
            {
                AppDelegate.Harness.Settings.TagExpression += " - notXamarin - notXamarin_iOS";
            }
            else
            {
                AppDelegate.Harness.Settings.TagExpression = "!notXamarin - notXamarin_iOS";
            }

            NavigationController.PushViewController(new HarnessViewController(), true);
        }

        private async void Login(MobileServiceAuthenticationProvider provider)
        {
            var client = new MobileServiceClient(this.uriEntry.Value, this.keyEntry.Value);
            var user = await client.LoginAsync(this, provider);
            var alert = new UIAlertView("Welcome", "Your userId is: " + user.UserId, null, "OK");
            alert.Show();
        }
    }
}