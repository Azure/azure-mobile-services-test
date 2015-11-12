// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

using System;
using System.Collections.ObjectModel;
using System.Globalization;
using System.IO;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using Microsoft.Phone.Controls;
using Microsoft.WindowsAzure.MobileServices.TestFramework;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace Microsoft.WindowsAzure.MobileServices.Test
{
    public partial class MainPage : PhoneApplicationPage, ITestReporter
    {
        private ObservableCollection<GroupDescription> _groups;
        private GroupDescription _currentGroup = null;
        private TestDescription _currentTest = null;

        // Constructor
        public MainPage()
        {
            InitializeComponent();
            this.Loaded += MainPage_Loaded;
        }

        void MainPage_Loaded(object sender, RoutedEventArgs e)
        {
            // Setup the groups data source
            _groups = new ObservableCollection<GroupDescription>();
            unitTests.ItemsSource = _groups;

            var configString = ReadFile(@"TestInput\input.txt");
            txtRuntimeUri.Text = ""; // Set the default URI here
            txtTags.Text = ""; // Set the default tags here

            if (!String.IsNullOrEmpty(configString))
            {
                TestConfig config = JsonConvert.DeserializeObject<TestConfig>(configString);
                App.Harness.SetAutoConfig(config);
                txtRuntimeUri.Text = App.Harness.Settings.Custom["MobileServiceRuntimeUrl"];
                txtTags.Text = App.Harness.Settings.TagExpression; // Set the default tags here    
                ExecuteUnitTests(null, null);
            }
        }


        public static string ReadFile(string filePath)
        {
            var resrouceStream = Application.GetResourceStream(new Uri(filePath, UriKind.Relative));
            if (resrouceStream == null) return "";

            var myFileStream = resrouceStream.Stream;
            if (!myFileStream.CanRead) return "";

            var myStreamReader = new StreamReader(myFileStream);
            return myStreamReader.ReadToEnd();
        }


        private void ExecuteLoginTests(object sender, RoutedEventArgs e)
        {
            // Get the test settings from the UI
            App.Harness.Settings.Custom["MobileServiceRuntimeUrl"] = txtRuntimeUri.Text;

            // Hide Test Settings UI
            testSettings.Visibility = Visibility.Collapsed;

            // Make the Login Test UI visible
            loginTests.Visibility = Visibility.Visible;
        }

        private async void LoginButtonClicked(object sender, RoutedEventArgs e)
        {
            Button buttonClicked = sender as Button;
            if (buttonClicked != null)
            {
                String testName = null;
                MobileServiceAuthenticationProvider provider =
                    MobileServiceAuthenticationProvider.MicrosoftAccount;

                if (buttonClicked.Name.Contains("MicrosoftAccount"))
                {
                    provider = MobileServiceAuthenticationProvider.MicrosoftAccount;
                    testName = "Microsoft Account Login";
                }
                else if (buttonClicked.Name.Contains("Facebook"))
                {
                    provider = MobileServiceAuthenticationProvider.Facebook;
                    testName = "Facebook Login";
                }
                else if (buttonClicked.Name.Contains("Twitter"))
                {
                    provider = MobileServiceAuthenticationProvider.Twitter;
                    testName = "Twitter Login";
                }
                else if (buttonClicked.Name.Contains("Google"))
                {
                    provider = MobileServiceAuthenticationProvider.Google;
                    testName = "Google Login";
                }
                else if (buttonClicked.Name.Contains("AzureActiveDirectory"))
                {
                    provider = MobileServiceAuthenticationProvider.WindowsAzureActiveDirectory;
                    testName = "Azure Active Directory Login";
                }

                bool useProviderStringOverload = UseProviderStringOverloadCheckBox.IsChecked.Value;

                TestResultsTextBlock.Text = await LoginTests.ExecuteTest(testName, () => LoginTests.TestLoginAsync(provider, useProviderStringOverload));
            }
        }

        private void ExecuteUnitTests(object sender, RoutedEventArgs e)
        {
            // Get the test settings from the UI
            App.Harness.Settings.Custom["MobileServiceRuntimeUrl"] = txtRuntimeUri.Text;
            App.Harness.Settings.TagExpression = txtTags.Text;

            //ignore tests for WP75
            if (!string.IsNullOrEmpty(App.Harness.Settings.TagExpression))
            {
                App.Harness.Settings.TagExpression += " - notWP80";
            }
            else
            {
                App.Harness.Settings.TagExpression = "!notWP80";
            }

            // Hide Test Settings UI
            testSettings.Visibility = Visibility.Collapsed;

            // Display Status UI
            lblStatus.Visibility = Visibility.Visible;
            unitTests.Visibility = Visibility.Visible;
            unitTestResults.Visibility = Visibility.Visible;

            // Start a test run
            App.Harness.Reporter = this;
            Task.Factory.StartNew(() => App.Harness.RunAsync());
        }

        public void StartRun(TestHarness harness)
        {
            Dispatcher.BeginInvoke(() =>
            {
                ProgresStackPanel.Visibility = Visibility.Visible;
                lblCurrentTestNumber.Text = harness.Progress.ToString();
                lblTotalTestNumber.Text = harness.Count.ToString();
                lblFailureNumber.Tag = harness.Failures.ToString() ?? "0";
                progress.Value = 1;
            });
        }

        public void EndRun(TestHarness harness)
        {
            Dispatcher.BeginInvoke(() =>
            {
                if (harness.Failures > 0)
                {
                    lblResults.Text = string.Format(CultureInfo.InvariantCulture, "{0}/{1} tests failed!", harness.Failures, harness.Count);
                    lblResults.Foreground = new SolidColorBrush(Color.FromArgb(0xFF, 0xFF, 0x00, 0x6E));
                }
                else
                {
                    lblResults.Text = string.Format(CultureInfo.InvariantCulture, "{0} tests passed!", harness.Count);
                }
                ProgresStackPanel.Visibility = Visibility.Collapsed;
                lblResults.Visibility = Visibility.Visible;
                if (!harness.Settings.ManualMode)
                    Application.Current.Terminate();
            });
        }

        public void Progress(TestHarness harness)
        {
            Dispatcher.BeginInvoke(() =>
            {
                lblCurrentTestNumber.Text = harness.Progress.ToString();
                lblFailureNumber.Text = " " + (harness.Failures.ToString() ?? "0");
                double value = harness.Progress;
                int count = harness.Count;
                if (count > 0)
                {
                    value = value * 100.0 / (double)count;
                }
                progress.Value = value;
            });
        }

        public void StartGroup(TestGroup group)
        {
            Dispatcher.BeginInvoke(() =>
            {
                _currentGroup = new GroupDescription { Name = group.Name };
                _groups.Add(_currentGroup);
            });
        }

        public void EndGroup(TestGroup group)
        {
            Dispatcher.BeginInvoke(() =>
            {
                _currentGroup = null;
            });
        }

        public void StartTest(TestMethod test)
        {
            Dispatcher.BeginInvoke(() =>
            {
                TestDescription testDescription = new TestDescription { Name = test.Name };
                _currentTest = testDescription;
                _currentGroup.Add(_currentTest);

                Dispatcher.BeginInvoke(() =>
                {
                    unitTests.ScrollTo(testDescription);
                });
            });
        }

        public void EndTest(TestMethod method)
        {
            Dispatcher.BeginInvoke(() =>
            {
                if (method.Excluded)
                {
                    _currentTest.Color = Color.FromArgb(0xFF, 0x66, 0x66, 0x66);
                }
                else if (!method.Passed)
                {
                    _currentTest.Color = Color.FromArgb(0xFF, 0xFF, 0x00, 0x6E);
                }
                else
                {
                    _currentTest.Color = Color.FromArgb(0xFF, 0x2A, 0x9E, 0x39);
                }
                _currentTest = null;
            });
        }

        public void Log(string message)
        {
            //Dispatcher.BeginInvoke(() =>
            //{
            //    _currentTest.Details.Add(message);
            //});
        }

        public void Error(string errorDetails)
        {
            Dispatcher.BeginInvoke(() =>
            {
                _currentTest.Details.Add(errorDetails);
            });
        }

        public void Status(string status)
        {
            Dispatcher.BeginInvoke(() =>
            {
                lblStatus.Text = status;
            });
        }
    }
}