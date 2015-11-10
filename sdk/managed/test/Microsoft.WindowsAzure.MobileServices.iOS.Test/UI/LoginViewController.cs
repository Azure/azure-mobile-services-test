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

            this.uriEntry = new AccessibleEntryElement(null, "Mobile Service URI", mobileServiceUri, accessibilityId: MobileServiceUriKey);
            this.keyEntry = new AccessibleEntryElement(null, "Mobile Service Key", mobileServiceKey, accessibilityId: MobileServiceKeyKey);
            this.tagsEntry = new AccessibleEntryElement(null, "Tags", tags, accessibilityId: TagsKey);

            this.daylightUriEntry = new AccessibleEntryElement(null, "Daylight URI", daylightUri, accessibilityId: DaylightUriKey);
            this.daylightProjectEntry = new AccessibleEntryElement(null, "Daylight Project", daylightProject, accessibilityId: DaylightProjectKey);
            this.clientIdEntry = new AccessibleEntryElement(null, "Client ID", clientId, accessibilityId: ClientIdKey);
            this.clientSecretEntry = new AccessibleEntryElement(null, "Client Secret", clientSecret, accessibilityId: ClientSecretKey);
            this.runIdEntry = new AccessibleEntryElement(null, "Run Id", runId, accessibilityId: RunIdKey);
            this.runtimeVersionEntry = new AccessibleEntryElement(null, "Runtime version", runtimeVersion, accessibilityId: RuntimeVersionKey);

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
                   new AccessibleStringElement ("Run Tests", RunTests, accessibilityId: "RunTests")                
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
                RuntimeVersion = this.runtimeVersionEntry.Value
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