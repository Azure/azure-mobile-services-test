using System;
using System.Threading.Tasks;
using Android.App;
using Android.Content;
using Android.OS;
using Android.Preferences;
using Android.Widget;
using Microsoft.WindowsAzure.MobileServices;
using Microsoft.WindowsAzure.MobileServices.TestFramework;

namespace Microsoft.WindowsAzure.Mobile.Android.Test
{
    [Activity(Label = "Microsoft.WindowsAzure.Mobile.Android.Test", MainLauncher = true, Icon = "@drawable/icon")]
    public class LoginActivity : Activity
    {
        static class Keys
        {
            public const string MobileServiceUri = "MobileServiceUri";
            public const string TagExpression = "TagExpression";

            public const string AutoStart = "AutoStart";
            public const string MasterRunId = "MasterRunId";
            public const string RuntimeVersion = "RuntimeVersion";
            public const string CliendId = "CliendId";
            public const string ClientSecret = "ClientSecret";
            public const string DayLightUrl = "DayLightUrl";
            public const string DaylightProject = "DaylightProject";
        }

        private EditText uriText, keyText, tagsText;

        protected override void OnCreate(Bundle bundle)
        {
            base.OnCreate(bundle);
            SetContentView(Resource.Layout.Login);
            ISharedPreferences prefs = PreferenceManager.GetDefaultSharedPreferences(this);

            this.uriText = FindViewById<EditText>(Resource.Id.ServiceUri);
            this.tagsText = FindViewById<EditText>(Resource.Id.ServiceTags);

            this.uriText.Text = prefs.GetString(Keys.MobileServiceUri, null);
            this.tagsText.Text = prefs.GetString(Keys.TagExpression, null);

            FindViewById<Button>(Resource.Id.RunTests).Click += OnClickRunTests;
            FindViewById<Button>(Resource.Id.Login).Click += OnClickLogin;

            string autoStart = ReadSettingFromIntentOrDefault(Keys.AutoStart, "false");
            if (autoStart != null && autoStart.ToLower() == "true")
            {
                TestConfig config = new TestConfig
                {
                    MobileServiceRuntimeUrl = ReadSettingFromIntentOrDefault(Keys.MobileServiceUri),
                    MasterRunId = ReadSettingFromIntentOrDefault(Keys.MasterRunId),
                    RuntimeVersion = ReadSettingFromIntentOrDefault(Keys.RuntimeVersion),
                    CliendId = ReadSettingFromIntentOrDefault(Keys.CliendId),
                    ClientSecret = ReadSettingFromIntentOrDefault(Keys.ClientSecret),
                    DayLightUrl = ReadSettingFromIntentOrDefault(Keys.DayLightUrl),
                    DaylightProject = ReadSettingFromIntentOrDefault(Keys.DaylightProject),
                    TagExpression = ReadSettingFromIntentOrDefault(Keys.TagExpression)
                };
                App.Harness.SetAutoConfig(config);
                RunTests();
            }
        }

        private string ReadSettingFromIntentOrDefault(string key, string defaultValue = null)
        {
            string fromIntent = Intent.GetStringExtra(key);
            if (!string.IsNullOrWhiteSpace(fromIntent))
            {
                return fromIntent;
            }
            return defaultValue;
        }

        private void OnClickRunTests(object sender, EventArgs eventArgs)
        {
            using (ISharedPreferences prefs = PreferenceManager.GetDefaultSharedPreferences(this))
            using (ISharedPreferencesEditor editor = prefs.Edit())
            {
                editor.PutString(Keys.MobileServiceUri, this.uriText.Text);
                editor.PutString(Keys.TagExpression, this.tagsText.Text);

                editor.Commit();
            }

            App.Harness.Settings.Custom["MobileServiceRuntimeUrl"] = this.uriText.Text;
            App.Harness.Settings.TagExpression = this.tagsText.Text;

            if (!string.IsNullOrEmpty(App.Harness.Settings.TagExpression))
            {
                App.Harness.Settings.TagExpression += " - notXamarin";
            }
            else
            {
                App.Harness.Settings.TagExpression = "!notXamarin";
            }

            RunTests();
        }

        private void RunTests()
        {
            Task.Factory.StartNew(App.Harness.RunAsync);

            Intent intent = new Intent(this, typeof(HarnessActivity));
            StartActivity(intent);
        }

        private async void OnClickLogin(object sender, EventArgs eventArgs)
        {
            var client = new MobileServiceClient(this.uriText.Text);
            var user = await client.LoginAsync(this, MobileServiceAuthenticationProvider.MicrosoftAccount);
            System.Diagnostics.Debug.WriteLine(user.UserId);
        }
    }
}